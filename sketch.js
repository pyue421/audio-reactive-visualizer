let mic;
let fft;
let amp;
let running = false;

const smoothing = 0.9;
const bins = 256;

let hud = {};
let detectionState = {};
let currentMode = "TIME";

const startButton = () => document.getElementById("startButton");
const statusText = () => document.getElementById("status");
const canvasHost = () => document.getElementById("canvasHost");
const modeButtons = () => [...document.querySelectorAll(".mode-btn")];

function setup() {
  const host = canvasHost();
  const cnv = createCanvas(host.clientWidth, host.clientHeight);
  cnv.parent(host);
  textFont("monospace");

  mic = new p5.AudioIn();
  fft = new p5.FFT(smoothing, bins);
  amp = new p5.Amplitude();

  initializeHud();
  initializeModeToggles();
  resetDetectors();

  startButton().addEventListener("click", initializeAudio);
}

async function initializeAudio() {
  if (running) return;

  try {
    await userStartAudio();
    mic.start(
      () => {
        fft.setInput(mic);
        amp.setInput(mic);
        resetDetectors();
        running = true;
        startButton().disabled = true;
        statusText().textContent = "Listening to microphone input...";
      },
      () => {
        statusText().textContent = "Microphone permission denied.";
      }
    );
  } catch {
    statusText().textContent = "Unable to start audio context.";
  }
}

function draw() {
  const level = running ? amp.getLevel() : 0;
  const spectrum = running ? fft.analyze() : new Array(bins).fill(0);
  const waveform = running ? fft.waveform(512) : new Array(512).fill(0);
  const bass = running ? fft.getEnergy("bass") : 0;
  const mid = running ? fft.getEnergy("mid") : 0;
  const treble = running ? fft.getEnergy("treble") : 0;

  drawOscilloscopeBackground();
  drawOscilloscopeTrace(waveform, level, bass, mid, treble);
  drawHud(level, bass, mid, treble, waveform, spectrum);

  if (!running) {
    drawIdleMessage();
  }
}

function drawOscilloscopeBackground() {
  background(7, 20, 24);

  const majorX = width / 10;
  const majorY = height / 8;

  strokeWeight(1);

  for (let x = 0; x <= width; x += majorX / 2) {
    const major = Math.abs((x / majorX) - Math.round(x / majorX)) < 0.01;
    stroke(major ? color(35, 105, 106, 165) : color(28, 72, 75, 85));
    line(x, 0, x, height);
  }

  for (let y = 0; y <= height; y += majorY / 2) {
    const major = Math.abs((y / majorY) - Math.round(y / majorY)) < 0.01;
    stroke(major ? color(35, 105, 106, 165) : color(28, 72, 75, 85));
    line(0, y, width, y);
  }

  stroke(70, 190, 180, 185);
  strokeWeight(1.2);
  line(width * 0.5, 0, width * 0.5, height);
  line(0, height * 0.5, width, height * 0.5);

  noFill();
  stroke(42, 140, 136, 120);
  strokeWeight(2);
  rect(6, 6, width - 12, height - 12, 4);
}

function drawOscilloscopeTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
  if (currentMode === "LISSAJOUS") {
    drawLissajousTrace(waveform, level, bassRaw, midRaw, trebleRaw);
    return;
  }
  if (currentMode === "POLAR") {
    drawPolarTrace(waveform, level, bassRaw, midRaw, trebleRaw);
    return;
  }
  drawTimeTrace(waveform, level, bassRaw, midRaw, trebleRaw);
}

function drawTimeTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
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
    stroke(70, 255, 212, alpha);
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

  stroke(160, 255, 235, 255);
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

function drawLissajousTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
  const energy = constrain(map(level, 0, 0.4, 0, 1), 0, 1);
  const bass = bassRaw / 255;
  const mid = midRaw / 255;
  const treble = trebleRaw / 255;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const scaleX = width * (0.16 + bass * 0.18);
  const scaleY = height * (0.17 + mid * 0.22);
  const shift = Math.floor(map(treble, 0, 1, 30, waveform.length * 0.45));

  noFill();
  for (let layer = 0; layer < 3; layer++) {
    stroke(70, 255, 212, 80 + layer * 45 + energy * 70);
    strokeWeight(1.5 + layer * 1.7);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const xVal = waveform[i];
      const yVal = waveform[(i + shift + layer * 7) % waveform.length];
      const wobble = sin(frameCount * 0.015 + i * 0.03) * (0.2 + treble * 0.85) * layer;
      vertex(cx + xVal * scaleX + wobble, cy + yVal * scaleY - wobble);
    }
    endShape(CLOSE);
  }

  stroke(160, 255, 235, 255);
  strokeWeight(2.1);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    const xVal = waveform[i];
    const yVal = waveform[(i + shift) % waveform.length];
    vertex(cx + xVal * scaleX, cy + yVal * scaleY);
  }
  endShape(CLOSE);

  drawScopeReadout(level, bass, mid, treble);
}

function drawPolarTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
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
    stroke(70, 255, 212, 78 + layer * 45 + energy * 70);
    strokeWeight(1.4 + layer * 1.6);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const theta = map(i, 0, waveform.length - 1, 0, TWO_PI) + spin + layer * 0.04;
      const r = baseR + waveform[i] * depth + sin(theta * (3 + layer) + spin * 3) * (4 + treble * 16);
      vertex(cx + cos(theta) * r, cy + sin(theta) * r);
    }
    endShape(CLOSE);
  }

  stroke(160, 255, 235, 255);
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

function drawScopeReadout(level, bass, mid, treble) {
  noStroke();
  fill(86, 255, 216, 190);
  textAlign(LEFT, BOTTOM);
  textSize(14);
  text(`${currentMode}  CH1 ${(level * 100).toFixed(2)} mV`, 18, height - 16);

  textAlign(RIGHT, BOTTOM);
  text(`L ${bass.toFixed(2)}  M ${mid.toFixed(2)}  H ${treble.toFixed(2)}`, width - 18, height - 16);
}

function initializeModeToggles() {
  const buttons = modeButtons();
  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      currentMode = btn.dataset.mode || "TIME";
      for (const other of buttons) {
        other.classList.toggle("active", other === btn);
      }
    });
  }
}

function initializeHud() {
  hud = {
    meterRms: document.getElementById("meterRms"),
    meterLow: document.getElementById("meterLow"),
    meterMid: document.getElementById("meterMid"),
    meterHigh: document.getElementById("meterHigh"),
    waveCanvas: document.getElementById("waveCanvas"),
    spectrumCanvas: document.getElementById("spectrumCanvas"),
    beatPulseDot: document.getElementById("beatPulseDot"),
    onsetLine: document.getElementById("onsetLine"),
    bpmLine: document.getElementById("bpmLine"),
    peakLine: document.getElementById("peakLine"),
    dominantLine: document.getElementById("dominantLine"),
    centroidLine: document.getElementById("centroidLine"),
    rolloffLine: document.getElementById("rolloffLine"),
    fluxLine: document.getElementById("fluxLine"),
    bandsLine: document.getElementById("bandsLine"),
  };
}

function resetDetectors() {
  detectionState = {
    prevSpectrum: null,
    fluxHistory: [],
    onsetTimes: [],
    beatIntervals: [],
    lastOnsetMs: -Infinity,
    beatPulseStrength: 0,
  };
}

function drawHud(level, bassRaw, midRaw, trebleRaw, waveform, spectrum) {
  updateAmplitudePanel(level, bassRaw, midRaw, trebleRaw);
  updateWaveformPanel(waveform);
  updateSpectrumPanel(spectrum);
  updateDetectionsPanel(level, bassRaw, midRaw, trebleRaw, spectrum);
}

