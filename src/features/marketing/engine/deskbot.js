// Ported from render_handoff_v72/prototypes/home/shared/deskbot.js (Zoovi website, round 1). Runs in the browser only
// (the marketing pages import it dynamically); design tokens are read from the .zv-site wrapper.
// Zoovi deskbot: three.js stage, real v72 model, animated canvas face.
// loadDeskbot(url) is the single swap point: pass a newer .glb and nothing else changes.
// If the GLB fails to load, a procedural faceted stand-in is used so pages still work.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Screen } from './screens.js';

// the tokens live on the marketing pages' wrapper (styles/tokens.css), not on :root
export const tokenRoot = () => document.querySelector('.zv-site') || document.documentElement;
const css = getComputedStyle(tokenRoot());
const tok = (n) => css.getPropertyValue(n).trim();
export const PALETTE = {
  green: tok('--green'), lime: tok('--lime'), yellow: tok('--yellow'), paper: tok('--paper'), ink: tok('--ink'),
  screen: tok('--face-screen'), eye: tok('--face-eye'), brow: tok('--face-brow'), nose: tok('--face-nose'),
  cheek: tok('--face-cheek'), mouth: tok('--face-mouth'), soft: tok('--face-soft'), white: tok('--face-light'), bezel: tok('--bezel'),
};

/* ------------------------------------------------------------------ face ------------------------------------------------------------------ */
// The Zoovi face as the firmware draws it (components/zface/zface_core.c, see screen_ui/home_menu_patterns_v01.html):
// cream screen, dark green eyes with two catchlights, brown brows, pink nose, pink cheeks. Presets drive it.
const BASE = { eyeOpen: 1, eyeScale: 1, lookX: 0, lookY: 0, browL: 0, browR: 0, browTilt: 0, smile: .3, mouthW: 22, mouthOpen: 0, cheek: 0, tilt: 0, arc: 0, lidBot: 0 };
const PRESETS = {
  idle: {},
  listening: { browL: 7, browR: 7, eyeScale: 1.07, lookY: -.1, tilt: 4, smile: .2 },
  thinking: { lookX: .7, lookY: -.8, browL: -2, browR: 13, browTilt: -4, smile: 0, mouthW: 13, lidBot: .15, tilt: -4 },
  happy: { lidBot: .35, browL: 5, browR: 5, smile: .85, cheek: .7 },
  encourage: { lidBot: .22, browL: 8, browR: 3, browTilt: 6, smile: .6, tilt: 6, cheek: .4 },
  surprised: { eyeScale: 1.16, browL: 18, browR: 18, mouthOpen: .5, mouthW: 11, smile: 0, lookY: -.1 },
  sleepy: { eyeOpen: .14, browL: -4, browR: -4, smile: .1, mouthW: 12, tilt: 6, lookY: .3 },
  correct: { arc: 1, browL: 12, browR: 12, smile: 1, mouthOpen: .45, mouthW: 30, cheek: 1 },
  talk: { browL: 4, browR: 4, smile: .3, mouthOpen: .4, cheek: 0, lookY: -.05 },
};
export const FACE_STATES = Object.keys(PRESETS);
const target = (n) => ({ ...BASE, ...(PRESETS[n] || {}) });

export class Face {
  constructor(size = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.cur = target('idle'); this.tgt = target('idle');
    this.t = 0; this.nextBlink = 2; this.blinkT0 = -1;
    this.rotation = 0; // radians, to align with the screen's UVs
    this.flipX = false;
  }
  set(name) { this.tgt = target(name); this.state = name; }
  update(dt) {
    this.t += dt;
    const k = 1 - Math.exp(-dt * 9);
    if (this.state === 'talk') { // syllables: the mouth opens and closes in an uneven rhythm
      const s1 = Math.abs(Math.sin(this.t * 10.5)), s2 = Math.abs(Math.sin(this.t * 3.1));
      this.tgt.mouthOpen = s2 > .25 ? .18 + .55 * s1 : .05;
    }
    for (const key in this.cur) this.cur[key] += (this.tgt[key] - this.cur[key]) * k;
    if (this.t > this.nextBlink) { this.blinkT0 = this.t; this.nextBlink = this.t + 2.5 + Math.random() * 3; }
    this.draw();
  }
  draw() {
    const { ctx, canvas } = this; const S = canvas.width / 480; const p = this.cur, P = PALETTE;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = P.screen; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.rotation); if (this.flipX) ctx.scale(-1, 1);
    ctx.scale(S, S); ctx.translate(-240, -240);
    // the face's centre is (240, 265) in the firmware's 480 space; nudge it to the middle and tilt with the mood
    ctx.translate(240, 252); ctx.rotate(p.tilt * Math.PI / 180); ctx.scale(1.04, 1.04); ctx.translate(-240, -265);

