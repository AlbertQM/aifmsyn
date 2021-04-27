# Frequency Modulation Synthesis

**tl;dr: Hum or whistle, while moving your head around, to create new sounds.**

[Demo available here.](https://albertqm.github.io/aifmsyn/) (Sounds will start playing right away. Make sure you're on low volume).

NOTE: We need access to the webcam to track your nose, and to your microphone to detect the pitch.

## How it works

This project uses two different models from ML5.js and Web Audio API.

- poseNet model is used to detect the nose position via webcam live feed.
- Pitch detection model is used to detect the pitch of the sound via microphone.
- Web Audio is used to create a simple FM synthesis.

There are three oscillators: one acts as a carrier, one as a frequency modulator and third one as an amplitude modulator.

Play (FM only):

- The x coordinate of the nose is used to change the frequency of the modulator.
- The y coordinate of the nose is used to change the type of the wave of the modulator (triangle, sine, sawtooth or square).
- The pitch detection is used to change the frequency of the oscillator.

Play (AM and FM):
In addition to the above effects, this button plays the sound with amplitude modulation.

- The x coordinate of the nose is used to change the frequency of the amplitude modulator.
- The pitch is used to increase the modulator gain.
  And if the relative checkbox is checked
- The y coordinate of the nose is used to change the amplitude of the carrier.

Play (FM & Envelope):
Similar to FM only, but the sound is passed through an envelope.

```
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  *
* Sound Design                                                               *
* March 2019                                                                 *
* Queen Mary University of London                                            *
*                                                                            *
* @Authors Alberto Morabito                                                  *
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  *
```
