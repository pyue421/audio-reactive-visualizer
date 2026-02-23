function renderModeTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
  const energy = constrain(map(level, 0, 0.45, 0, 1), 0, 1);
  const bass = bassRaw / 255;
  const mid = midRaw / 255;
  const treble = trebleRaw / 255;
  const cx = width * 0.5;
  const cy = height * 0.5;

  const ratios = [
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 4],
    [3, 1],
    [5, 2],
  ];
  const ratioIdx = Math.floor(constrain(map(energy + treble * 0.5, 0, 1.5, 0, ratios.length - 1), 0, ratios.length - 1));
  const [fx, fy] = ratios[ratioIdx];
  const phase = frameCount * (0.003 + energy * 0.004) + bass * PI * 0.8;

  const sizeBoost = 0.42 + energy * 0.16;
  const scaleX = width * sizeBoost;
  const scaleY = height * (sizeBoost + mid * 0.08);
  const points = 720;

  noFill();
  for (let layer = 0; layer < 3; layer++) {
    stroke(29, 185, 84, 85 + layer * 48 + energy * 65);
    strokeWeight(1.4 + layer * 1.5);
    beginShape();
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * TWO_PI;
      const x = sin(fx * t + phase + layer * 0.03);
      const y = sin(fy * t + layer * 0.03);
      const micro = sin(t * (6 + layer) + phase * 0.7) * (0.002 + treble * 0.01);
      vertex(cx + x * scaleX * (0.5 + micro), cy + y * scaleY * (0.45 + micro));
    }
    endShape(CLOSE);
  }

  stroke(29, 185, 84, 255);
  strokeWeight(2.2);
  beginShape();
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * TWO_PI;
    const x = sin(fx * t + phase);
    const y = sin(fy * t);
    vertex(cx + x * scaleX * 0.5, cy + y * scaleY * 0.45);
  }
  endShape(CLOSE);

  drawScopeReadout(level, bass, mid, treble);
}

window.modeRenderers = window.modeRenderers || {};
window.modeRenderers.LISSAJOUS = renderModeTrace;
