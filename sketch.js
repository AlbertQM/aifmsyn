// Initialise audio context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Audio sources for FM synthesis
let oscillator;
let oscillatorGain;
let modulator;
let modulatorGain;
let amplitudeModulator;
let biquadFilter;

let attackTime;
let releaseTime;
let noteLength;

// Used by pitchDetection model
let mic;
let pitch;
let isListening = false;

// Used by poseNet model
let video;
let poseNet;
let noseX = 0;
let noseY = 0;
let videoWidth = 300;
let videoHeight = 200;

function setup() {
  // Show webcam feed inside canvas
  let canvas = createCanvas(videoWidth, videoHeight);
  canvas.parent("canvasContainer");
  video = createCapture(VIDEO);
  video.size(videoWidth, videoHeight);
  // Hide actual video
  video.hide();

  poseNet = ml5.poseNet(video, () => {
    console.log("Posenet model loaded.");
  });

  poseNet.on("pose", poses => {
    if (poses.length > 0) {
      let nX = poses[0].pose.keypoints[0].position.x;
      let nY = poses[0].pose.keypoints[0].position.y;
      // Linear interpolation
      noseX = lerp(noseX, nX, 0.5);
      noseY = lerp(noseY, nY, 0.5);
    }
  });

  // Initialise microphone as input source and start detecting pitch
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);

  $("#listen").on("mousedown", () => {
    isListening = true;
    getPitch();
    if ($("#soundCheck").html() !== "OFF")
      select("#soundCheck").html("Listening");
  });

  $("#listen").on("mouseup", () => {
    isListening = false;
    if ($("#soundCheck").html() !== "OFF") select("#soundCheck").html("ON");
  });

  createFilter();
}

function draw() {
  // Draw updated live feed on canvas
  image(video, 0, 0, videoWidth, videoHeight);
}

function startPitch() {
  pitch = ml5.pitchDetection("./model/", audioCtx, mic.stream, () => {
    console.log("Pitch model loaded.");
    // Click to create the oscillators
    document.getElementById("playComplex").click();
    getPitch();
  });
}

function getPitch() {
  if (isListening) {
    pitch.getPitch((err, frequency) => {
      if (frequency && oscillator) {
        select("#result").html(Math.floor(frequency));
        changeOscillatorFrequency(frequency);
        changeModulatorFrequency(noseX);
        changeWaveType(noseY);
        // Normalise to values up to 30
        changeAmplitudeModulatorFrequency((noseX / videoWidth) * 30);
        changeOscillatorGain(noseY);
      }
      // Recursively get pitch
      getPitch();
    });
  }
}

function changeAmplitudeModulatorFrequency(newFrequency) {
  amplitudeModulator.frequency.value = newFrequency;
}

function changeOscillatorGain(newGain) {
  oscillatorGain.gain.value = $("#oscillatorGainOn")[0].checked ? newGain : 1;
}

function changeOscillatorFrequency(newFrequency) {
  oscillator.frequency.value = newFrequency;
}

function changeModulatorFrequency(xCoord) {
  const minFrequency = $("#minFrequency")[0].value;
  const maxFrequency = $("#maxFrequency")[0].value;
  const newFrequency = map(xCoord, 0, videoWidth, minFrequency, maxFrequency);
  modulator.frequency.value = newFrequency;
  select("#modulatorFrequency").html(nf(Math.abs(newFrequency), 0, 2));
}

function changeWaveType(yCoord) {
  const offset = videoHeight / 4;
  if (yCoord < offset) {
    modulator.type = "square";
    select("#modulatorWave").html("Square");
  }
  if (yCoord > offset && yCoord < offset * 2) {
    modulator.type = "triangle";
    select("#modulatorWave").html("Triangle");
  }
  if (yCoord > offset * 2 && yCoord < offset * 3) {
    modulator.type = "sawtooth";
    select("#modulatorWave").html("Sawtooth");
  }
  if (yCoord > offset * 3 && yCoord < offset * 4) {
    modulator.type = "sine";
    select("#modulatorWave").html("Sine");
  }
}

