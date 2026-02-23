let mic;
let fft;
let amp;
let running = false;

const smoothing = 0.9;
const bins = 256;

const startButton = () => document.getElementById("startButton");
const statusText = () => document.getElementById("status");
const canvasHost = () => document.getElementById("canvasHost");

function setup() {
  const host = canvasHost();
  const cnv = createCanvas(host.clientWidth, host.clientHeight);
  cnv.parent(host);
  noStroke();
  textFont("Space Grotesk");

  mic = new p5.AudioIn();
  fft = new p5.FFT(smoothing, bins);
  amp = new p5.Amplitude();

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
  drawBackground();

  if (!running) {
    drawIdleMessage();
    return;
  }

  const level = amp.getLevel();
  const spectrum = fft.analyze();

  drawShapeSystem(level, spectrum);
}

function drawBackground() {
  const t = millis() * 0.00025;
  const a = map(sin(t), -1, 1, 225, 235);
  const b = map(cos(t * 1.2), -1, 1, 232, 242);
  background(a, b, 245);

  fill(255, 255, 255, 95);
  ellipse(width * 0.15, height * 0.2, width * 0.45, width * 0.45);
  ellipse(width * 0.82, height * 0.75, width * 0.38, width * 0.38);
}

function drawShapeSystem(level, spectrum) {
  const cx = width / 2;
  const cy = height / 2;
  const low = fft.getEnergy("bass");
  const mid = fft.getEnergy("mid");
  const high = fft.getEnergy("treble");
  const baseSize = min(width, height) * 0.22;
  const starRadius = baseSize + map(low, 0, 255, 0, 70);
  const starInner = starRadius * (0.42 + map(mid, 0, 255, 0, 0.12));
  const pulse = map(level, 0, 0.45, 0, 55, true);

  push();
  translate(cx, cy);

  const outerRot = millis() * 0.00045;
  rotate(outerRot);
  drawPolygon(
    0,
    0,
    starRadius * 1.45 + map(high, 0, 255, -12, 30),
    6,
    color(92, 118, 235, 85),
    color(171, 111, 255, 40)
  );

  rotate(-outerRot * 1.6);
  drawPolygon(
    0,
    0,
    starRadius * 1.1 + pulse,
    8,
    color(255, 106, 171, 92),
    color(255, 195, 96, 48)
  );

  rotate(outerRot * 0.8);
  drawStar(0, 0, starInner, starRadius + pulse, 5, color(255, 0, 158, 230));

  fill(250, 250, 255, 180);
  circle(0, 0, baseSize * 0.24 + pulse * 0.5);

  drawReactiveRing(spectrum, high);
  pop();
}

function drawPolygon(x, y, radius, points, c1, c2) {
  drawingContext.save();
  const gradient = drawingContext.createRadialGradient(x, y, 20, x, y, radius);
  gradient.addColorStop(0, c1.toString());
  gradient.addColorStop(1, c2.toString());
  drawingContext.fillStyle = gradient;
  beginShape();
  for (let i = 0; i < points; i++) {
    const angle = (TWO_PI * i) / points - HALF_PI;
    vertex(x + cos(angle) * radius, y + sin(angle) * radius);
  }
  endShape(CLOSE);
  drawingContext.restore();
}

function drawStar(x, y, innerRadius, outerRadius, points, starColor) {
  fill(starColor);
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    const angle = (PI * i) / points - HALF_PI;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertex(x + cos(angle) * radius, y + sin(angle) * radius);
  }
  endShape(CLOSE);
}

function drawReactiveRing(spectrum, high) {
  noFill();
  strokeWeight(2);
  stroke(80, 96, 180, 145);

  const ringRadius = min(width, height) * 0.32;

  beginShape();
  for (let i = 0; i < spectrum.length; i += 6) {
    const angle = map(i, 0, spectrum.length, 0, TWO_PI);
    const displacement = map(spectrum[i], 0, 255, -18, 42);
    const x = cos(angle) * (ringRadius + displacement);
    const y = sin(angle) * (ringRadius + displacement);
    vertex(x, y);
  }
  endShape(CLOSE);

  stroke(255, 255, 255, 170);
  circle(0, 0, ringRadius * 1.22 + map(high, 0, 255, -8, 24));
}

function drawIdleMessage() {
  fill(40, 43, 54, 170);
  textAlign(CENTER, CENTER);
  textSize(15);
  text("Press Enable Audio", width / 2, height * 0.56);
}

function windowResized() {
  const host = canvasHost();
  resizeCanvas(host.clientWidth, host.clientHeight);
}
