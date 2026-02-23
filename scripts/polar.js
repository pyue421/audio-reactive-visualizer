function renderModeTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
  const energy = constrain(map(level, 0, 0.4, 0, 1), 0, 1);
  const bass = bassRaw / 255;
  const mid = midRaw / 255;
  const treble = trebleRaw / 255;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const baseR = min(width, height) * (0.2 + bass * 0.13);
  const depth = min(width, height) * (0.1 + mid * 0.14);
  const spin = frameCount * (0.005 + treble * 0.015);

  noFill();
  for (let layer = 0; layer < 3; layer++) {
    stroke(29, 185, 84, 78 + layer * 45 + energy * 70);
    strokeWeight(1.4 + layer * 1.6);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const theta = map(i, 0, waveform.length - 1, 0, TWO_PI) + spin + layer * 0.04;
      const r = baseR + waveform[i] * depth + sin(theta * (3 + layer) + spin * 3) * (4 + treble * 16);
      vertex(cx + cos(theta) * r, cy + sin(theta) * r);
    }
    endShape(CLOSE);
  }

  stroke(29, 185, 84, 255);
  strokeWeight(2.1);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    const theta = map(i, 0, waveform.length - 1, 0, TWO_PI) + spin;
    const r = baseR + waveform[i] * depth;
    vertex(cx + cos(theta) * r, cy + sin(theta) * r);
  }
  endShape(CLOSE);

  drawScopeReadout(level, bass, mid, treble);
}

window.modeRenderers = window.modeRenderers || {};
window.modeRenderers.POLAR = renderModeTrace;
