// Ported from render_handoff_v72/prototypes/home/shared/screens.js (Zoovi website, round 1). Runs in the browser only
// (the marketing pages import it dynamically); design tokens are read from the .zv-site wrapper.
// Zoovi's round screen: the rabbit face plus four story screens (Ask, Understand, Practise, Explore).
// Drawn on a 2D canvas in a 480×480 design space, on the face's own cream screen with its dark eye-green for text; logo accents.
// Screens change with a circular iris wipe (lime edge); each screen's pieces animate in with their own 0..1 clock.
// No three.js here: the 3D stage uses it as a texture, and tools/screen.html renders single frames for Blender.

export const MODES = ['face', 'ask', 'understand', 'practise', 'explore'];
const LABEL = { ask: 'Ask', understand: 'Understand', practise: 'Practise', explore: 'Explore' };
const INTRO = 1.8;   // seconds for a screen's pieces to arrive
const IRIS = 0.8;    // seconds for the wipe

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const out3 = (x) => 1 - (1 - x) ** 3;
const back = (x) => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const inOut = (x) => (x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export class Screen {
  /** @param face an instance of Face (deskbot.js); @param P palette (logo tokens + the face set: screen, eye, brow, nose, cheek, mouth, white, bezel) */
  constructor(face, P, size = 512) {
    this.face = face; this.P = P; this.size = size;
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
    this.canvas = mk(); this.ctx = this.canvas.getContext('2d');
    this.bufA = mk(); this.bufB = mk();
    this.mode = 'face'; this.prevMode = null;
    this.tMode = 1; this.tIris = 1; this.time = 0;
  }
  /** Show a screen. key: one of MODES, or a face state name (idle, happy, listening…), which shows the full face. */
  show(key) {
    const isMode = MODES.includes(key) && key !== 'face';
    const mode = isMode ? key : 'face';
    if (!isMode) this.face.set(key);
    if (mode === this.mode) return;
    this.prevMode = this.mode; this.mode = mode; this.tMode = 0; this.tIris = 0;
  }
  update(dt) {
    this.time += dt;
    this.face.update(dt);
    this.tMode = Math.min(1, this.tMode + dt / INTRO);
    this.tIris = Math.min(1, this.tIris + dt / IRIS);
    this.draw();
  }
  /** Deterministic single frame (used for the Blender sequence). */
  renderState({ from = null, mode = 'face', tMode = 1, tIris = 1, time = 0, faceState = 'happy' }) {
    this.face.set(faceState); this.face.cur = { ...this.face.tgt }; this.face.nextBlink = 1e9; this.face.blinkT0 = -1; this.face.draw();
    this.prevMode = from; this.mode = mode; this.tMode = tMode; this.tIris = tIris; this.time = time;
    this.draw();
  }

  draw() {
    const c = this.ctx, s = this.size;
    if (this.prevMode && this.tIris < 1) {
      this.paint(this.bufA.getContext('2d'), this.prevMode, 1);
      this.paint(this.bufB.getContext('2d'), this.mode, this.tMode);
      const r = inOut(this.tIris) * s * .74;
      c.clearRect(0, 0, s, s);
      c.drawImage(this.bufA, 0, 0);
      c.save(); c.beginPath(); c.arc(s / 2, s / 2, r, 0, Math.PI * 2); c.clip(); c.drawImage(this.bufB, 0, 0); c.restore();
      c.save(); c.globalAlpha = 1 - this.tIris * .6; c.strokeStyle = this.P.lime; c.lineWidth = s * .022;
      c.beginPath(); c.arc(s / 2, s / 2, Math.max(1, r), 0, Math.PI * 2); c.stroke(); c.restore();
    } else {
      this.paint(c, this.mode, this.tMode);
    }
  }

  paint(ctx, mode, t) {
    const s = this.size;
    if (mode === 'face') { ctx.clearRect(0, 0, s, s); ctx.drawImage(this.face.canvas, 0, 0, s, s); return; }
    ctx.save(); ctx.setTransform(s / 480, 0, 0, s / 480, 0, 0);
    ctx.fillStyle = this.P.screen; ctx.fillRect(0, 0, 480, 480);
    // laid out in a 480 square, then scaled so it fills the round glass
    ctx.translate(240, 240); ctx.scale(1.16, 1.16); ctx.translate(-240, -240);
    this.label(ctx, mode, t);
    this[mode](ctx, t);
    ctx.restore();
  }

  /* -------- shared pieces -------- */
  text(ctx, str, x, y, { font = '600 30px Fredoka', color = this.P.eye, align = 'center', alpha = 1, spacing = '0px' } = {}) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.letterSpacing = spacing; ctx.fillText(str, x, y); ctx.restore();
  }
  label(ctx, mode, t) {
    const a = seg(t, 0, .22);
    ctx.save(); ctx.font = '700 18px Nunito'; ctx.letterSpacing = '3px';
    const str = LABEL[mode].toUpperCase(), w = ctx.measureText(str).width; ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = this.P.lime; ctx.beginPath(); ctx.arc(240 - w / 2 - 12, 112, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    this.text(ctx, str, 246, 113, { font: '700 18px Nunito', color: this.P.green, spacing: '3px', alpha: a });
  }

  /* -------- Ask: the child's question types in while Zoovi listens -------- */
  ask(ctx, t) {
    const P = this.P;
    const lines = ['What do the digits', 'of 1400 add up to?'];
    const pop = back(seg(t, .08, .3));
    ctx.save(); ctx.translate(240, 205); ctx.scale(pop || .001, pop || .001);
    ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.roundRect(-168, -62, 336, 124, 34); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-104, 58); ctx.lineTo(-126, 88); ctx.lineTo(-74, 58); ctx.fill();
    ctx.restore();
    const total = lines.join('').length, shown = Math.floor(seg(t, .26, .8) * total);
    let used = 0;
    lines.forEach((ln, i) => {
      const part = ln.slice(0, clamp(shown - used, 0, ln.length)); used += ln.length;
      ctx.save(); ctx.font = '600 32px Fredoka'; const fullW = ctx.measureText(ln).width; ctx.restore();
      this.text(ctx, part, 240 - fullW / 2, 186 + i * 40, { font: '600 32px Fredoka', align: 'left', color: P.eye });
    });
    const wa = seg(t, .18, .42);
    for (let i = 0; i < 17; i++) {
      const h = 8 + 40 * Math.abs(Math.sin(this.time * 5.5 + i * .72)) * (.45 + .55 * Math.abs(Math.sin(i * 1.7)));
      ctx.save(); ctx.globalAlpha = wa; ctx.fillStyle = i % 3 === 1 ? P.lime : P.green;
      ctx.beginPath(); ctx.roundRect(240 - 8.5 * 15 + i * 15 - 4, 322 - h / 2, 8, h, 4); ctx.fill(); ctx.restore();
    }
    this.text(ctx, 'Listening…', 240, 378, { font: '600 21px Nunito', alpha: wa * .8 });
  }

  /* -------- Understand: 1 + 4 + 0 + 0 rolls into 5 -------- */
  understand(ctx, t) {
    const P = this.P;
    this.text(ctx, 'Add each digit', 240, 156, { font: '600 21px Nunito', alpha: seg(t, .08, .28) * .85 });
    const xs = [-105, -35, 35, 105], merge = inOut(seg(t, .46, .68));
    xs.forEach((x0, i) => {
      const a = back(seg(t, .12 + i * .06, .32 + i * .06));
      const x = 240 + x0 * (1 - merge), sc = a * (1 - .5 * merge);
      if (sc <= .01 || merge >= .99) return;
      ctx.save(); ctx.translate(x, 248); ctx.scale(sc, sc); ctx.globalAlpha = 1 - merge;
      ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      this.text(ctx, '1400'[i], x, 250, { font: `600 ${Math.round(34 * Math.max(.3, sc))}px Fredoka`, color: P.eye, alpha: (1 - merge) * clamp(a) });
      if (i < 3) this.text(ctx, '+', 240 + (x0 + 35) * (1 - merge), 248, { font: '600 26px Fredoka', alpha: (1 - merge * 2) * seg(t, .32, .42) });
    });
    const ans = seg(t, .64, .84);
    if (ans > 0) {
      const sc = back(ans);
      ctx.save(); ctx.translate(240, 248); ctx.scale(sc, sc);
      ctx.fillStyle = P.green; ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      this.text(ctx, '5', 240, 253, { font: `600 ${Math.round(68 * sc)}px Fredoka`, color: P.screen });
      for (let k = 0; k < 8; k++) {
        const ang = k * Math.PI / 4, d = 76 + 28 * out3(ans);
        ctx.save(); ctx.globalAlpha = 1 - ans; ctx.fillStyle = k % 2 ? P.lime : P.yellow;
        ctx.beginPath(); ctx.arc(240 + Math.cos(ang) * d, 248 + Math.sin(ang) * d, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    this.text(ctx, '1 + 4 + 0 + 0 = 5', 240, 352, { font: '600 28px Fredoka', color: P.green, alpha: seg(t, .76, .94) });
  }

  /* -------- Practise: a quick check; 9 lights up -------- */
  practise(ctx, t) {
    const P = this.P;
    this.text(ctx, '2 + 0 + 2 + 5 = ?', 240, 172, { font: '600 42px Fredoka', alpha: seg(t, .1, .3) });
    const pick = seg(t, .56, .74);
    [['9', 166, true], ['7', 314, false]].forEach(([v, x, right], i) => {
      const a = back(seg(t, .26 + i * .08, .48 + i * .08));
      const on = right && pick > 0, pulse = right ? 1 + .1 * Math.sin(Math.PI * pick) : 1;
      ctx.save(); ctx.translate(x, 268); ctx.scale(a * pulse || .001, a * pulse || .001);
      ctx.globalAlpha = right ? 1 : 1 - .65 * pick;
      ctx.fillStyle = on ? P.green : P.screen; ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = on ? P.green : P.eye; ctx.stroke();
      ctx.restore();
      this.text(ctx, v, x, 272, { font: '600 46px Fredoka', color: on ? P.screen : P.eye, alpha: clamp(a) * (right ? 1 : 1 - .65 * pick) });
    });
    if (pick > 0) {
      const b = back(seg(t, .68, .84));
      ctx.save(); ctx.translate(206, 226); ctx.scale(b || .001, b || .001);
      ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = P.eye; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-2, 7); ctx.lineTo(9, -7); ctx.stroke(); ctx.restore();
    }
    for (let k = 0; k < 3; k++) {
      const fill = k < 2 ? 1 : seg(t, .78, .92);
      ctx.save(); ctx.globalAlpha = seg(t, .4, .6);
      ctx.beginPath(); ctx.arc(208 + k * 32, 366, 11, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = P.green; ctx.stroke();
      if (fill > 0) { ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(208 + k * 32, 366, 11 * fill, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  /* -------- Explore: curiosity orbits a little planet -------- */
  explore(ctx, t) {
    const P = this.P, cx = 240, cy = 252;
    const topics = [['Planets', P.green, P.screen], ['Volcanoes', P.yellow, P.eye], ['Oceans', P.lime, P.eye], ['Dinosaurs', P.eye, P.screen]];
    const items = topics.map(([label, bg, fg], i) => {
      const ang = this.time * .35 + i * Math.PI / 2 + t * 1.2;
      return { label, bg, fg, i, ang, x: cx + Math.cos(ang) * 128, y: cy + Math.sin(ang) * 70, depth: Math.sin(ang) };
    });
    const chip = (it) => {
      const a = back(seg(t, .28 + it.i * .07, .52 + it.i * .07)), sc = (.8 + .2 * (it.depth + 1) / 2) * a;
      if (sc <= .01) return;
      ctx.save(); ctx.font = '700 19px Nunito'; const w = ctx.measureText(it.label).width + 30; ctx.restore();
      ctx.save(); ctx.translate(it.x, it.y); ctx.scale(sc, sc); ctx.globalAlpha = .5 + .5 * (it.depth + 1) / 2;
      ctx.fillStyle = it.bg; ctx.beginPath(); ctx.roundRect(-w / 2, -19, w, 38, 19); ctx.fill();
      this.text(ctx, it.label, 0, 1, { font: '700 19px Nunito', color: it.fg });
      ctx.restore();
    };
    items.filter((it) => it.depth < 0).forEach(chip);
    const p = back(seg(t, .08, .32));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(p || .001, p || .001);
    ctx.save(); ctx.rotate(-.32); ctx.strokeStyle = P.green; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, 0, 92, 24, 0, Math.PI, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.lime; ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.arc(-18, -15, 11, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(16, 14, 8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.rotate(-.32); ctx.strokeStyle = P.green; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, 0, 92, 24, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
    ctx.restore();
    items.filter((it) => it.depth >= 0).forEach(chip);
    this.text(ctx, 'Follow your curiosity', 240, 376, { font: '600 21px Nunito', alpha: seg(t, .6, .85) * .85 });
  }
}
