let fft;
let amp;
let mic = null;
let micReady = false;
let running = false;

const smoothing = 0.9;
const bins = 256;

let hud = {};
let detectionState = {};
let currentMode = "TIME";

const statusText = () => document.getElementById("status");
const playerStatusText = () => document.getElementById("playerStatus");
const canvasHost = () => document.getElementById("canvasHost");

function setup() {
  const host = canvasHost();
  const cnv = createCanvas(host.clientWidth, host.clientHeight);
  cnv.parent(host);
  textFont("monospace");

  fft = new p5.FFT(smoothing, bins);
  amp = new p5.Amplitude();

  initializeHud();
  initializeModeFromPage();
  initializeModeControls();
  resetDetectors();

  enableMicrophone();
  window.addEventListener(
    "pointerdown",
    () => {
      if (!micReady) enableMicrophone();
    },
    { once: true }
  );
}

function initializeModeFromPage() {
  const mode = (document.body?.dataset?.mode || "TIME").toUpperCase();
  if (mode === "TIME" || mode === "LISSAJOUS" || mode === "POLAR") {
    currentMode = mode;
  }
  syncModeButtons();
}

function initializeModeControls() {
  const buttons = document.querySelectorAll(".mode-btn[data-mode]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = (button.dataset.mode || "").toUpperCase();
      setMode(mode);
    });
  });
}

function setMode(mode) {
  if (mode !== "TIME" && mode !== "LISSAJOUS" && mode !== "POLAR") return;
  currentMode = mode;
  if (document.body) {
    document.body.dataset.mode = mode;
  }
  syncModeButtons();
}

function syncModeButtons() {
  const buttons = document.querySelectorAll(".mode-btn[data-mode]");
  buttons.forEach((button) => {
    const mode = (button.dataset.mode || "").toUpperCase();
    button.classList.toggle("active", mode === currentMode);
  });
}

async function enableMicrophone() {
  if (!mic) {
    mic = new p5.AudioIn();
  }

  if (micReady) {
    playerStatusText().textContent = "";
    return true;
  }

  try {
    await userStartAudio();
    await new Promise((resolve, reject) => {
      mic.start(
        () => {
          micReady = true;
          resolve();
        },
        () => reject(new Error("Microphone permission denied"))
      );
    });

    fft.setInput(mic);
    amp.setInput(mic);
    return true;
  } catch {
    playerStatusText().textContent = "";
    return false;
  }
}

function draw() {
  running = micReady;

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
  background(0, 0, 0);

  const majorX = width / 10;
  const majorY = height / 5;

  strokeWeight(1);

  for (let x = 0; x <= width; x += majorX / 2) {
    const major = Math.abs(x / majorX - Math.round(x / majorX)) < 0.01;
    stroke(major ? color(255, 255, 255, 120) : color(255, 255, 255, 46));
    line(x, 0, x, height);
  }

  for (let y = 0; y <= height; y += majorY / 2) {
    const major = Math.abs(y / majorY - Math.round(y / majorY)) < 0.01;
    stroke(major ? color(255, 255, 255, 120) : color(255, 255, 255, 46));
    line(0, y, width, y);
  }

  stroke(255, 255, 255, 205);
  strokeWeight(1.2);
  line(width * 0.5, 0, width * 0.5, height);
  line(0, height * 0.5, width, height * 0.5);

  noFill();
  stroke(255, 255, 255, 110);
  strokeWeight(2);
  rect(6, 6, width - 12, height - 12, 4);
}

function drawOscilloscopeTrace(waveform, level, bassRaw, midRaw, trebleRaw) {
  const renderer = window.modeRenderers?.[currentMode];
  if (typeof renderer === "function") renderer(waveform, level, bassRaw, midRaw, trebleRaw);
}

function drawScopeReadout(level, bass, mid, treble) {
  noStroke();
  fill(29, 185, 84, 190);
  textAlign(LEFT, BOTTOM);
  textSize(14);
  text(`${currentMode} CH1 ${(level * 100).toFixed(2)} mV`, 18, height - 16);

  textAlign(RIGHT, BOTTOM);
  text(`L ${bass.toFixed(2)}  M ${mid.toFixed(2)}  H ${treble.toFixed(2)}`, width - 18, height - 16);
}

function initializeHud() {
  hud = {
    meterRms: document.getElementById("meterRms"),
    meterLow: document.getElementById("meterLow"),
    meterMid: document.getElementById("meterMid"),
    meterHigh: document.getElementById("meterHigh"),
    waveCanvas: document.getElementById("waveCanvas"),
    spectrumCanvas: document.getElementById("spectrumCanvas"),
    fluxCanvas: document.getElementById("fluxCanvas"),
    bandsCanvas: document.getElementById("bandsCanvas"),
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
    fluxTrend: [],
  };
}