function updateAmplitudePanel(level, bassRaw, midRaw, trebleRaw) {
  setMeter(hud.meterRms, constrain(map(level, 0, 0.45, 0, 1), 0, 1));
  setMeter(hud.meterLow, bassRaw / 255);
  setMeter(hud.meterMid, midRaw / 255);
  setMeter(hud.meterHigh, trebleRaw / 255);
}

function updateWaveformPanel(waveform) {
  drawWaveformCanvas(hud.waveCanvas, waveform);
}

function updateSpectrumPanel(spectrum) {
  drawSpectrumCanvas(hud.spectrumCanvas, spectrum);
}

function updateDetectionsPanel(level, bassRaw, midRaw, trebleRaw, spectrum) {
  updateDetectionText(level, bassRaw, midRaw, trebleRaw, spectrum);
}

function setMeter(meterEl, value) {
  if (!meterEl) return;
  meterEl.style.width = `${(constrain(value, 0, 1) * 100).toFixed(1)}%`;
}

function setupCanvas2D(canvas) {
  if (!canvas) return null;
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const needResize = canvas.width !== Math.floor(w * ratio) || canvas.height !== Math.floor(h * ratio);
  if (needResize) {
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w, h };
}

function drawWaveformCanvas(canvas, waveform) {
  const setup = setupCanvas2D(canvas);
  if (!setup) return;
  const { ctx, w, h } = setup;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(29, 185, 84, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  ctx.strokeStyle = "#1ed760";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < waveform.length; i++) {
    const x = (i / (waveform.length - 1)) * w;
    const y = map(waveform[i], -1, 1, h * 0.9, h * 0.1);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSpectrumCanvas(canvas, spectrum) {
  const setup = setupCanvas2D(canvas);
  if (!setup) return;
  const { ctx, w, h } = setup;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  const step = Math.max(1, Math.floor(spectrum.length / 90));
  const barW = w / (spectrum.length / step);
  let x = 0;

  for (let i = 0; i < spectrum.length; i += step) {
    const power = spectrum[i] / 255;
    const barH = power * (h - 10);
    ctx.fillStyle = "rgba(30, 215, 96, 0.86)";
    ctx.fillRect(x, h - barH, Math.max(1, barW - 1), barH);
    x += barW;
  }

  ctx.strokeStyle = "rgba(29, 185, 84, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function updateDetectionText(level, bassRaw, midRaw, trebleRaw, spectrum) {
  if (!hud.peakLine) return;

  const nyquist = sampleRate() * 0.5;
  const features = analyzeSpectrumFeatures(spectrum, nyquist);
  const onset = detectOnset(features.flux);
  const bpm = estimateBpm();

  const top = [...spectrum]
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((entry) => `${Math.round((entry.i / spectrum.length) * nyquist)}Hz`);

  hud.peakLine.textContent = `Peak: ${Math.round(features.peakHz)} Hz`;
  hud.dominantLine.textContent = `Dominant: ${top.join(", ") || "--"}`;
  hud.centroidLine.textContent = `Centroid: ${Math.round(features.centroidHz)} Hz`;
  hud.rolloffLine.textContent = `Rolloff (85%): ${Math.round(features.rolloffHz)} Hz`;
  hud.fluxLine.textContent = `Flux: ${features.flux.toFixed(2)}`;
  hud.onsetLine.textContent = `Onset: ${onset ? "Detected" : "No hit"}`;
  hud.bpmLine.textContent = `BPM: ${bpm ? bpm.toFixed(1) : "--"}`;
  hud.bandsLine.textContent = `Bands: L ${(bassRaw / 255).toFixed(2)} M ${(midRaw / 255).toFixed(2)} H ${(
    trebleRaw / 255
  ).toFixed(2)} RMS ${level.toFixed(3)}`;

  detectionState.beatPulseStrength = max(0, detectionState.beatPulseStrength * 0.86 - 0.02);
  updateBeatDot(detectionState.beatPulseStrength);
}

function analyzeSpectrumFeatures(spectrum, nyquist) {
  let peakIdx = 0;
  let peakVal = -1;
  let weightedSum = 0;
  let totalEnergy = 0;
  let flux = 0;
  let cumulative = 0;
  let rolloffIdx = spectrum.length - 1;

  for (let i = 0; i < spectrum.length; i++) {
    const val = spectrum[i];
    if (val > peakVal) {
      peakVal = val;
      peakIdx = i;
    }
    weightedSum += i * val;
    totalEnergy += val;
    if (detectionState.prevSpectrum) {
      const diff = val - detectionState.prevSpectrum[i];
      if (diff > 0) flux += diff;
    }
  }

  const threshold = totalEnergy * 0.85;
  for (let i = 0; i < spectrum.length; i++) {
    cumulative += spectrum[i];
    if (cumulative >= threshold) {
      rolloffIdx = i;
      break;
    }
  }

  detectionState.prevSpectrum = spectrum.slice();

  return {
    peakHz: (peakIdx / spectrum.length) * nyquist,
    centroidHz: totalEnergy > 0 ? (weightedSum / totalEnergy / spectrum.length) * nyquist : 0,
    rolloffHz: (rolloffIdx / spectrum.length) * nyquist,
    flux: flux / 255,
  };
}

function detectOnset(flux) {
  const now = millis();
  detectionState.fluxHistory.push(flux);
  if (detectionState.fluxHistory.length > 40) {
    detectionState.fluxHistory.shift();
  }

  const mean =
    detectionState.fluxHistory.reduce((sum, value) => sum + value, 0) / Math.max(1, detectionState.fluxHistory.length);
  const variance =
    detectionState.fluxHistory.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, detectionState.fluxHistory.length);
  const sigma = Math.sqrt(variance);
  const adaptiveThreshold = mean + sigma * 1.35 + 0.25;
  const refractoryMs = 170;
  const onset = flux > adaptiveThreshold && now - detectionState.lastOnsetMs > refractoryMs;

  if (onset) {
    detectionState.lastOnsetMs = now;
    detectionState.onsetTimes.push(now);
    if (detectionState.onsetTimes.length > 12) detectionState.onsetTimes.shift();

    if (detectionState.onsetTimes.length > 1) {
      const n = detectionState.onsetTimes.length;
      const interval = detectionState.onsetTimes[n - 1] - detectionState.onsetTimes[n - 2];
      if (interval > 260 && interval < 1500) {
        detectionState.beatIntervals.push(interval);
        if (detectionState.beatIntervals.length > 10) detectionState.beatIntervals.shift();
      }
    }

    detectionState.beatPulseStrength = 1;
  }

  return onset;
}

function estimateBpm() {
  if (!detectionState.beatIntervals.length) return null;
  const avgInterval =
    detectionState.beatIntervals.reduce((sum, value) => sum + value, 0) / detectionState.beatIntervals.length;
  return 60000 / avgInterval;
}

function updateBeatDot(strength) {
  if (!hud.beatPulseDot) return;
  const s = constrain(strength, 0, 1);
  const scale = 1 + s * 0.95;
  const alpha = 0.22 + s * 0.78;
  const blur = 2 + s * 18;
  hud.beatPulseDot.style.transform = `scale(${scale.toFixed(2)})`;
  hud.beatPulseDot.style.background = `rgba(30, 215, 96, ${alpha.toFixed(3)})`;
  hud.beatPulseDot.style.boxShadow = `0 0 ${blur.toFixed(1)}px rgba(30, 215, 96, ${alpha.toFixed(3)})`;
}

function drawIdleMessage() {
  fill(0, 0, 0, 180);
  noStroke();
  rect(18, height - 72, 244, 46, 8);
  fill(86, 255, 216, 240);
  textAlign(LEFT, CENTER);
  textSize(14);
  text("Press Enable Audio to Start", 30, height - 49);
}

function windowResized() {
  const host = canvasHost();
  resizeCanvas(host.clientWidth, host.clientHeight);
}
