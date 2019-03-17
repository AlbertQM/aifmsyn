# Frequency Modulation Synthesis

```
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  *
* Sound Design                                                               *
* March 2019                                                                 *
* Queen Mary University of London                                            *
*                                                                            *
* @Authors Alberto Morabito                                                  *
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  *
```

## The concept

This project uses two different models from ML5.js and Web Audio API.

- poseNet model is used to detect the nose position via webcam live feed.
- Pitch detection model is used to detect the pitch of the sound via microphone.
- Web Audio is used to create a simple FM synthesis.

**How it works**

There are two oscillators. One is used to modulate the frequency of the other.
- The x coordinate of the nose is used to change the frequency of the modulator.
- The y coordinate of the nose is used to change the type of the wave of the modulator (triangle, sine, sawtooth or square).
- The pitch detection is used to change the frequency of the oscillator.


## How to

Allow your webcam and microphone to be used.
By default, sound is on. You can stop/start it at any time using the buttons.
To start listening to your microphone and webcam, hold down the "Listen" button and either hum or whistle, while moving your head around, to create new sounds.