function drawHud(level, bassRaw, midRaw, trebleRaw, waveform, spectrum) {
  setMeter(hud.meterRms, constrain(map(level, 0, 0.45, 0, 1), 0, 1));
  setMeter(hud.meterLow, bassRaw / 255);
  setMeter(hud.meterMid, midRaw / 255);
  setMeter(hud.meterHigh, trebleRaw / 255);

  drawWaveformCanvas(hud.waveCanvas, waveform);
  drawSpectrumCanvas(hud.spectrumCanvas, spectrum);
  const featureState = updateDetectionText(level, bassRaw, midRaw, trebleRaw, spectrum);
  drawFluxCanvas(hud.fluxCanvas, featureState?.flux ?? 0);
  drawBandsCanvas(hud.bandsCanvas, bassRaw / 255, midRaw / 255, trebleRaw / 255);
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
  if (canvas.width !== Math.floor(w * ratio) || canvas.height !== Math.floor(h * ratio)) {
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

function drawFluxCanvas(canvas, flux) {
  const setup = setupCanvas2D(canvas);
  if (!setup) return;
  const { ctx, w, h } = setup;

  detectionState.fluxTrend.push(flux);
  if (detectionState.fluxTrend.length > 90) {
    detectionState.fluxTrend.shift();
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(29, 185, 84, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.lineTo(w, h * 0.78);
  ctx.stroke();

  ctx.strokeStyle = "rgba(30, 215, 96, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < detectionState.fluxTrend.length; i++) {
    const x = (i / Math.max(1, detectionState.fluxTrend.length - 1)) * w;
    const y = h - map(detectionState.fluxTrend[i], 0, 2.6, h * 0.08, h * 0.88);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(29, 185, 84, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function drawBandsCanvas(canvas, low, mid, high) {
  const setup = setupCanvas2D(canvas);
  if (!setup) return;
  const { ctx, w, h } = setup;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  const labels = ["LOW", "MID", "HIGH"];
  const values = [low, mid, high];
  const gap = 12;
  const leftPad = 36;
  const barW = (w - leftPad - gap * 4) / 3;
  const maxH = h - 24;

  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(30, 215, 96, 0.9)";
  ctx.textAlign = "center";

  for (let i = 0; i < 3; i++) {
    const x = leftPad + gap + i * (barW + gap);
    const barH = maxH * constrain(values[i], 0, 1);
    ctx.fillStyle = "rgba(30, 215, 96, 0.86)";
    ctx.fillRect(x, h - 14 - barH, barW, barH);
    ctx.fillStyle = "rgba(30, 215, 96, 0.9)";
    ctx.fillText(labels[i], x + barW * 0.5, h - 2);
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
  return features;
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
    detectionState.fluxHistory.reduce((sum, value) => sum + value, 0) / max(1, detectionState.fluxHistory.length);
  const variance =
    detectionState.fluxHistory.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    max(1, detectionState.fluxHistory.length);
  const sigma = sqrt(variance);
  const adaptiveThreshold = mean + sigma * 1.35 + 0.25;
  const onset = flux > adaptiveThreshold && now - detectionState.lastOnsetMs > 170;

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
  const avg = detectionState.beatIntervals.reduce((sum, value) => sum + value, 0) / detectionState.beatIntervals.length;
  return 60000 / avg;
}

function updateBeatDot(strength) {
  if (!hud.beatPulseDot) return;
  const s = constrain(strength, 0, 1);
  hud.beatPulseDot.style.transform = `scale(${(1 + s * 0.95).toFixed(2)})`;
  const alpha = 0.22 + s * 0.78;
  hud.beatPulseDot.style.background = `rgba(30, 215, 96, ${alpha.toFixed(3)})`;
  hud.beatPulseDot.style.boxShadow = `0 0 ${(2 + s * 18).toFixed(1)}px rgba(30, 215, 96, ${alpha.toFixed(3)})`;
}

function drawIdleMessage() {
  fill(0, 0, 0, 180);
  noStroke();
  rect(18, height - 72, 340, 46, 8);
  fill(29, 185, 84, 240);
  textAlign(LEFT, CENTER);
  textSize(14);
  text("Allow microphone access to begin", 30, height - 49);
}

function windowResized() {
  const host = canvasHost();
  resizeCanvas(host.clientWidth, host.clientHeight);
}
