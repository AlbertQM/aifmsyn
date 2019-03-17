// Initialise audio context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Audio sources for FM synthesis
let oscillator;
let modulator;

// Used by pitchDetection model
let mic;
let pitch;
let isListening = false;

// Used by poseNet model
let video;
let poseNet;
let noseX = 0;
let noseY = 0;

function setup() {
  // Show webcam feed inside canvas
  let canvas = createCanvas(640, 480);
  canvas.parent("canvasContainer");
  video = createCapture(VIDEO);
  video.size(width, height);
  // Hide actual video
  video.hide();

  poseNet = ml5.poseNet(video, () => {
    console.log("Posenet model loaded.");
  });

  poseNet.on("pose", poses => {
    if (poses.length > 0) {
      let nX = poses[0].pose.keypoints[0].position.x;
      let nY = poses[0].pose.keypoints[0].position.y;
      let eX = poses[0].pose.keypoints[1].position.x;
      let eY = poses[0].pose.keypoints[1].position.y;
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
  });

  $("#listen").on("mouseup", () => {
    isListening = false;
  });
}

function draw() {
  // Draw updated live feed on canvas
  image(video, 0, 0, width, height);
}

function startPitch() {
  pitch = ml5.pitchDetection("./model/", audioCtx, mic.stream, () => {
    console.log("Pitch model loaded.");
    // Click to create the oscillators
    document.getElementById("play").click();
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
      }
      // Recursively get pitch
      getPitch();
    });
  }
}

function changeOscillatorFrequency(newFrequency) {
  oscillator.frequency.value = newFrequency;
}

function changeModulatorFrequency(xCoord) {
  const newFrequency = map(xCoord, 0, 640, 1, 20);
  modulator.frequency.value = newFrequency;
  select("#modulatorFrequency").html(Math.floor(newFrequency));
}

function changeWaveType(yCoord) {
  const offset = height / 4;
  if (yCoord < offset) {
    modulator.type = "square";
    select("#modulatorWave").html("square");
  }
  if (yCoord > offset && yCoord < offset * 2) {
    modulator.type = "triangle";
    select("#modulatorWave").html("triangle");
  }
  if (yCoord > offset * 2 && yCoord < offset * 3) {
    modulator.type = "sawtooth";
    select("#modulatorWave").html("sawtooth");
  }
  if (yCoord > offset * 3 && yCoord < offset * 4) {
    modulator.type = "sine";
    select("#modulatorWave").html("sine");
  }
}

document.getElementById("play").addEventListener("click", () => {
  // Prevent the creation of additional oscillators each time a user presses play
  if (oscillator) {
    oscillator.stop();
  }

  select("#soundCheck").html("ON");

  // FM Synthesis with one modulator and one carrier
  oscillator = audioCtx.createOscillator();
  modulator = audioCtx.createOscillator();
  modulatorGain = audioCtx.createGain();

  oscillator.type = "sine";
  modulator.type = "triangle";

  modulatorGain.gain.value = 200;
  modulator.frequency.value = 1;

  modulator.connect(modulatorGain);
  modulatorGain.connect(oscillator.detune);
  oscillator.connect(audioCtx.destination);

  modulator.start();
  oscillator.start();
});

document.getElementById("stop").addEventListener("click", () => {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
    select("#soundCheck").html("OFF");
  }
});