    let blink = 1;
    if (this.blinkT0 >= 0) { const b = (this.t - this.blinkT0) / .16; if (b < 1) blink = Math.abs(1 - 2 * b) * .92 + .08; }
    const open = Math.max(0, Math.min(1.2, p.eyeOpen)) * blink;
    const arc = Math.max(0, Math.min(1, p.arc)), cheek = Math.max(0, Math.min(1, p.cheek));

    // cheeks
    if (cheek > .01) {
      ctx.globalAlpha = .45 * cheek; ctx.fillStyle = P.cheek;
      for (const x of [96, 384]) { ctx.beginPath(); ctx.ellipse(x, 330, 34, 18, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // brows
    ctx.strokeStyle = P.brow; ctx.lineWidth = 12; ctx.lineCap = 'round';
    for (const [x0, lift, sgn] of [[97, p.browL, -1], [302, p.browR, 1]]) {
      const b0 = 182 - lift * .9, b1 = 168 - lift * .9, tilt = sgn * p.browTilt * .9;
      ctx.beginPath(); ctx.moveTo(x0, b0 - tilt); ctx.quadraticCurveTo(x0 + 40, b1, x0 + 81, b0 + tilt); ctx.stroke();
    }
    // eyes: dark ellipses with a big and a small catchlight; happy lids flatten them, blink squashes them
    const gx = p.lookX * 16, gy = p.lookY * 14;
    for (const cx0 of [138, 342]) {
      const cx = cx0 + gx, cy = 260 + gy;
      const rx = 40 * p.eyeScale, ry = Math.max(3, 52 * p.eyeScale * open * (1 - .16 * Math.min(1, p.lidBot * 2.5)));
      if (arc < .99) {
        ctx.globalAlpha = 1 - arc;
        ctx.fillStyle = P.eye; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        if (ry > 16) {
          const k = ry / 52;
          ctx.fillStyle = P.white;
          ctx.beginPath(); ctx.arc(cx - 14, cy - 20 * k, 11, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 12, cy + 8 * k, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (arc > .01) { // the "correct" squint: upside-down arcs
        ctx.globalAlpha = arc; ctx.strokeStyle = P.eye; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 32, cy + 10); ctx.quadraticCurveTo(cx, cy - 34, cx + 32, cy + 10); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    // nose
    ctx.fillStyle = P.nose;
    ctx.beginPath(); ctx.moveTo(226, 342); ctx.lineTo(254, 342); ctx.quadraticCurveTo(249, 358, 240, 358); ctx.quadraticCurveTo(231, 358, 226, 342); ctx.fill();
    // mouth: open happy mouth, round talking mouth, or the resting little "w"
    const o = Math.max(0, Math.min(1.2, p.mouthOpen));
    if (this.state === 'talk') { // firmware talk mouth: ellipse (240, 378) r 18 × 14, opening and closing
      const open = Math.max(.12, Math.min(1, o / .7));
      ctx.fillStyle = P.mouth; ctx.beginPath(); ctx.ellipse(240, 378, 18 * (.8 + .2 * open), 14 * open, 0, 0, Math.PI * 2); ctx.fill();
    } else if (p.smile > .7 || (o > .3 && p.smile > .4)) {
      const d = 404 + o * 18;
      ctx.fillStyle = P.mouth; ctx.beginPath(); ctx.moveTo(208, 362); ctx.quadraticCurveTo(240, d, 272, 362); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.nose; ctx.beginPath(); ctx.moveTo(222, 380); ctx.quadraticCurveTo(240, 398, 258, 380); ctx.quadraticCurveTo(240, 372, 222, 380); ctx.fill();
    } else if (o > .15) {
      ctx.fillStyle = P.mouth; ctx.beginPath(); ctx.ellipse(240, 378, 18 * (.7 + o * .5), 14 * (.6 + o * .7), 0, 0, Math.PI * 2); ctx.fill();
    } else {
      const lift = (p.smile - .3) * 10;
      ctx.strokeStyle = P.brow; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(212, 366 - lift); ctx.quadraticCurveTo(226, 382 + lift, 240, 368); ctx.quadraticCurveTo(254, 382 + lift, 268, 366 - lift); ctx.stroke();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ model ------------------------------------------------------------------ */
// Tint: which logo token each part takes. The final device finish isn't decided, so pages can choose.
export const DEFAULT_TINT = { body: 'paper', ring: 'bezel', cap: 'bezel', symbol: 'paper', power: 'lime' };
function makeMats(tint = {}) {
  const t = { ...DEFAULT_TINT, ...tint };
  const c = (k) => PALETTE[t[k]] || PALETTE.paper;
  return {
    body: () => new THREE.MeshStandardMaterial({ color: c('body'), roughness: .86, metalness: 0, flatShading: true }),
    ring: () => new THREE.MeshStandardMaterial({ color: c('ring'), roughness: .7, metalness: 0, flatShading: true }),
    cap: () => new THREE.MeshStandardMaterial({ color: c('cap'), roughness: .75, flatShading: true }),
    symbol: (power) => new THREE.MeshStandardMaterial({ color: power ? c('power') : c('symbol'), roughness: .6 }),
    // Opaque, no depth write, drawn before the screen: hides the empty body interior between the Ø70 screen and the Ø85 glass edge.
    glass: () => new THREE.MeshBasicMaterial({ color: PALETTE.bezel, depthWrite: false }),
  };
}
let mat = makeMats();

function prepare(root, faceTex) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name;
    o.castShadow = true;
    if (n.startsWith('MachV3_Body')) o.material = mat.body();
    else if (n.startsWith('MachV3_FaceModule')) o.material = mat.ring();
    else if (n.startsWith('Display_CoverLens')) { o.material = mat.glass(); o.castShadow = false; o.renderOrder = 1; }
    else if (n.startsWith('Display_ActiveArea')) { o.material = new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false }); o.castShadow = false; o.renderOrder = 2; o.userData.isScreen = true; }
    else if (n.startsWith('ButtonCap')) o.material = mat.cap();
    else if (n.startsWith('ButtonSymbol')) o.material = mat.symbol(n.includes('Power'));
    else o.material = mat.body();
  });
}

function procedural(faceTex) {
  // Faceted egg: low-detail icosahedron, flat-shaded, base flattened. Mic holes + rear panel suggested.
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(.5, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, Math.max(pos.getY(i) * 1.0, -.36)); pos.setZ(i, pos.getZ(i) * 1.08);
  }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat.body()); body.name = 'MachV3_Body_proc'; body.castShadow = true; g.add(body);
  const face = new THREE.Group();
  face.position.set(0, .08, .34); face.rotation.x = -35 * Math.PI / 180;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .04, 48), mat.ring()); ring.rotation.x = Math.PI / 2; face.add(ring);
  const screen = new THREE.Mesh(new THREE.CircleGeometry(.36, 64), new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false })); screen.position.z = .021; face.add(screen);
  g.add(face);
  return g;
}

