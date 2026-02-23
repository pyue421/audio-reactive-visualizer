# Audio-Reactive Visualizer (p5.js)

Real-time microphone visualizer built with p5.js and p5.sound.

## Features

- Live microphone input
- Amplitude-reactive center pulse
- Frequency spectrum bars + circular ring
- Minimal clean visual style

## Run

1. Start a static server in this folder:

```bash
python3 -m http.server 8080
```

2. Open `http://localhost:8080` in a browser.
3. Click **Start** and allow microphone access.

## Notes

- A secure context is required for microphone access in most browsers. `localhost` satisfies this.
- Headphones are recommended to avoid feedback.
