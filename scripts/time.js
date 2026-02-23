function renderModeTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
  const energy = constrain(map(level, 0, 0.4, 0, 1), 0, 1);
  const bass = bassRaw / 255;
  const mid = midRaw / 255;
  const treble = trebleRaw / 255;

  const amplitudeScale = height * (0.18 + bass * 0.28 + mid * 0.12);
  const jitter = 0.5 + treble * 2.2;

  noFill();

  for (let layer = 0; layer < 3; layer++) {
    const alpha = 70 + layer * 40 + energy * 70;
    const weight = 1.4 + layer * 1.8;
    stroke(29, 185, 84, alpha);
    strokeWeight(weight);

    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const x = map(i, 0, waveform.length - 1, 14, width - 14);
      const yBase = height * 0.5 + waveform[i] * amplitudeScale;
      const phase = frameCount * 0.02 + i * 0.04;
      const y = yBase + sin(phase) * jitter * (layer - 1);
      vertex(x, y);
    }
    endShape();
  }

  stroke(29, 185, 84, 255);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    const x = map(i, 0, waveform.length - 1, 14, width - 14);
    const y = height * 0.5 + waveform[i] * amplitudeScale;
    vertex(x, y);
  }
  endShape();

  drawScopeReadout(level, bass, mid, treble);
}

window.modeRenderers = window.modeRenderers || {};
window.modeRenderers.TIME = renderModeTrace;