/**
 * Load the deskbot. Returns a Group whose origin is the centre of the device's bounding box,
 * normalised so the device is 1 unit tall, front facing +Z.
 */
export async function loadDeskbot(url = '/zoovi/zoovi.glb', faceTex, tint) {
  mat = makeMats(tint);
  let model;
  try {
    const loader = new GLTFLoader(); // the v72 .glb is not Draco-compressed, so no decoder is needed
    const gltf = await loader.loadAsync(url);
    model = gltf.scene;
    prepare(model, faceTex);
  } catch (err) {
    console.warn('[deskbot] GLB failed, using procedural stand-in:', err.message);
    model = procedural(faceTex);
  }
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const s = 1 / Math.max(size.x, size.y, size.z);
  model.position.sub(centre);
  const holder = new THREE.Group(); holder.add(model); holder.scale.setScalar(s);
  const pivot = new THREE.Group(); pivot.add(holder);
  pivot.userData.halfHeight = size.y * s / 2;
  return pivot;
}

/* ------------------------------------------------------------------ stage ------------------------------------------------------------------ */
/**
 * createStage(canvas, opts) → stage
 * stage.pose is a plain object GSAP can tween: { rotY, rotX, dist, shiftX, shiftY, scale, lift }
 * stage.setKeyframes([...]) + stage.progress(t) maps a 0..1 scroll value onto pose keyframes.
 */