function getOscillatorsData() {
  // Re-use parameters rather than start from default every time a user presses
  // stop and play
  const oscillatorWave = select("#oscillatorWave").value();
  const modulatorWave = select("#modulatorWave")
    .html()
    .toLowerCase();
  const amplitudeModulatorWave = select("#amplitudeModulatorWave").value();
  const modulatorFrequency = select("#modulatorFrequency").html();
  const result = select("#result").html();
  const noteLength = select("#noteLength").value();
  const attackTime = select("#attack").value();
  const releaseTime = select("#release").value();

  return {
    oscillatorWave: oscillatorWave,
    modulatorWave: modulatorWave,
    amplitudeModulatorWave: amplitudeModulatorWave,
    modulatorFrequency: modulatorFrequency,
    result: result,
    attackTime: attackTime,
    releaseTime: releaseTime,
    noteLength: noteLength
  };
}

function getFilterValues() {
  const filterFrequency = $("#filterFrequency").val();
  const filterQ = $("#filterQ").val();
  const filterGain = $("#filterGain").val();
  const filterDetune = $("#filterDetune").val();
  const filterType = $("#filterType").val();

  return {
    filterFrequency: filterFrequency,
    filterQ: filterQ,
    filterGain: filterGain,
    filterDetune: filterDetune,
    filterType: filterType
  };
}

function createFilter() {
  const data = getFilterValues();
  biquadFilter = audioCtx.createBiquadFilter();
  biquadFilter.frequency = data.filterFrequency;
  biquadFilter.detune = data.filterDetune;
  biquadFilter.Q = data.filterQ;
  biquadFilter.gain = data.filterGain;
  biquadFilter.type = data.filterType;
}

document.getElementById("playEnvelope").addEventListener("click", () => {
  // Prevent the creation of additional oscillators each time a user presses play
  if (oscillator) {
    oscillator.stop();
  }

  select("#soundCheck").html("ON");

  // Create the oscillators and update values based on current data
  const data = getOscillatorsData();
  oscillator = audioCtx.createOscillator();
  modulator = audioCtx.createOscillator();
  modulatorGain = audioCtx.createGain();
  oscillator.type = data.oscillatorWave;
  oscillator.frequency.value = data.result;
  modulator.type = data.modulatorWave;
  modulatorGain.gain.value = 200;
  modulator.frequency.value = data.modulatorFrequency;
  noteLength = Number(data.noteLength);
  attackTime = Number(data.attackTime);
  releaseTime = Number(data.releaseTime);

  // Create a linear envelope based on the users settings
  let envelope = audioCtx.createGain();
  envelope.gain.cancelScheduledValues(audioCtx.currentTime);
  envelope.gain.setValueAtTime(0, audioCtx.currentTime);
  envelope.gain.linearRampToValueAtTime(1, audioCtx.currentTime + attackTime);
  envelope.gain.linearRampToValueAtTime(
    0,
    audioCtx.currentTime + noteLength + releaseTime
  );

  modulator.connect(modulatorGain);
  modulatorGain.connect(oscillator.detune);
  if ($("#filterOn")[0].checked) {
    oscillator.connect(biquadFilter);
    biquadFilter.connect(audioCtx.destination);
  } else {
    oscillator.connect(envelope);
    envelope.connect(audioCtx.destination);
  }

  oscillator.start();
  modulator.start();
  oscillator.stop(audioCtx.currentTime + noteLength + releaseTime);
  modulator.stop(audioCtx.currentTime + noteLength + releaseTime);
});

document.getElementById("oscillatorWave").addEventListener("change", e => {
  if (oscillator) {
    oscillator.type = e.target.value;
  }
});

document
  .getElementById("amplitudeModulatorWave")
  .addEventListener("change", e => {
    if (amplitudeModulatorWave) {
      amplitudeModulatorWave.type = e.target.value;
    }
  });

