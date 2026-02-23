# Audio-Reactive Visualizer (p5.js)

Real-time microphone visualizer built with p5.js and p5.sound.
<img width="1725" height="955" alt="image" src="https://github.com/user-attachments/assets/9da1fe88-ad0c-44d1-90f9-edcd3ef1db3e" />

## Features
Visualization Modes
- Time Domain - Live waveform rendering
- Lissajous – Oscilloscope-style stereo phase visualization
- Polar – Circular waveform mapping

Audio Analysis
- Live microphone input
- Amplitude-reactive center pulse
- Frequency spectrum bars
- Etc.

## Visual System
- Audio-reactive glow trails
- Diagnostic side panel with live metrics
- Minimal, high-contrast UI inspired by studio hardware

## Run

1. Start a static server in this folder:

```bash
python3 -m http.server 8080
```

2. Open `http://localhost:8080` in a browser.
3. Click **Start** and allow microphone access.

## Notes

- Need to enable browser microphone 