export async function createStage(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const mobile = matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 400);

  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(PALETTE.paper), 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.2, 3.5, 3); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: .5, far: 10 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, .8); rim.position.set(-3, 1.5, -2); scene.add(rim);

  // the screen's text uses the page fonts; make sure they're ready before the first draw
  await Promise.all(['600 30px Fredoka', '700 18px Nunito', '700 19px Nunito', '600 21px Nunito'].map((f) => document.fonts.load(f).catch(() => {})));
  const face = new Face(512);
  const screen = new Screen(face, PALETTE, 512);
  const faceTex = new THREE.CanvasTexture(screen.canvas);
  faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.flipY = false; faceTex.anisotropy = 4;
  face.rotation = opts.faceRotation ?? 0; face.flipX = opts.faceFlipX ?? false;

  const bot = await loadDeskbot(opts.url, faceTex, opts.tint);
  let bodyMat = null, bodyTarget = null;
  bot.traverse((o) => { if (o.isMesh && /^MachV3_Body/.test(o.name)) bodyMat = o.material; });
  const spin = new THREE.Group(); spin.add(bot); scene.add(spin);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.ShadowMaterial({ opacity: opts.shadowOpacity ?? .1 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -bot.userData.halfHeight - .001; shadow.receiveShadow = true;
  spin.add(shadow);
  shadow.visible = opts.shadow !== false;

  const pose = { rotY: -.5, rotX: 0, dist: 3.2, shiftX: 0, shiftY: 0, scale: 1, lift: 0, opacity: 1, ...(opts.pose || {}) };
  let keyframes = null;

  function size() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(canvas);

  function apply() {
    spin.rotation.set(pose.rotX, pose.rotY, 0);
    spin.scale.setScalar(pose.scale);
    spin.position.y = pose.lift;
    camera.position.set(0, pose.dist * .14, pose.dist);
    camera.lookAt(0, 0, 0);
    const w = renderer.domElement.width, h = renderer.domElement.height;
    camera.setViewOffset(w, h, -pose.shiftX * w, -pose.shiftY * h, w, h);
  }

  let visible = true, last = performance.now(), raf = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    screen.update(dt); faceTex.needsUpdate = true;
    if (bodyMat && bodyTarget) bodyMat.color.lerp(bodyTarget, 1 - Math.exp(-dt * 3.5));
    if (keyframes) interp(stage.t);
    apply();
    canvas.style.opacity = pose.opacity;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  function interp(t) {
    // keyframes: [{at:0, rotY:.., dist:..}, {at:.3, ...}] — linear with smoothstep between neighbours
    let a = keyframes[0], b = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) if (t >= keyframes[i].at && t <= keyframes[i + 1].at) { a = keyframes[i]; b = keyframes[i + 1]; break; }
    const span = b.at - a.at || 1; let u = Math.max(0, Math.min(1, (t - a.at) / span)); u = u * u * (3 - 2 * u);
    for (const k in pose) if (k in a || k in b) { const va = a[k] ?? pose[k], vb = b[k] ?? va; pose[k] = va + (vb - va) * u; }
  }

  const stage = {
    THREE, scene, camera, renderer, bot, spin, pose, face, t: 0,
    setFace: (name) => screen.show(name),
    /** Show a story screen ('ask' | 'understand' | 'practise' | 'explore') or a face state ('idle', 'happy'…). */
    show: (key) => screen.show(key),
    /** Ease the device's shell to a colour (a CSS colour string). */
    bodyColor(c) { if (bodyMat) bodyTarget = new THREE.Color(c); },
    screen,
    setKeyframes(k) { keyframes = k ? k.slice().sort((x, y) => x.at - y.at) : null; },
    progress(t) { stage.t = t; },
    /** Screen-space centre + radius (CSS px, relative to canvas) of the bot, for placing DOM around it. */
    project() {
      apply(); spin.updateMatrixWorld(true);
      const r = canvas.getBoundingClientRect();
      const c = new THREE.Vector3(); spin.getWorldPosition(c);
      const top = c.clone().add(new THREE.Vector3(0, .5 * pose.scale, 0));
      const p = c.clone().project(camera), q = top.project(camera);
      const x = (p.x + 1) / 2 * r.width, y = (1 - p.y) / 2 * r.height;
      const radius = Math.abs((q.y - p.y) / 2 * r.height);
      return { x, y, radius };
    },
    /**
     * Where the bot and its screen land (CSS px, relative to the canvas) for a given pose, without changing the current pose.
     * Returns { bot: {x, y, radius}, screen: {x, y, radius} }.
     */
    measure(p = {}) {
      const saved = { ...pose }; Object.assign(pose, p);
      const bot = stage.project();
      const r = canvas.getBoundingClientRect();
      let screen = null;
      spin.traverse((o) => { if (o.userData.isScreen) screen = o; });
      let out = { bot, screen: { ...bot, radius: bot.radius * .4 } };
      if (screen) {
        screen.geometry.computeBoundingSphere();
        const bs = screen.geometry.boundingSphere;
        const c = bs.center.clone().applyMatrix4(screen.matrixWorld);
        const s = new THREE.Vector3(); screen.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
        const wr = bs.radius * Math.max(s.x, s.y, s.z);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(wr);
        const p0 = c.clone().project(camera), p1 = c.clone().add(up).project(camera);
        out.screen = { x: (p0.x + 1) / 2 * r.width, y: (1 - p0.y) / 2 * r.height, radius: Math.abs((p1.y - p0.y) / 2 * r.height) };
      }
      Object.assign(pose, saved); apply();
      return out;
    },
    /**
     * The device's face as it lands on screen right now (CSS px, relative to the canvas):
     * inner = edge of the cream screen, outer = outer edge of the dark bezel. Polygons, so they follow any pose.
     */
    faceOutline() {
      let scr = null; spin.traverse((o) => { if (o.userData.isScreen) scr = o; });
      if (!scr) return null;
      spin.updateMatrixWorld(true);
      const r = canvas.getBoundingClientRect();
      const pos = scr.geometry.attributes.position, v = new THREE.Vector3();
      const pts = [];
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(scr.matrixWorld).project(camera);
        pts.push([(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height]);
      }
      let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
      const BINS = 72, rim = new Array(BINS).fill(null);
      for (const [x, y] of pts) {
        const a = Math.atan2(y - cy, x - cx), b = Math.floor((a + Math.PI) / (2 * Math.PI) * BINS) % BINS, d = Math.hypot(x - cx, y - cy);
        if (!rim[b] || d > rim[b][2]) rim[b] = [x, y, d];
      }
      const inner = rim.filter(Boolean).map(([x, y]) => [x, y]);
      const k = 90.2 / 70.1; // face ring OD over the active screen diameter (README)
      const outer = inner.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
      return { inner, outer, cx, cy };
    },
    resize: size,
    disposed: false,
    dispose() {
      stage.disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose(); // no forceContextLoss(): React may hand the same <canvas> to the next stage
    },
  };
  apply();
  return stage;
}


