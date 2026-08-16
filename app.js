/* ═══════════════════════════════════════════════════════════
   DJ LIGHT SHOW – app.js  (full rewrite)
   Effects engine + Music Sync (Web Audio API) + Auto controls
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ── Canvas setup ──────────────────────────────────────────
const canvas  = document.getElementById('lightCanvas');
const ctx     = canvas.getContext('2d');
const fCanvas = document.getElementById('floorCanvas');
const fCtx    = fCanvas.getContext('2d');

function resizeCanvases() {
  const stage = document.getElementById('stage');
  canvas.width  = stage.clientWidth;
  canvas.height = stage.clientHeight;
  fCanvas.width  = fCanvas.offsetWidth;
  fCanvas.height = fCanvas.offsetHeight;
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ── State ─────────────────────────────────────────────────
const state = {
  fx:           'spotlight',
  palette:      'rainbow',
  customColor:  '#ff00ff',
  speed:        5,
  bpm:          120,
  brightness:   0.8,
  beams:        6,
  spread:       60,
  fog:          true,
  floor:        true,
  pulse:        true,
  trail:        false,
  glitter:      true,
  hueCycle:     true,
  blackout:     false,
  autoMode:     true,
  autoInterval: 8,        // seconds between auto-effect changes
  autoShuffle:  true,     // shuffle vs sequential
  hueOffset:    0,
  time:         0,
  // Music sync
  musicActive:  false,
  sensitivity:  7,
  bassThreshold:40,
  reactMode:    'brightness', // brightness | beams | color | effect
  // Live audio values (updated by analyser)
  audioLevel:   0,
  bassLevel:    0,
  midLevel:     0,
  trebleLevel:  0,
};

// ── Color Palettes ─────────────────────────────────────────
const PALETTES = {
  rainbow: (t) => `hsl(${(t * 360 + state.hueOffset) % 360},100%,60%)`,
  fire:    (t) => { const h = 20 + t * 30; return `hsl(${h},100%,${50+t*20}%)`; },
  ice:     (t) => { const h = 190 + t * 60; return `hsl(${h},100%,${50+t*20}%)`; },
  neon:    (t) => { const h = [120,300,180][Math.floor(t*3)%3]; return `hsl(${h},100%,60%)`; },
  gold:    (t) => { const h = 40 + t * 20; return `hsl(${h},100%,${50+t*15}%)`; },
  mono:    (_)  => `hsl(0,0%,${70 + Math.sin(frame * 0.03) * 18}%)`,
  cyber:   (t) => { const h = 150 + t * 130; return `hsl(${h},100%,60%)`; },
  sunset:  (t) => { const h = 340 + t * 40; return `hsl(${h},100%,${55+t*10}%)`; },
  custom:  (_)  => state.customColor,
};

function getColor(t = 0) {
  const fn = PALETTES[state.palette] || PALETTES.rainbow;
  return fn(((t + state.hueOffset / 360) % 1 + 1) % 1);
}

// ── Particle system ────────────────────────────────────────
const glitterParticles = [];
for (let i = 0; i < 200; i++) {
  glitterParticles.push({
    x: Math.random(), y: Math.random(),
    vx: (Math.random()-0.5)*0.002,
    vy: (Math.random()-0.5)*0.002,
    size: Math.random()*2.5+0.5,
    alpha: Math.random(),
    t: Math.random(),
  });
}

// ── Firework particles ─────────────────────────────────────
const fireworks = [];
function spawnFirework(cx, cy) {
  const count = 60 + Math.floor(Math.random()*40);
  const color = getColor(Math.random());
  for (let i = 0; i < count; i++) {
    const angle = (i/count)*Math.PI*2;
    const speed = Math.random()*5+2;
    fireworks.push({ x:cx, y:cy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      alpha:1, color, size:Math.random()*3+1, life:1 });
  }
}

// ── BPM Beat ───────────────────────────────────────────────
let lastBeat = 0;
function checkBeat(now) {
  const interval = (60 / state.bpm) * 1000;
  if (now - lastBeat >= interval) { lastBeat = now; doBeat(); }
}

function doBeat() {
  if (state.pulse) {
    const ring = document.getElementById('beat-ring');
    ring.classList.remove('pulse');
    void ring.offsetWidth;
    ring.classList.add('pulse');
  }
  if (state.fx === 'firework') {
    spawnFirework(canvas.width*(0.2+Math.random()*0.6), canvas.height*(0.1+Math.random()*0.5));
  }
  document.getElementById('status-bpm-label').textContent = `${state.bpm} BPM`;
}

// ── Effect switching ───────────────────────────────────────
const FX_LIST = ['spotlight','laser','wash','scanner','galaxy','firework','tunnel','strobe','parcan','derby','matrix','discoball'];
let autoTimer = 0;

function setEffect(name) {
  state.fx = name;
  document.querySelectorAll('.fx-btn').forEach(b => b.classList.toggle('active', b.dataset.fx === name));
  document.getElementById('status-effect-label').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  if (name === 'firework') spawnFirework(canvas.width*0.5, canvas.height*0.3);
}

function autoNextEffect() {
  if (state.autoShuffle) {
    const others = FX_LIST.filter(f => f !== state.fx);
    setEffect(others[Math.floor(Math.random()*others.length)]);
  } else {
    setEffect(FX_LIST[(FX_LIST.indexOf(state.fx)+1) % FX_LIST.length]);
  }
  if (state.hueCycle) state.hueOffset = (state.hueOffset + Math.random()*120) % 360;
}

// ── Draw helpers ───────────────────────────────────────────
function drawBeam(cx, cy, angle, length, color, width = 2) {
  const ex = cx + Math.cos(angle)*length;
  const ey = cy + Math.sin(angle)*length;
  ctx.save();
  ctx.globalAlpha = state.brightness;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 8;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.restore();
}

function drawCone(cx, cy, angle, halfSpread, length, color, alpha = 0.18) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, length);
  grad.addColorStop(0, color.replace('hsl(','hsla(').replace(')',`,${alpha})`));
  grad.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha = state.brightness;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, length, angle-halfSpread, angle+halfSpread);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Effective brightness (boosted by music bass) ───────────
function effectiveBrightness() {
  if (!state.musicActive) return state.brightness;
  const boost = (state.reactMode === 'brightness') ? state.bassLevel * 0.6 : 0;
  return Math.min(1, state.brightness + boost);
}

// ── EFFECT RENDERERS ───────────────────────────────────────

/* --- SPOTLIGHT --- */
function drawSpotlight(t) {
  const W = canvas.width, H = canvas.height;
  const count = state.beams;
  const spreadRad = (state.spread * Math.PI) / 180;
  const br = effectiveBrightness();

  for (let i = 0; i < count; i++) {
    const phase = (i/count)*Math.PI*2;
    const angle = Math.PI/2 + Math.sin(t*state.speed*0.3+phase)*(spreadRad/2);
    const cx = W*(0.1+(i/(count-1||1))*0.8);
    const color = getColor(i/count);

    drawCone(cx, 0, angle, 0.12, H*1.3, color, 0.15);
    drawBeam(cx, 0, angle, H*1.2, color, 3);

    ctx.save();
    ctx.globalAlpha = br * 0.9;
    const cg = ctx.createRadialGradient(cx, 0, 0, cx, 0, 40);
    cg.addColorStop(0, 'rgba(255,255,255,0.9)');
    cg.addColorStop(0.3, color.replace('hsl(','hsla(').replace(')',',0.4)'));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, 0, 40, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* --- STROBE --- */
let strobeOn = true, strobeTimer = 0;
function drawStrobe(t) {
  const W = canvas.width, H = canvas.height;
  const strobeHz = state.speed * 3;
  strobeTimer++;
  if (strobeTimer > 60/strobeHz) { strobeOn = !strobeOn; strobeTimer = 0; }
  if (!strobeOn) return;
  ctx.save();
  ctx.globalAlpha = effectiveBrightness() * (0.5+Math.random()*0.5);
  ctx.fillStyle = getColor(Math.random());
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* --- LASER --- */
function drawLaser(t) {
  const W = canvas.width, H = canvas.height;
  const count = state.beams;
  for (let i = 0; i < count; i++) {
    const color = getColor(i/count);
    const ySrc  = H*0.3 + Math.sin(t*state.speed*0.5+i*1.3)*H*0.2;
    const angle = Math.sin(t*state.speed*0.4+i*0.8)*(Math.PI*state.spread/360);
    ctx.save();
    ctx.globalAlpha = effectiveBrightness();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, ySrc);
    ctx.lineTo(W, ySrc + Math.tan(angle)*W);
    ctx.stroke();
    const dotGrad = ctx.createRadialGradient(0, ySrc, 0, 0, ySrc, 10);
    dotGrad.addColorStop(0, 'white'); dotGrad.addColorStop(0.3, color); dotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = dotGrad;
    ctx.beginPath(); ctx.arc(0, ySrc, 10, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* --- COLOR WASH --- */
function drawWash(t) {
  const W = canvas.width, H = canvas.height;
  const speed = state.speed * 0.004;
  for (let i = 0; i < state.beams; i++) {
    const frac = i/(state.beams-1||1);
    const color = getColor((frac + t*speed) % 1);
    const grad = ctx.createRadialGradient(W*frac, H, 0, W*frac, H, H*0.9);
    grad.addColorStop(0, color.replace('hsl(','hsla(').replace(')',',0.4)'));
    grad.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = effectiveBrightness() * 0.7;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const hue = ((t*state.speed*0.5) % 360 + state.hueOffset) % 360;
  const sweepGrad = ctx.createLinearGradient(0, 0, W, H);
  sweepGrad.addColorStop(0, `hsla(${hue},100%,60%,0.08)`);
  sweepGrad.addColorStop(0.5, `hsla(${(hue+120)%360},100%,60%,0.08)`);
  sweepGrad.addColorStop(1, `hsla(${(hue+240)%360},100%,60%,0.08)`);
  ctx.save();
  ctx.globalAlpha = effectiveBrightness();
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* --- SCANNER --- */
function drawScanner(t) {
  const W = canvas.width, H = canvas.height;
  const count = state.beams;
  for (let i = 0; i < count; i++) {
    const phase = (i/count)*Math.PI*2;
    const scanAngle = t*state.speed*0.4+phase;
    const cx = W*(i+0.5)/count;
    const dir = Math.PI/2 + Math.sin(scanAngle)*((state.spread*Math.PI/180)/2);
    const color = getColor(i/count);
    drawCone(cx, 0, dir, 0.06, H*1.2, color, 0.12);
    drawBeam(cx, 0, dir, H*1.1, color, 2);
    ctx.save();
    ctx.globalAlpha = effectiveBrightness() * 0.9;
    const hg = ctx.createRadialGradient(cx, 8, 0, cx, 8, 20);
    hg.addColorStop(0, 'rgba(255,255,255,0.9)'); hg.addColorStop(0.5, color.replace('hsl(','hsla(').replace(')',',0.6)')); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(cx, 8, 12, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* --- GALAXY --- */
function drawGalaxy(t) {
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const stars = 120;
  const speed = state.speed * 0.01;
  ctx.save();
  ctx.globalAlpha = effectiveBrightness() * 0.9;
  for (let i = 0; i < stars; i++) {
    const frac = i/stars;
    const angle = frac*Math.PI*20 + t*speed;
    const radius = frac*Math.min(W,H)*0.45;
    const x = cx + Math.cos(angle)*radius;
    const y = cy + Math.sin(angle)*radius*0.5;
    const color = getColor(frac);
    const size = (1-frac)*3+0.5;
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = size*4;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
  }
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
  coreGrad.addColorStop(0.3, getColor(t*0.1).replace('hsl(','hsla(').replace(')',',0.3)'));
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

/* --- FIREWORK --- */
function drawFirework(_t) {
  for (let i = fireworks.length-1; i >= 0; i--) {
    const p = fireworks[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.98; p.vy *= 0.98;
    p.life -= 0.015+Math.random()*0.005; p.alpha = p.life;
    if (p.life <= 0) { fireworks.splice(i,1); continue; }
    ctx.save();
    ctx.globalAlpha = p.alpha * effectiveBrightness();
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if (fireworks.length < 40 && Math.random() < 0.04) {
    spawnFirework(canvas.width*(0.15+Math.random()*0.7), canvas.height*(0.1+Math.random()*0.5));
  }
}

/* --- TUNNEL --- */
function drawTunnel(t) {
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const rings = 14;
  const speed = state.speed * 0.04;
  ctx.save();
  for (let i = rings; i >= 1; i--) {
    const progress = ((i/rings)+t*speed) % 1;
    const size = (1-progress)*Math.min(W,H)*0.55;
    const alpha = progress * effectiveBrightness() * 0.7;
    const color = getColor(((i/rings)+t*0.02) % 1);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.globalAlpha = alpha;
    ctx.strokeRect(cx-size/2, cy-size/2, size, size);
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(cx-size/2, cy-size/2); ctx.lineTo(cx+size/2, cy+size/2);
      ctx.moveTo(cx+size/2, cy-size/2); ctx.lineTo(cx-size/2, cy+size/2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Glitter ────────────────────────────────────────────────
function drawGlitter() {
  if (!state.glitter) return;
  const W = canvas.width, H = canvas.height;
  for (const p of glitterParticles) {
    p.x += p.vx; p.y += p.vy;
    p.alpha += (Math.random()-0.5)*0.05;
    p.alpha = Math.max(0, Math.min(1, p.alpha));
    if (p.x < 0 || p.x > 1) p.vx *= -1;
    if (p.y < 0 || p.y > 1) p.vy *= -1;
    ctx.save();
    ctx.globalAlpha = p.alpha * effectiveBrightness() * 0.6;
    ctx.fillStyle = '#fff'; ctx.shadowColor = getColor(p.t); ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x*W, p.y*H, p.size, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Floor Glow ─────────────────────────────────────────────
function drawFloor(t) {
  if (!state.floor) { fCtx.clearRect(0,0,fCanvas.width,fCanvas.height); return; }
  fCtx.clearRect(0,0,fCanvas.width,fCanvas.height);
  const W = fCanvas.width, H = fCanvas.height;
  for (let i = 0; i < state.beams; i++) {
    const x = W*(0.05+(i/state.beams)*0.9+Math.sin(t*0.5+i)*0.04);
    const color = getColor(i/state.beams);
    const grad = fCtx.createRadialGradient(x,H/2,0,x,H/2,W*0.2);
    grad.addColorStop(0, color.replace('hsl(','hsla(').replace(')',',0.3)')); grad.addColorStop(1,'transparent');
    fCtx.save(); fCtx.globalAlpha = effectiveBrightness()*0.6; fCtx.fillStyle = grad;
    fCtx.fillRect(0,0,W,H); fCtx.restore();
  }
}

let flashAlpha = 0;
function doFlash() { flashAlpha = 1; }

/* ═══════════════════════════════════════
   PAR CANS – fixed overhead can lights
═══════════════════════════════════════ */
function drawParCans(t) {
  const W = canvas.width, H = canvas.height;
  const count = state.beams;
  const br = effectiveBrightness();
  const tightSpread = 0.14; // ~8 deg half-angle

  for (let i = 0; i < count; i++) {
    const cx = W * (0.05 + (i / (count - 1 || 1)) * 0.9);
    const color = getColor(i / count);
    // Slow gentle color breathe
    const breath = 0.85 + Math.sin(t * state.speed * 0.2 + i * 0.7) * 0.15;

    // Cone fill
    const coneGrad = ctx.createRadialGradient(cx, 0, 0, cx, 0, H);
    coneGrad.addColorStop(0, color.replace('hsl(','hsla(').replace(')',`,${0.45 * breath})`));
    coneGrad.addColorStop(0.6, color.replace('hsl(','hsla(').replace(')',`,${0.12 * breath})`));
    coneGrad.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = br;
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.arc(cx, 0, H, Math.PI/2 - tightSpread, Math.PI/2 + tightSpread);
    ctx.closePath();
    ctx.fill();

    // Hard beam centre line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = br * breath;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();
    ctx.restore();

    // Housing body
    ctx.save();
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - 14, -2, 28, 22, 4);
    ctx.fill(); ctx.stroke();
    // Lens glow
    const lg = ctx.createRadialGradient(cx, 10, 0, cx, 10, 13);
    lg.addColorStop(0, 'rgba(255,255,255,0.95)');
    lg.addColorStop(0.35, color.replace('hsl(','hsla(').replace(')',',0.7)'));
    lg.addColorStop(1, 'transparent');
    ctx.globalAlpha = br * breath;
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(cx, 10, 13, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Floor pool
    const poolR = H * Math.tan(tightSpread) * 0.8;
    const pg = ctx.createRadialGradient(cx, H, 0, cx, H, poolR);
    pg.addColorStop(0, color.replace('hsl(','hsla(').replace(')',`,${0.35 * breath})`));
    pg.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = br;
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(cx, H - 10, poolR, poolR * 0.25, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

/* ═══════════════════════════════════════
   DERBY – spinning moonflower beams
═══════════════════════════════════════ */
function drawDerby(t) {
  const W = canvas.width, H = canvas.height;
  const fixtureCount = Math.min(state.beams, 5);
  const br = effectiveBrightness();
  const beamsPerFixture = 5;

  for (let d = 0; d < fixtureCount; d++) {
    const cx = W * (0.1 + (d / (fixtureCount - 1 || 1)) * 0.8);
    const cy = 18;
    const spinDir = d % 2 === 0 ? 1 : -1;
    const spin = t * state.speed * 0.45 * spinDir + (d / fixtureCount) * Math.PI * 2;

    for (let b = 0; b < beamsPerFixture; b++) {
      const a = spin + (b / beamsPerFixture) * Math.PI * 2;
      // Tilt beam outward from vertical
      const tilt = (state.spread / 180) * 0.65;
      const beamAngle = Math.PI / 2 + Math.sin(a) * tilt;
      const color = getColor((d / fixtureCount) + (b / beamsPerFixture) * 0.2);

      // Beam line
      const bx = cx + Math.cos(beamAngle) * H * 1.3;
      const by = cy + Math.sin(beamAngle) * H * 1.3;
      ctx.save();
      ctx.globalAlpha = br * 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(bx, by);
      ctx.stroke();

      // Reflection spot
      if (by > 0 && by < H && bx > -40 && bx < W + 40) {
        ctx.globalAlpha = br * 0.75;
        const sg = ctx.createRadialGradient(bx, by, 0, bx, by, 18);
        sg.addColorStop(0, 'rgba(255,255,255,0.9)');
        sg.addColorStop(0.3, color.replace('hsl(','hsla(').replace(')',',0.6)'));
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // Fixture head
    ctx.save();
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    // Spinning indicator dot
    const dotA = spin;
    ctx.fillStyle = getColor(d / fixtureCount);
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(dotA)*6, cy + Math.sin(dotA)*6, 2.5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

/* ═══════════════════════════════════════
   MATRIX – LED grid of beaming dots
═══════════════════════════════════════ */
function drawMatrix(t) {
  const W = canvas.width, H = canvas.height;
  const cols = Math.max(4, Math.min(state.beams + 2, 14));
  const rows = Math.ceil(cols * 0.55);
  const cellW = W / cols;
  const cellH = H / (rows + 1);
  const br = effectiveBrightness();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cellW;
      const y = (r + 0.5) * cellH;
      // Wave propagating through grid
      const wave = Math.sin(t * state.speed * 0.4 + c * 0.55 + r * 0.45);
      const pulse = (wave + 1) / 2; // 0-1
      const phase = ((c / cols) + (r / rows) * 0.5 + t * state.speed * 0.05) % 1;
      const color = getColor(phase);

      ctx.save();
      ctx.globalAlpha = br * (0.25 + pulse * 0.75);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI*2);
      ctx.fill();

      // Down-beam when bright
      if (pulse > 0.55) {
        ctx.globalAlpha = br * (pulse - 0.55) * 0.6;
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.restore();

      // Housing grid dot (static)
      ctx.save();
      ctx.fillStyle = '#1c1c2e';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/* ═══════════════════════════════════════
   DISCO BALL – mirror ball reflections
═══════════════════════════════════════ */
function drawDiscoBall(t) {
  const W = canvas.width, H = canvas.height;
  const ballX = W / 2;
  const ballY = H * 0.14;
  const ballR = Math.min(W, H) * 0.075;
  const br = effectiveBrightness();
  const spin = t * state.speed * 0.25;
  const spotsCount = 35 + state.beams * 3;

  // Hanging wire
  ctx.save();
  ctx.strokeStyle = 'rgba(180,180,200,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ballX, 0); ctx.lineTo(ballX, ballY - ballR); ctx.stroke();
  ctx.restore();

  // Ball body gradient
  const bg = ctx.createRadialGradient(
    ballX - ballR*0.35, ballY - ballR*0.35, ballR*0.05,
    ballX, ballY, ballR
  );
  bg.addColorStop(0, 'rgba(255,255,255,0.85)');
  bg.addColorStop(0.4, 'rgba(160,165,185,0.65)');
  bg.addColorStop(1, 'rgba(30,30,50,0.75)');
  ctx.save();
  ctx.globalAlpha = br;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI*2); ctx.fill();

  // Mirror tile grid on the ball
  const tR = 8, tC = 14;
  for (let r = 0; r < tR; r++) {
    for (let c = 0; c < tC; c++) {
      const phi   = (r / tR) * Math.PI;
      const theta = (c / tC) * Math.PI * 2 + spin;
      const sx = ballX + ballR * Math.sin(phi) * Math.cos(theta);
      const sy = ballY + ballR * Math.cos(phi);
      const depth = Math.sin(phi) * Math.sin(theta);
      if (depth < 0) continue;
      const ts = ballR * 0.13;
      const shine = Math.pow((depth + 1) / 2, 1.5);
      ctx.globalAlpha = br * (0.3 + shine * 0.7);
      ctx.fillStyle = `rgba(255,255,255,${shine})`;
      ctx.fillRect(sx - ts/2, sy - ts/2, ts, ts);
    }
  }
  ctx.restore();

  // Reflected light spots dancing across stage
  for (let i = 0; i < spotsCount; i++) {
    const a = (i / spotsCount) * Math.PI * 2 + spin * 1.8;
    const elev = Math.sin(i * 0.83 + t * state.speed * 0.18) * Math.PI * 0.45;
    const dist = (0.28 + Math.abs(Math.sin(i * 1.17 + spin * 0.7))) * Math.min(W, H) * 0.52;
    const rx = ballX + Math.cos(a) * dist;
    const ry = ballY + Math.sin(elev) * dist * 0.65;

    if (rx < -30 || rx > W + 30 || ry < -60 || ry > H + 30) continue;

    const color = getColor(i / spotsCount);
    const flicker = (Math.sin(i * 2.3 + t * 3) + 1) / 2;
    const spotR = 5 + Math.sin(i + t * 1.5) * 3;

    ctx.save();
    ctx.globalAlpha = br * 0.75 * flicker;
    const sg = ctx.createRadialGradient(rx, ry, 0, rx, ry, spotR + 6);
    sg.addColorStop(0, 'rgba(255,255,255,0.95)');
    sg.addColorStop(0.3, color.replace('hsl(','hsla(').replace(')',',0.85)'));
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(rx, ry, spotR + 6, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── MAIN RENDER LOOP ───────────────────────────────────────
let frame = 0;

function render(now) {
  requestAnimationFrame(render);

  if (!state.trail) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = 'rgba(2,2,10,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (state.blackout) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    frame++; return;
  }

  if (state.hueCycle) {
    state.hueOffset = (state.hueOffset + state.speed*0.08) % 360;
  }

  const t = frame * 0.016;
  checkBeat(now);

  // Auto-mode cycling
  if (state.autoMode) {
    autoTimer++;
    const framesNeeded = Math.round((state.autoInterval * 60) / state.speed);
    if (autoTimer >= framesNeeded) { autoTimer = 0; autoNextEffect(); }
  }

  // Music-driven reactions
  if (state.musicActive) applyMusicReactions();

  // Draw active effect
  switch (state.fx) {
    case 'spotlight': drawSpotlight(t); break;
    case 'strobe':    drawStrobe(t);    break;
    case 'laser':     drawLaser(t);     break;
    case 'wash':      drawWash(t);      break;
    case 'scanner':   drawScanner(t);   break;
    case 'galaxy':    drawGalaxy(t);    break;
    case 'firework':  drawFirework(t);  break;
    case 'tunnel':    drawTunnel(t);    break;
    case 'parcan':    drawParCans(t);   break;
    case 'derby':     drawDerby(t);     break;
    case 'matrix':    drawMatrix(t);    break;
    case 'discoball': drawDiscoBall(t); break;
  }

  if (state.glitter) drawGlitter();

  if (flashAlpha > 0) {
    ctx.save(); ctx.globalAlpha = flashAlpha; ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    flashAlpha = Math.max(0, flashAlpha-0.07);
  }

  drawFloor(t);
  frame++;
}

requestAnimationFrame(render);

// ══════════════════════════════════════════════════════════
//  MUSIC SYNC ENGINE
// ══════════════════════════════════════════════════════════

let audioCtx = null, analyser = null, dataArray = null, micStream = null;
const vizCanvas = document.getElementById('vizCanvas');
const vizCtx    = vizCanvas.getContext('2d');
const beatMeterFill = document.getElementById('beat-meter-fill');

// Last-N energy history for beat detection
const HISTORY_LEN = 43;
const energyHistory = new Array(HISTORY_LEN).fill(0);
let historyIdx = 0;
let lastBeatTime = 0;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }
}

function connectSource(sourceNode) {
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  setMusicActive(true);
  requestAnimationFrame(audioLoop);
}

async function startMic() {
  try {
    initAudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = audioCtx.createMediaStreamSource(micStream);
    src.connect(analyser);
    // don't connect to destination (no mic feedback)
    setMusicActive(true, 'Microphone');
    requestAnimationFrame(audioLoop);
  } catch(e) {
    setMusicStatus('Mic denied', false);
  }
}

function startFile(file) {
  initAudioContext();
  const player = document.getElementById('audioPlayer');
  player.src = URL.createObjectURL(file);
  player.style.display = 'block';
  player.play();
  if (!startFile._src) {
    const src = audioCtx.createMediaElementSource(player);
    startFile._src = src;
    connectSource(src);
  }
  setMusicActive(true, `▶ ${file.name.slice(0,22)}`);
}

function stopSync() {
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  const player = document.getElementById('audioPlayer');
  player.pause(); player.style.display = 'none';
  setMusicActive(false);
  // Clear visualizer
  vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
  beatMeterFill.style.width = '0%';
}

function setMusicActive(active, label = 'Inactive') {
  state.musicActive = active;
  const status    = document.getElementById('music-status');
  const statusTxt = document.getElementById('music-status-text');
  const stopBtn   = document.getElementById('btn-stop-sync');
  status.classList.toggle('active-status', active);
  statusTxt.textContent = active ? label : 'Inactive';
  stopBtn.style.display = active ? '' : 'none';
}
function setMusicStatus(txt, active) {
  document.getElementById('music-status-text').textContent = txt;
  document.getElementById('music-status').classList.toggle('active-status', active);
}

// ── Audio analysis loop ────────────────────────────────────
function audioLoop() {
  if (!state.musicActive) return;
  requestAnimationFrame(audioLoop);

  analyser.getByteFrequencyData(dataArray);
  const bufLen = analyser.frequencyBinCount;
  const sampleRate = audioCtx.sampleRate;
  const binHz = sampleRate / (analyser.fftSize);

  // Band slices
  const bassEnd   = Math.floor(250  / binHz);
  const midEnd    = Math.floor(4000 / binHz);
  const trebleEnd = Math.floor(16000/ binHz);

  let bassSum=0, midSum=0, trebleSum=0;
  for (let i=0;      i<bassEnd;   i++) bassSum   += dataArray[i];
  for (let i=bassEnd;i<midEnd;    i++) midSum     += dataArray[i];
  for (let i=midEnd; i<trebleEnd; i++) trebleSum  += dataArray[i];

  const sens = state.sensitivity / 10;
  state.bassLevel   = Math.min(1, (bassSum   / (bassEnd   * 255)) * (sens * 3.5));
  state.midLevel    = Math.min(1, (midSum    / ((midEnd-bassEnd)   * 255)) * (sens * 2.5));
  state.trebleLevel = Math.min(1, (trebleSum / ((trebleEnd-midEnd) * 255)) * (sens * 2));
  state.audioLevel  = (state.bassLevel + state.midLevel + state.trebleLevel) / 3;

  // Beat detection via energy threshold
  const rawBass = bassSum / (bassEnd * 255);
  energyHistory[historyIdx % HISTORY_LEN] = rawBass;
  historyIdx++;
  const avgEnergy = energyHistory.reduce((a,b)=>a+b,0) / HISTORY_LEN;
  const threshold = (state.bassThreshold / 100) * 1.3;
  const now2 = performance.now();
  if (rawBass > avgEnergy * threshold && (now2 - lastBeatTime) > 200) {
    lastBeatTime = now2;
    doBeat();
    if (state.reactMode === 'effect') {
      // Beat-triggered effect switch (not too often)
      if (Math.random() < 0.15) autoNextEffect();
    }
    if (state.reactMode === 'color') {
      state.hueOffset = (state.hueOffset + 30 + Math.random()*60) % 360;
    }
  }

  // Beat meter bar
  beatMeterFill.style.width = `${Math.min(100, state.bassLevel * 100 * 1.2)}%`;

  // Draw visualizer
  drawVisualizer(dataArray, bufLen);
}

// ── Frequency visualizer renderer ─────────────────────────
function drawVisualizer(data, bufLen) {
  const W = vizCanvas.width  = vizCanvas.offsetWidth;
  const H = vizCanvas.height = vizCanvas.offsetHeight;
  vizCtx.clearRect(0, 0, W, H);

  const bars = 64;
  const barW = W / bars - 1;

  for (let i = 0; i < bars; i++) {
    const dataIdx = Math.floor((i / bars) * (bufLen * 0.7));
    const val = data[dataIdx] / 255;
    const barH = val * H;
    const hue  = (i / bars) * 260 + state.hueOffset;

    vizCtx.save();
    vizCtx.fillStyle = `hsla(${hue},100%,60%,0.9)`;
    vizCtx.shadowColor = `hsl(${hue},100%,60%)`;
    vizCtx.shadowBlur = 6;
    vizCtx.fillRect(i*(barW+1), H-barH, barW, barH);
    vizCtx.restore();
  }

  // Overlay waveform line
  vizCtx.save();
  vizCtx.strokeStyle = 'rgba(255,255,255,0.25)';
  vizCtx.lineWidth = 1;
  vizCtx.beginPath();
  for (let i = 0; i < bars; i++) {
    const dataIdx = Math.floor((i / bars) * bufLen);
    const val = data[dataIdx] / 255;
    const x = i * (barW+1) + barW/2;
    const y = H - val*H;
    if (i===0) vizCtx.moveTo(x,y); else vizCtx.lineTo(x,y);
  }
  vizCtx.stroke();
  vizCtx.restore();
}

// ── Apply music reactions each frame ──────────────────────
let _savedBeams = state.beams;
function applyMusicReactions() {
  if (state.reactMode === 'beams') {
    // Pulse beam count with bass
    const targetBeams = Math.round(2 + state.bassLevel * 14);
    state.beams = targetBeams;
  }
  // Always apply a tiny brightness flicker from treble
  if (state.reactMode === 'brightness') {
    // handled in effectiveBrightness()
  }
}

// ══════════════════════════════════════════════════════════
//  CONTROLS WIRING
// ══════════════════════════════════════════════════════════

// Effect buttons
document.querySelectorAll('.fx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setEffect(btn.dataset.fx);
    state.autoMode = false;
    document.getElementById('btn-auto').classList.remove('active-auto');
  });
});

// Color palette
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.palette = btn.dataset.palette;
  });
});

// Custom color
document.getElementById('customColor').addEventListener('input', (e) => {
  state.customColor = e.target.value;
  state.palette = 'custom';
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
});

// Speed
const speedSlider = document.getElementById('speedSlider');
speedSlider.addEventListener('input', () => {
  state.speed = +speedSlider.value;
  document.getElementById('speedVal').textContent = state.speed;
});

// BPM
const bpmSlider = document.getElementById('bpmSlider');
bpmSlider.addEventListener('input', () => {
  state.bpm = +bpmSlider.value;
  document.getElementById('bpmVal').textContent = state.bpm;
  document.getElementById('status-bpm-label').textContent = `${state.bpm} BPM`;
});

// Brightness
const brightSlider = document.getElementById('brightnessSlider');
brightSlider.addEventListener('input', () => {
  state.brightness = +brightSlider.value / 100;
  document.getElementById('brightnessVal').textContent = `${brightSlider.value}%`;
});

// Beam count
const beamSlider = document.getElementById('beamSlider');
beamSlider.addEventListener('input', () => {
  state.beams = +beamSlider.value;
  document.getElementById('beamVal').textContent = state.beams;
});

// Spread
const spreadSlider = document.getElementById('spreadSlider');
spreadSlider.addEventListener('input', () => {
  state.spread = +spreadSlider.value;
  document.getElementById('spreadVal').textContent = `${state.spread}°`;
});

// ── Auto Effects ───────────────────────────────────────────
const autoIntervalSlider = document.getElementById('autoIntervalSlider');
autoIntervalSlider.addEventListener('input', () => {
  state.autoInterval = +autoIntervalSlider.value;
  document.getElementById('autoIntervalVal').textContent = `${state.autoInterval}s`;
  autoTimer = 0; // reset so it doesn't skip immediately
});
document.getElementById('tog-auto-shuffle').addEventListener('change', (e) => {
  state.autoShuffle = e.target.checked;
});

// ── Visual FX Toggles ─────────────────────────────────────
const togMap = {
  'tog-fog':     () => { state.fog     = !state.fog;     document.getElementById('fog-layer').style.display = state.fog ? '' : 'none'; },
  'tog-floor':   () => { state.floor   = !state.floor;   },
  'tog-pulse':   () => { state.pulse   = !state.pulse;   },
  'tog-trail':   () => { state.trail   = !state.trail;   },
  'tog-glitter': () => { state.glitter = !state.glitter; },
  'tog-rainbow': () => { state.hueCycle= !state.hueCycle; },
};
Object.entries(togMap).forEach(([id, fn]) => {
  document.getElementById(id).addEventListener('change', fn);
});

// ── Master buttons ─────────────────────────────────────────
document.getElementById('btn-blackout').addEventListener('click', function() {
  state.blackout = !state.blackout;
  this.classList.toggle('active-bo', state.blackout);
});
document.getElementById('btn-strobe-flash').addEventListener('click', doFlash);
document.getElementById('btn-auto').addEventListener('click', function() {
  state.autoMode = !state.autoMode;
  this.classList.toggle('active-auto', state.autoMode);
  autoTimer = 0;
});

// ── Music Sync buttons ─────────────────────────────────────
document.getElementById('btn-mic').addEventListener('click', () => {
  if (state.musicActive) { stopSync(); return; }
  startMic();
  document.getElementById('btn-mic').classList.add('active-src');
});
document.getElementById('audioFileInput').addEventListener('change', (e) => {
  if (e.target.files[0]) startFile(e.target.files[0]);
});
document.getElementById('btn-stop-sync').addEventListener('click', () => {
  stopSync();
  document.getElementById('btn-mic').classList.remove('active-src');
});

// Sensitivity
document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
  state.sensitivity = +e.target.value;
  document.getElementById('sensitivityVal').textContent = state.sensitivity;
});

// Bass threshold
document.getElementById('bassThresholdSlider').addEventListener('input', (e) => {
  state.bassThreshold = +e.target.value;
  document.getElementById('bassThresholdVal').textContent = state.bassThreshold;
});

// React mode
document.querySelectorAll('.react-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.react-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.reactMode = btn.dataset.react;
    // Restore beams if leaving beams mode
    if (state.reactMode !== 'beams') {
      state.beams = +beamSlider.value;
      document.getElementById('beamVal').textContent = state.beams;
    }
  });
});

// ── Keyboard shortcuts ─────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.key.toLowerCase()) {
    case 'b': state.blackout = !state.blackout; break;
    case 'f': doFlash(); break;
    case 'a': document.getElementById('btn-auto').click(); break;
    case 'm': document.getElementById('btn-mic').click(); break;
    case 'p': togglePanel(); break;
    case '1': setEffect('spotlight'); break;
    case '2': setEffect('strobe');    break;
    case '3': setEffect('laser');     break;
    case '4': setEffect('wash');      break;
    case '5': setEffect('scanner');   break;
    case '6': setEffect('galaxy');    break;
    case '7': setEffect('firework');  break;
    case '8': setEffect('tunnel');    break;
    case 'arrowup':
      state.speed = Math.min(10, state.speed+1);
      speedSlider.value = state.speed;
      document.getElementById('speedVal').textContent = state.speed;
      e.preventDefault(); break;
    case 'arrowdown':
      state.speed = Math.max(1, state.speed-1);
      speedSlider.value = state.speed;
      document.getElementById('speedVal').textContent = state.speed;
      e.preventDefault(); break;
  }
});

// ── Fullscreen toggle ──────────────────────────────────────
const btnFS   = document.getElementById('btn-fullscreen');
const fsIcon  = document.getElementById('fs-icon');
const fsLabel = document.getElementById('fs-label');

function updateFSButton() {
  const isFS = !!document.fullscreenElement;
  btnFS.classList.toggle('is-fullscreen', isFS);
  fsIcon.textContent  = isFS ? '✕' : '⛶';
  fsLabel.textContent = isFS ? 'EXIT' : 'FULLSCREEN';
}
btnFS.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen().catch(()=>{});
});
document.addEventListener('fullscreenchange', () => { updateFSButton(); setTimeout(resizeCanvases, 200); });
window.addEventListener('keydown', (e) => { if (e.key==='F11') { e.preventDefault(); btnFS.click(); } });

// ── Control Panel toggle ───────────────────────────────────
const panel     = document.getElementById('control-panel');
const stageEl   = document.getElementById('stage');
const btnToggle = document.getElementById('btn-panel-toggle');
const btnClose  = document.getElementById('btn-panel-close');
const beatMeter = document.getElementById('beat-meter');

function togglePanel() {
  const isHidden = panel.classList.toggle('panel-hidden');
  stageEl.classList.toggle('stage-full', isHidden);
  btnToggle.classList.toggle('panel-hidden-tab', isHidden);
  beatMeter.classList.toggle('stage-full', isHidden);
  document.getElementById('beat-ring').classList.toggle('stage-full', isHidden);
  setTimeout(resizeCanvases, 380);
}
btnToggle.addEventListener('click', togglePanel);
btnClose.addEventListener('click',  togglePanel);
