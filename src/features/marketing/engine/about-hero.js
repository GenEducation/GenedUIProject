// The About hero: "About us" as chunky 3D paper letters (public/zoovi/about/about-us.glb, made in Blender), the o being
// Zoovi's round screen with the live face from deskbot.js. Browser only. createAboutHero() throws if WebGL or the model
// isn't available; the page then keeps its CSS lettering.
//
// Model contract (mesh or object names): Letter_* (one per letter, origin at its base), FaceScreen (the o's screen),
// Question, Base. Anything else rides along with the whole model. The o is not drawn from the lettering model: the real
// Zoovi device (public/zoovi/zoovi.glb, the same model as the home page) stands in its place, turned a little to the
// left, with the live face on its screen. A Sprout, if the model still has one, is left out.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Face, PALETTE, loadDeskbot } from './deskbot.js';

const URL_GLB = '/zoovi/about/about-us.glb';

export async function createAboutHero(canvas, { url = URL_GLB, motion = true, faceRotation = 0, faceFlipX = false } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);   // throws when missing: the caller keeps the CSS letters

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const phone = matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .05, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(PALETTE.paper), 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(2, 4, 3.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: .5, far: 12 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, .7); rim.position.set(-3, 1.5, -2); scene.add(rim);

  // ---- the model, centred and scaled to 2.4 units wide ----
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const s = 2.4 / Math.max(size.x, 1e-6);
  model.position.set(-centre.x, -box.min.y, -centre.z);
  const holder = new THREE.Group(); holder.add(model); holder.scale.setScalar(s); holder.position.y = -size.y * s / 2;
  const tilt = new THREE.Group(); tilt.add(holder); scene.add(tilt);

  // ---- the face on the o ----
  const face = new Face(512);
  face.rotation = faceRotation; face.flipX = faceFlipX;
  const faceTex = new THREE.CanvasTexture(face.canvas);
  faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.flipY = false; faceTex.anisotropy = 4;
  let screenMesh = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = /Base/i.test(o.name);
    if (/FaceScreen/i.test(o.name) || /FaceScreen/i.test(o.parent?.name || '')) screenMesh = o;
  });

  // ---- the pieces that move on their own: each letter, the question mark and the sprout, left to right ----
  const named = (re) => { const out = []; model.traverse((o) => { if (re.test(o.name) && !out.some((p) => isAncestor(p, o))) out.push(o); }); return out; };
  const isAncestor = (a, o) => { for (let p = o.parent; p; p = p.parent) if (p === a) return true; return false; };
  model.traverse((o) => { if (/^Sprout/i.test(o.name)) o.visible = false; });
  const pieces = named(/^(Letter_|Question)/);
  // the screen travels with its letter when the model keeps them apart
  const ring = pieces.find((p) => /^Letter_o/i.test(p.name));
  const screenRoot = screenMesh && !pieces.some((p) => p === screenMesh || isAncestor(p, screenMesh)) ? topBelow(model, screenMesh) : null;
  if (ring && screenRoot) ring.attach(screenRoot);

  // ---- the real device in place of the o ----
  if (ring) {
    scene.updateMatrixWorld(true);
    const ob = new THREE.Box3().setFromObject(ring);
    const oSize = ob.getSize(new THREE.Vector3()), oCentre = ob.getCenter(new THREE.Vector3());
    // the lettering's own o (ring + flat screen) steps aside. Its surfaces get an invisible material rather than
    // visible = false: the o may be a single mesh, and hiding the object would hide the device attached to it below
    // (and place() sets each piece's visibility every frame). A fresh material, so letters sharing a colour stay drawn.
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    ring.traverse((o) => { if (o.isMesh) { o.material = hidden; o.castShadow = false; } });
    const device = await loadDeskbot('/zoovi/zoovi.glb', faceTex);
    // as tall as the lowercase letters and a touch more, standing on the base where the o stood
    const k = oSize.y * 1.32;
    device.scale.setScalar(k);
    device.rotation.set(.06, -.42, 0);   // turned a little to the left
    device.position.set(oCentre.x, ob.min.y + device.userData.halfHeight * k, oCentre.z);
    device.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(device);
    ring.attach(device);   // keeps its place, and now drops, leans and parts with the letter
  }
  const wx = (o) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).x;
  pieces.sort((a, b) => wx(a) - wx(b));
  const rest = pieces.map((p) => ({ o: p, y: p.position.y, rz: p.rotation.z, rx: p.rotation.x }));
  // the letters' rise when they part on scroll, in model units
  const unit = size.y;

  // ---- fit: the whole word in view at any aspect ----
  function fitDistance(aspect) {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2, h = Math.atan(Math.tan(v) * aspect);
    // the word is long and low, so it fits on width with a little air; the camera sits just in front of it
    const halfW = 1.2 * 1.04, halfH = size.y * s / 2 * 1.5;
    return Math.max(halfW / Math.tan(h), halfH / Math.tan(v)) + size.z * s / 2;
  }
  let dist = 6;
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    dist = fitDistance(camera.aspect);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  // ---- state the page drives ----
  const state = { intro: motion ? 0 : 1, part: 0, px: 0, py: 0, tx: 0, ty: 0 };
  const onPointer = (e) => { state.tx = (e.clientX / innerWidth) * 2 - 1; state.ty = (e.clientY / innerHeight) * 2 - 1; };
  if (motion) addEventListener('pointermove', onPointer, { passive: true });
  face.set(motion ? 'sleepy' : 'happy');

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const bounce = (t) => { const c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };   // back.out
  function place() {
    const n = rest.length;
    rest.forEach((r, i) => {
      // intro: each piece drops in on its own beat
      const t0 = i / Math.max(1, n) * .55, k = Math.min(1, Math.max(0, (state.intro - t0) / .45));
      const drop = (1 - bounce(k)) * unit * 1.6;
      // scroll: they part and float up, alternately leaning
      const lift = state.part * unit * (.5 + .9 * ((i * 37) % 5) / 5);
      r.o.position.y = r.y + drop + lift;
      r.o.rotation.z = r.rz + (1 - ease(k)) * (i % 2 ? .5 : -.5) + state.part * (i % 2 ? .35 : -.35);
      r.o.rotation.x = r.rx - state.part * .25;
      r.o.visible = k > 0;
    });
  }

  // Compile every material (letters, device, shadows) and upload the face before the intro. Drawn lazily, each piece's
  // first appearance would freeze the page for a moment mid drop-in. Every piece is still visible here and the canvas
  // is still transparent (the page adds .gl after this returns), so this warm-up frame is never seen.
  camera.position.set(0, dist * .17, dist); camera.lookAt(0, -.02, 0);
  face.update(0); faceTex.needsUpdate = true;
  try { await renderer.compileAsync(scene, camera); } catch { /* compiled on the first render instead */ }
  renderer.render(scene, camera);

  let visible = true, last = performance.now(), raf = 0, landed = !motion;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    if (motion) {
      if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / 1.6);
      if (!landed && state.intro >= .85) { landed = true; face.set('happy'); }
      else if (!landed && state.intro > .25 && face.state === 'sleepy') face.set('surprised');
      const k = 1 - Math.exp(-dt * 4);
      state.px += (state.tx - state.px) * k; state.py += (state.ty - state.py) * k;
      face.tgt.lookX = state.px * .9; face.tgt.lookY = state.py * .7;
    }
    tilt.rotation.y = -.22 + state.px * .28;
    tilt.rotation.x = .05 + state.py * .08;
    place();
    camera.position.set(0, dist * .17, dist); camera.lookAt(0, -.02, 0);
    face.update(dt); faceTex.needsUpdate = true;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    /** 0..1 as the hero scrolls away: the letters part and float up. */
    setPart(p) { state.part = Math.max(0, Math.min(1, p)); },
    /** A face state from deskbot.js (idle, happy, thinking…). */
    setFace(name) { face.set(name); },
    /** Start with every letter already landed (the page's CSS letters have already played the drop-in). */
    skipIntro() { state.intro = 1; landed = true; face.set('happy'); },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      removeEventListener('pointermove', onPointer);
      scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose();
    },
  };
}

/** The ancestor of `o` that sits directly under `root`. */
function topBelow(root, o) {
  let n = o;
  while (n.parent && n.parent !== root) n = n.parent;
  return n;
}