/**
 * Text that passes over the device's dark bezel turns paper-coloured, only where it overlaps.
 * Each text block gets an aria-hidden twin in paper colour, clipped every frame to the bezel ring
 * (between the screen edge and the ring's outer edge). The original stays underneath, so words over
 * the cream screen or the page keep their normal colour. GSAP tweens follow the twin, because it
 * carries the same data-b attribute as the original.
 */
export function flipTextOverDevice(stage, selector = '.beat') {
  const canvas = stage.renderer.domElement;
  const pairs = [...document.querySelectorAll(selector)].map((el) => {
    const twin = el.cloneNode(true);
    twin.classList.add('flip-twin'); twin.setAttribute('aria-hidden', 'true'); twin.removeAttribute('id');
    twin.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    twin.querySelectorAll('a, button').forEach((n) => n.setAttribute('tabindex', '-1'));
    el.after(twin);
    return { el, twin };
  });
  const poly = (pts, ox, oy) => 'M' + pts.map(([x, y]) => `${(x - ox).toFixed(1)},${(y - oy).toFixed(1)}`).join('L') + 'Z';
  function tick() {
    if (stage.disposed) return;
    requestAnimationFrame(tick);
    let face = null;
    for (const { el, twin } of pairs) {
      const op = +getComputedStyle(el).opacity, vis = getComputedStyle(el).visibility !== 'hidden';
      if (!vis || op < .01) { twin.style.clipPath = 'inset(100%)'; continue; }
      face = face || stage.faceOutline();
      if (!face) return;
      const cr = canvas.getBoundingClientRect(), tr = twin.getBoundingClientRect();
      const ox = tr.left - cr.left, oy = tr.top - cr.top;
      twin.style.clipPath = `path(evenodd, "${poly(face.outer, ox, oy)} ${poly(face.inner, ox, oy)}")`;
    }
  }
  requestAnimationFrame(tick);
}