document.getElementById("playSimple").addEventListener("click", () => {
  // Prevent the creation of additional oscillators each time a user presses play
  if (oscillator) {
    oscillator.stop();
  }
  select("#soundCheck").html("ON (FM)");

  const data = getOscillatorsData();
  // FM Synthesis with one modulator and one carrier
  oscillator = audioCtx.createOscillator();
  modulator = audioCtx.createOscillator();
  modulatorGain = audioCtx.createGain();

  oscillator.type = data.oscillatorWave;
  oscillator.frequency.value = data.result;
  modulator.type = data.modulatorWave;

  modulatorGain.gain.value = 200;
  modulator.frequency.value = data.modulatorFrequency;

  modulator.connect(modulatorGain);
  modulatorGain.connect(oscillator.detune);
  if ($("#filterOn")[0].checked) {
    oscillator.connect(biquadFilter);
    biquadFilter.connect(audioCtx.destination);
  } else {
    oscillator.connect(audioCtx.destination);
  }

  modulator.start();
  oscillator.start();
});

document.getElementById("playComplex").addEventListener("click", () => {
  // Prevent the creation of additional oscillators each time a user presses play
  if (oscillator) {
    oscillator.stop();
  }
  select("#soundCheck").html("ON (AM & FM)");

  const data = getOscillatorsData();
  // FM Synthesis with one modulator and one carrier
  oscillator = audioCtx.createOscillator();
  modulator = audioCtx.createOscillator();
  amplitudeModulator = audioCtx.createOscillator();
  modulatorGain = audioCtx.createGain();
  oscillatorGain = audioCtx.createGain();

  oscillator.type = data.oscillatorWave;
  oscillator.frequency.value = data.result;
  modulator.type = data.modulatorWave;
  amplitudeModulatorWave.type = data.amplitudeModulatorWave;

  // The higher the result frequency, the higher the modulator gain,
  // resulting in more complex sounds
  modulatorGain.gain.value = 2 * data.result;
  modulator.frequency.value = data.modulatorFrequency;

  amplitudeModulator.frequency.value = 1;
  oscillatorGain.gain.value = 1;

  modulator.connect(modulatorGain);
  modulatorGain.connect(oscillator.detune);
  if ($("#filterOn")[0].checked) {
    oscillator.connect(biquadFilter);
    biquadFilter.connect(oscillatorGain);
  } else {
    oscillator.connect(oscillatorGain);
  }
  amplitudeModulator.connect(oscillatorGain.gain);
  oscillatorGain.connect(audioCtx.destination);

  modulator.start();
  oscillator.start();
  amplitudeModulator.start();
});

document.getElementById("stop").addEventListener("click", () => {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
    select("#soundCheck").html("OFF");
  }
});

document.getElementById("attack").addEventListener("input", e => {
  attackTime = Number(e.target.value);
});

document.getElementById("release").addEventListener("input", e => {
  releaseTime = Number(e.target.value);
});

document.getElementById("noteLength").addEventListener("input", e => {
  noteLength = Number(e.target.value);
});

document.getElementById("filterQ").addEventListener("change", e => {
  biquadFilter.Q = Number(e.target.value);
});

document.getElementById("filterFrequency").addEventListener("change", e => {
  biquadFilter.frequency = Number(e.target.value);
});

document.getElementById("filterDetune").addEventListener("change", e => {
  biquadFilter.filterDetune = Number(e.target.value);
});

document.getElementById("filterGain").addEventListener("change", e => {
  biquadFilter.gain = Number(e.target.value);
});

document.getElementById("filterType").addEventListener("change", e => {
  biquadFilter.type = e.target.value;
});

document.getElementById("filterOn").addEventListener("change", e => {
  switch ($("#soundCheck").html()) {
    case "ON":
      $("#playSimple").click();
      console.log("1");
      break;
    case "ON (FM)":
      $("#playSimple").click();
      console.log("2");

      break;
    case "ON (AM &amp; FM)":
      $("#playComplex").click();
      console.log("3");

      break;
    default:
      break;
  }
});