/**
 * Shell colours that sit with the page (logo tokens). While `caption` is on screen the device cycles through them;
 * a click on a swatch picks one and holds it. Off screen, the device returns to its paper shell.
 */
export function bodyColours(stage, caption) {
  if (!caption) return;
  const css = getComputedStyle(tokenRoot());
  const sw = [...caption.querySelectorAll('.swatch')];
  const col = (b) => css.getPropertyValue(`--${b.dataset.c}`).trim();
  let i = 0, held = false, on = false, timer = 0;
  const pick = (k) => { i = k; sw.forEach((b, j) => b.setAttribute('aria-pressed', j === k)); stage.bodyColor(col(sw[k])); };
  sw.forEach((b, k) => b.addEventListener('click', () => { held = true; pick(k); }));
  (function watch() {
    if (stage.disposed) { clearInterval(timer); return; }
    requestAnimationFrame(watch);
    const vis = getComputedStyle(caption).visibility !== 'hidden' && +getComputedStyle(caption).opacity > .5;
    if (vis && !on) { on = true; held = false; pick(0); clearInterval(timer); timer = setInterval(() => { if (!held) pick((i + 1) % sw.length); }, 2200); }
    if (!vis && on) { on = false; clearInterval(timer); stage.bodyColor(col(sw[0])); }
  })();
}

/**
 * The shell colour at story time t. keys: [[t, token], ...] in time order; between two keys the colour
 * holds, then blends into the next over `blend` units just before it (smoothstep), so changes land on the beats.
 */
export function shellAt(keys, t, blend = .45) {
  const css = getComputedStyle(tokenRoot());
  const col = (k) => new THREE.Color(css.getPropertyValue(`--${k}`).trim());
  let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
  const cur = col(keys[i][1]);
  const next = keys[i + 1];
  if (next && t > next[0] - blend) { let u = (t - (next[0] - blend)) / blend; u = u * u * (3 - 2 * u); cur.lerp(col(next[1]), u); }
  return '#' + cur.getHexString();
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
