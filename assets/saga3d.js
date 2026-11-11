// SAGA shared 3D module (three.js r160). Used by the rider and driver apps.
// Every start* call returns a controller { stop(), ... } and owns its own renderer.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

let carP = null;
export function loadCar() {
  return carP || (carP = import("./saga_one_glb.js").then(m => {
    const bin = atob(m.default), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new GLTFLoader().parseAsync(buf.buffer, "");
  }).then(g => g.scene));
}

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}
function fit(r, cam, canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  const pr = r.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
}
function env(r, scene) { const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); }
function prepCar(src) {
  const pivot = new THREE.Group(), car = src.clone(true);
  car.rotation.y = -Math.PI / 2;                 // model faces +X; pivot faces +Z
  car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  pivot.add(car);
  const wheels = []; car.traverse(o => { if (/^wheel_/.test(o.name)) wheels.push(o); });
  return { pivot, wheels };
}
function kill(r) { try { r.dispose(); r.forceContextLoss(); } catch (e) {} }
const ring = (rIn, rOut, color, op) => { const m = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; return m; };

/* ---------- hero turntable (splash, driver start) ---------- */
export function startHero(canvas, opts = {}) {
  const dark = opts.dark !== false;
  const r = makeRenderer(canvas), scene = new THREE.Scene(); env(r, scene);
  scene.environmentIntensity = dark ? .35 : 1;
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 100); cam.position.set(0, 2.2, 12); cam.lookAt(0, .65, 0);
  const key = new THREE.DirectionalLight(0xffffff, dark ? .6 : 1.4); key.position.set(3, 7, 4); key.castShadow = true; scene.add(key);
  const rimB = new THREE.PointLight(0x2449f0, dark ? 60 : 20, 20); rimB.position.set(-4, 2, -3); scene.add(rimB);
  const rimC = new THREE.PointLight(0x33c6f0, dark ? 40 : 12, 20); rimC.position.set(4, 1.5, -2); scene.add(rimC);
  const sweep = new THREE.PointLight(0xffffff, dark ? 30 : 10, 6); scene.add(sweep);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.ShadowMaterial({ opacity: dark ? .5 : .2 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const g1 = ring(2.9, 2.94, 0x33c6f0, .55), g2 = ring(3.4, 3.42, 0x2449f0, .35); g1.position.y = g2.position.y = .01; scene.add(g1, g2);
  const scan = ring(.1, .16, 0x33c6f0, .8); scan.position.y = .02; scene.add(scan);
  let pivot = null, raf = 0, on = true;
  loadCar().then(src => { if (!on) return; pivot = prepCar(src).pivot; scene.add(pivot); opts.onReady && opts.onReady(); }).catch(() => opts.onReady && opts.onReady());
  const t0 = performance.now();
  const loop = now => {
    if (!on) return; raf = requestAnimationFrame(loop); fit(r, cam, canvas);
    const t = (now - t0) / 1000;
    if (pivot) pivot.rotation.y = .6 + t * (opts.speed || .35);
    sweep.position.set(Math.sin(t * 1.3) * 3.5, 1.2, 2.5);
    const ph = (t % 2.4) / 2.4; scan.scale.setScalar(1 + ph * 30); scan.material.opacity = .7 * (1 - ph);
    g1.rotation.z = t * .2;
    r.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
  return { stop() { on = false; cancelAnimationFrame(raf); kill(r); } };
}

/* ---------- orbit viewer with hotspots ---------- */
export function startViewer(canvas, opts = {}) {
  const r = makeRenderer(canvas), scene = new THREE.Scene(); env(r, scene);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 100); cam.position.set(11, 3.2, 11);
  const ctl = new OrbitControls(cam, canvas); ctl.target.set(0, .75, 0); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.4; ctl.enablePan = false; ctl.minDistance = 9; ctl.maxDistance = 18; ctl.maxPolarAngle = Math.PI / 2.05;
  canvas.addEventListener("pointerdown", () => ctl.autoRotate = false, { once: true });
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(4, 8, 3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0xdfe5f2, .6));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.ShadowMaterial({ opacity: .2 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const d1 = ring(3.3, 3.35, 0x092ec9, .45); d1.position.y = .01; scene.add(d1);
  const hs = (opts.hotspots || []).map(h => ({ ...h, v: new THREE.Vector3(...h.pos) }));
  let raf = 0, on = true;
  loadCar().then(src => { if (!on) return; const { pivot } = prepCar(src); pivot.rotation.y = Math.PI / 2; scene.add(pivot); opts.onReady && opts.onReady(); }).catch(() => opts.onReady && opts.onReady());
  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  const loop = () => {
    if (!on) return; raf = requestAnimationFrame(loop); fit(r, cam, canvas); ctl.update(); r.render(scene, cam);
    if (opts.onProject && hs.length) {
      cam.getWorldDirection(camDir);
      opts.onProject(hs.map(h => { tmp.copy(h.v).project(cam); const facing = h.v.clone().sub(cam.position).normalize().dot(camDir) > 0; const side = h.n ? new THREE.Vector3(...h.n).dot(cam.position.clone().sub(h.v).normalize()) > -.15 : true; return { id: h.id, x: (tmp.x + 1) / 2 * canvas.clientWidth, y: (1 - tmp.y) / 2 * canvas.clientHeight, vis: facing && side }; }));
    }
  };
  raf = requestAnimationFrame(loop);
  return { stop() { on = false; cancelAnimationFrame(raf); ctl.dispose(); kill(r); } };
}

/* ---------- live route through a 3D city ---------- */
const DEFAULT_ROUTE = [[-160, 120], [-120, 120], [-120, 40], [-40, 40], [-40, -40], [80, -40], [80, -120], [150, -120]];
export function startRide(canvas, hooks = {}, opts = {}) {
  const dark = opts.theme === "dark";
  const C = dark
    ? { bg: 0x07080c, ground: 0x0d1018, road: 0x1a1f2c, lane: 0x33c6f0, bld: 0x151a26, bldAlt: 0x1b2440, park: 0x0f2a20, sea: 0x0a1640, route: 0x2f6bff, under: 0x262c3a, hemi: [0x8090c0, 0x0a0c12, .5], sun: .7 }
    : { bg: 0xe9edf4, ground: 0xe4e9f1, road: 0xffffff, lane: 0xd4dbe8, bld: 0xffffff, bldAlt: 0xdde5ff, park: 0xcdebd8, sea: 0xbcd3fb, route: 0x2449f0, under: 0xc9d2e6, hemi: [0xffffff, 0xcfd8ea, .9], sun: 1.4 };
  const r = makeRenderer(canvas), scene = new THREE.Scene(); env(r, scene);
  if (dark) scene.environmentIntensity = .25;
  scene.background = new THREE.Color(C.bg); scene.fog = new THREE.Fog(C.bg, 140, 340);
  const cam = new THREE.PerspectiveCamera(48, 1, .5, 900); cam.position.set(-180, 70, 160);
  scene.add(new THREE.HemisphereLight(...C.hemi));
  const sun = new THREE.DirectionalLight(0xffffff, C.sun); sun.position.set(60, 120, 40); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: C.ground, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 1000), new THREE.MeshStandardMaterial({ color: C.sea, roughness: .3, metalness: .1 })); sea.rotation.x = -Math.PI / 2; sea.position.set(380, .05, 0); scene.add(sea);
  const roadMat = new THREE.MeshStandardMaterial({ color: C.road, roughness: .9 });
  const laneMat = new THREE.MeshBasicMaterial({ color: C.lane, transparent: true, opacity: dark ? .5 : .8 });
  const G = 40, N = 5, L = 2 * N * G + 40;
  for (let i = -N; i <= N; i++) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(10, L), roadMat); a.rotation.x = -Math.PI / 2; a.position.set(i * G, .06, 0); a.receiveShadow = true; scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(L, 10), roadMat); b.rotation.x = -Math.PI / 2; b.position.set(0, .06, i * G); b.receiveShadow = true; scene.add(b);
    const la = new THREE.Mesh(new THREE.PlaneGeometry(.25, L), laneMat); la.rotation.x = -Math.PI / 2; la.position.set(i * G, .08, 0); scene.add(la);
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(L, .25), laneMat); lb.rotation.x = -Math.PI / 2; lb.position.set(0, .08, i * G); scene.add(lb);
  }
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, .5, 0);
  const bmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .75, emissive: dark ? 0x0a1230 : 0x000000, emissiveIntensity: dark ? .6 : 0 });
  const inst = new THREE.InstancedMesh(box, bmat, 600); inst.castShadow = true; inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color(); let n = 0, seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = -N; i < N; i++) for (let j = -N; j < N; j++) {
    const cx = i * G + G / 2, cz = j * G + G / 2; if (cx > 165) continue;
    const park = rnd() < .1;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      if (n >= 600) break;
      const h = park ? .6 : 4 + Math.pow(rnd(), 2.2) * (cx > 100 ? 14 : 26);
      m4.makeScale(12, h, 12).setPosition(cx - 7 + a * 14, 0, cz - 7 + b * 14);
      inst.setMatrixAt(n, m4); inst.setColorAt(n, col.set(park ? C.park : (rnd() < .12 ? C.bldAlt : C.bld))); n++;
    }
  }
  inst.count = n; scene.add(inst);

  const raw = opts.route || DEFAULT_ROUTE, pts = [];
  raw.forEach((p, i) => {
    const v = new THREE.Vector3(p[0], .4, p[1]);
    if (i === 0 || i === raw.length - 1) { pts.push(v); return; }
    const a = new THREE.Vector3(raw[i - 1][0], .4, raw[i - 1][1]), b = new THREE.Vector3(raw[i + 1][0], .4, raw[i + 1][1]);
    pts.push(v.clone().add(a.clone().sub(v).setLength(9)), v.clone().add(b.clone().sub(v).setLength(9)));
  });
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", .5);
  const len = curve.getLength(), TUB = 600, RAD = 8;
  const under = new THREE.Mesh(new THREE.TubeGeometry(curve, TUB, 1.1, RAD), new THREE.MeshBasicMaterial({ color: C.under })); under.scale.y = .25; scene.add(under);
  const tubeG = new THREE.TubeGeometry(curve, TUB, 1.25, RAD);
  const tube = new THREE.Mesh(tubeG, new THREE.MeshBasicMaterial({ color: C.route })); tube.scale.y = .3; scene.add(tube);
  // energy pulses travelling along the route
  const pulses = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 8), new THREE.MeshBasicMaterial({ color: 0x33c6f0, transparent: true, opacity: .85 })); scene.add(s); return s; });
  const end = curve.getPoint(1);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 14, 24), new THREE.MeshStandardMaterial({ color: dark ? 0xffffff : 0x0a0d18 })); pin.position.set(end.x, 7, end.z); scene.add(pin);
  const pinTop = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 16), new THREE.MeshStandardMaterial({ color: 0x092ec9, emissive: 0x2449f0, emissiveIntensity: dark ? 1.2 : .4 })); pinTop.position.set(end.x, 15, end.z); scene.add(pinTop);
  const destRing = ring(2, 2.6, 0x2449f0, .5); destRing.position.set(end.x, .2, end.z); scene.add(destRing);
  const pulse = ring(.92, 1, 0x33c6f0, .6); scene.add(pulse);
  const scanCone = new THREE.Mesh(new THREE.CircleGeometry(14, 48, -0.45, 0.9), new THREE.MeshBasicMaterial({ color: 0x33c6f0, transparent: true, opacity: dark ? .14 : .1, side: THREE.DoubleSide, depthWrite: false })); scanCone.rotation.x = -Math.PI / 2; scene.add(scanCone);

  let car = null, wheels = [], t = 0, last = performance.now(), arrived = false, raf = 0, on = true, camMode = opts.cam || "Follow";
  loadCar().then(src => { if (!on) return; const p = prepCar(src); car = p.pivot; wheels = p.wheels; scene.add(car); hooks.ready && hooks.ready(); }).catch(() => hooks.ready && hooks.ready());
  const tan = new THREE.Vector3(), camPos = new THREE.Vector3(), look = new THREE.Vector3();
  const speedK = opts.speed || 1.6;
  const loop = now => {
    if (!on) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    fit(r, cam, canvas);
    if (car && !arrived) {
      const a = curve.getTangentAt(Math.min(t, 1)), b = curve.getTangentAt(Math.min(t + .02, 1));
      const straight = THREE.MathUtils.clamp((a.dot(b) - .7) / .3, 0, 1);
      const speed = 6 + 10 * straight;
      t = Math.min(1, t + speed * dt * speedK / len);
      const p = curve.getPointAt(t); tan.copy(curve.getTangentAt(t));
      car.position.set(p.x, 0, p.z); car.lookAt(p.x + tan.x, 0, p.z + tan.z);
      wheels.forEach(w => w.rotation.z -= speed * dt * speedK / .39);
      sun.position.set(p.x + 40, 120, p.z + 30); sun.target.position.set(p.x, 0, p.z);
      pulse.position.set(p.x, .25, p.z);
      scanCone.position.set(p.x, .3, p.z); scanCone.rotation.z = Math.atan2(tan.x, tan.z) - Math.PI / 2 + Math.sin(now / 500) * .25;
      tubeG.setDrawRange(Math.floor(t * TUB) * RAD * 6, Infinity);
      hooks.progress && hooks.progress(t, 18 + 30 * straight);
      if (t >= 1) { arrived = true; setTimeout(() => hooks.arrive && hooks.arrive(), 900); }
      if (camMode === "Follow") { camPos.set(p.x - tan.x * 24 - tan.z * 9, 22, p.z - tan.z * 24 + tan.x * 9); look.set(p.x + tan.x * 4, -3, p.z + tan.z * 4); }
      else { camPos.set(p.x - 30, 120, p.z + 60); look.set(p.x + 10, 0, p.z - 10); }
      cam.position.lerp(camPos, 1 - Math.pow(.02, dt)); cam.lookAt(look);
    }
    pulses.forEach((s, i) => { const u = t + ((now / 4000 + i / pulses.length) % 1) * (1 - t); const q = curve.getPointAt(Math.min(u, 1)); s.position.set(q.x, .9, q.z); s.visible = u < .995; });
    const ph = (now / 1600) % 1; pulse.scale.setScalar(2 + ph * 9); pulse.material.opacity = .55 * (1 - ph);
    const ph2 = (now / 1200) % 1; destRing.scale.setScalar(1 + ph2 * 3); destRing.material.opacity = .5 * (1 - ph2); pinTop.position.y = 15 + Math.sin(now / 400) * .8;
    r.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    stop() { on = false; cancelAnimationFrame(raf); kill(r); },
    toggleCam() { camMode = camMode === "Follow" ? "Top" : "Follow"; return camMode; }
  };
}

/* ---------- live service-card objects (one shared renderer) ---------- */
let modP = null;
function loadModules() {
  return modP || (modP = import("./saga_modules_glb.js").then(m => {
    const bin = atob(m.default), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new GLTFLoader().parseAsync(buf.buffer, "");
  }).then(g => g.scene));
}
const B2T = (x, y, z) => new THREE.Vector3(x, z, -y);        // Blender -> three axes
const VIEWS = {
  fly:      { pos: B2T(4.8, -6.2, 4.2),  tgt: B2T(-0.6, 0.2, -0.1), lens: 38 },
  loop:     { pos: B2T(0, -6.4, 1.4),    tgt: B2T(0, 0, -0.1),      lens: 52 },
  voyage:   { pos: B2T(-13, -14, 5.6),   tgt: B2T(0.5, 1, 0.6),     lens: 30 },
  tales:    { pos: B2T(0, -9, 2.2),      tgt: B2T(0.6, 6, 2.4),     lens: 34 },
  business: { pos: B2T(8.5, -8.5, 7.2),  tgt: B2T(0, 0, 0.9),       lens: 44 },
};
export function startCards(items, opts = {}) {
  const glc = document.createElement("canvas");
  const r = new THREE.WebGLRenderer({ canvas: glc, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const pm = new THREE.PMREMGenerator(r), envTex = pm.fromScene(new RoomEnvironment(), .04).texture;
  const cards = items.map(it => ({ ...it, ctx: it.canvas.getContext("2d"), vis: true, yaw: 0, vel: 0, tilt: 0, drag: null, state: {}, t0: performance.now() }));
  const io = new IntersectionObserver(es => es.forEach(e => { const c = cards.find(c => c.canvas === e.target); if (c) c.vis = e.isIntersecting; }), { threshold: .05 });
  cards.forEach(c => {
    io.observe(c.canvas);
    c.canvas.addEventListener("pointerdown", e => { c.drag = { x: e.clientX, y: e.clientY }; c.canvas.setPointerCapture(e.pointerId); });
    c.canvas.addEventListener("pointermove", e => { if (!c.drag) return; const dx = e.clientX - c.drag.x; c.vel = dx * .012; c.yaw += c.vel; c.tilt = THREE.MathUtils.clamp((e.clientY - c.drag.y) * .004, -.35, .35); c.drag.x = e.clientX; });
    const up = () => { c.drag = null; }; c.canvas.addEventListener("pointerup", up); c.canvas.addEventListener("pointercancel", up);
  });
  let on = true, raf = 0, last = 0;
  loadModules().then(root => {
    if (!on) return;
    cards.forEach(c => {
      const scene = new THREE.Scene(); scene.environment = envTex;
      scene.add(new THREE.HemisphereLight(0xffffff, 0xaab4cc, 1.1));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 8, 5); scene.add(sun);
      const src = root.getObjectByName("mod_" + c.mod); if (!src) return;
      const obj = src.clone(true);
      obj.traverse(o => { if (o.isMesh) o.material = o.material.clone(); });
      const box = new THREE.Box3().setFromObject(obj), ctr = box.getCenter(new THREE.Vector3());
      const pivot = new THREE.Group(); pivot.position.copy(ctr); obj.position.sub(ctr); pivot.add(obj); scene.add(pivot);
      const v = VIEWS[c.mod];
      const fov = 34, cam = new THREE.PerspectiveCamera(fov, 1, .1, 400);
      const sph = new THREE.Box3().setFromObject(pivot).getBoundingSphere(new THREE.Sphere());
      const dir = v.pos.clone().sub(v.tgt).normalize();
      const dist = sph.radius / Math.sin(THREE.MathUtils.degToRad(fov / 2)) * (c.mod === "voyage" || c.mod === "tales" ? .62 : .82);
      cam.position.copy(sph.center).addScaledVector(dir, dist); cam.lookAt(sph.center);
      v.pos = cam.position.clone(); v.tgt = sph.center.clone();
      Object.assign(c, { scene, cam, pivot, obj });
      setupModule(c);
      if (c.apply) c.apply(c.state);
    });
    opts.onReady && opts.onReady();
  }).catch(err => opts.onError && opts.onError(err));
  function setupModule(c) {
    const meshes = []; c.obj.traverse(o => { if (o.isMesh) meshes.push(o); });
    const named = s => meshes.filter(m => m.name.toLowerCase().includes(s));
    const wy = o => o.getWorldPosition(new THREE.Vector3()).y;
    if (c.mod === "loop") {
      const days = named("day").sort((a, b) => wy(a) - wy(b));
      const lit = new THREE.MeshStandardMaterial({ color: 0x092ec9, emissive: 0x2449f0, emissiveIntensity: .9, roughness: .3 });
      const off = days.length ? days[0].material.clone() : null;
      c.apply = s => (s.days || [1, 1, 1, 1, 1, 0, 0]).forEach((d, i) => { if (days[i]) days[i].material = d ? lit : off; });
      c.anim = t => { c.pivot.rotation.z = Math.sin(t * .6) * .05; };
    }
    if (c.mod === "business") {
      const top = m => new THREE.Box3().setFromObject(m).max.y;
      const towers = named("tower").sort((a, b) => top(b) - top(a));
      const pale = new THREE.MeshStandardMaterial({ color: 0xd6dcea, roughness: .35, metalness: .15 });
      const base = towers.map(() => pale);
      const lit = new THREE.MeshStandardMaterial({ color: 0x2449f0, emissive: 0x092ec9, emissiveIntensity: .6, roughness: .25, metalness: .2 });
      c.apply = s => { const n = Math.min(towers.length, Math.ceil((s.people || 12) / 3)); towers.forEach((t, i) => { t.material = i < n ? lit : base[i]; }); };
    }
    if (c.mod === "voyage") {
      named("terrain").forEach(t => {
        t.material = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: .75, metalness: .05, flatShading: true });
        const wire = new THREE.Mesh(t.geometry, new THREE.MeshBasicMaterial({ color: 0x33c6f0, wireframe: true, transparent: true, opacity: .16 }));
        wire.position.copy(t.position); wire.quaternion.copy(t.quaternion); wire.scale.copy(t.scale); t.parent.add(wire);
      });
      named("road").forEach(rd => { rd.material = new THREE.MeshBasicMaterial({ color: 0x33c6f0 }); });
      const road = named("road")[0];
      if (road) {
        const pos = road.geometry.attributes.position, wp = []; road.updateWorldMatrix(true, false);
        const step = Math.max(1, Math.floor(pos.count / 500));
        for (let i = 0; i < pos.count; i += step) wp.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(road.matrixWorld));
        wp.sort((a, b) => a.x - b.x);
        const pts = []; const st = Math.max(1, Math.floor(wp.length / 60));
        for (let i = 0; i < wp.length; i += st) pts.push(c.obj.worldToLocal(wp[i].clone().add(new THREE.Vector3(0, .3, 0))));
        const curve = new THREE.CatmullRomCurve3(pts);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(.35, 24, 12), new THREE.MeshBasicMaterial({ color: 0x33c6f0 }));
        const halo = new THREE.Mesh(new THREE.SphereGeometry(.8, 24, 12), new THREE.MeshBasicMaterial({ color: 0x33c6f0, transparent: true, opacity: .25 }));
        c.obj.add(dot, halo);
        c.apply = s => { c.limit = Math.max(.12, Math.min(1, (s.km || 350) / 500)); };
        c.anim = t => { const u = ((t * .12) % 1) * (c.limit || .7); const p = curve.getPointAt(u); dot.position.copy(p); halo.position.copy(p); halo.scale.setScalar(1 + Math.sin(t * 6) * .25); };
      }
    }
    if (c.mod === "tales") {
      const sunM = named("sun")[0];
      const looks = [{ y: 0, col: 0xfff1e0 }, { y: -1.4, col: 0xffb36b }, { y: -2.4, col: 0xff7a4d }];
      const base = sunM ? sunM.position.clone() : null;
      c.apply = s => { const L = looks[s.trip || 0]; if (sunM) { c.sunTarget = base.clone().add(new THREE.Vector3(0, L.y, 0)); sunM.material.emissive = new THREE.Color(L.col); sunM.material.emissiveIntensity = 2; } };
      c.anim = (t, dt) => { if (sunM && c.sunTarget) sunM.position.lerp(c.sunTarget, 1 - Math.pow(.05, dt)); c.cam.position.x = VIEWS.tales.pos.x + THREE.MathUtils.clamp(c.yaw, -1.5, 1.5) * 2.5; c.cam.lookAt(VIEWS.tales.tgt); };
      c.noYaw = true;
    }
    if (c.mod === "fly") {
      const y0 = c.pivot.position.y;
      c.anim = t => { c.pivot.position.y = y0 + Math.sin(t * 1.6) * .18; c.pivot.rotation.x = Math.sin(t * .9) * .08 + c.tilt; c.pivot.rotation.z = Math.sin(t * .7) * .06 - c.vel * 1.5; };
    }
  }
  const loop = now => {
    if (!on) return; raf = requestAnimationFrame(loop);
    if (now - last < 30) return; const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    cards.forEach(c => {
      if (!c.vis || !c.scene) return;
      const w = c.canvas.clientWidth, h = c.canvas.clientHeight; if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio, 2), W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (c.canvas.width !== W || c.canvas.height !== H) { c.canvas.width = W; c.canvas.height = H; }
      if (glc.width !== W || glc.height !== H) r.setSize(W, H, false);
      c.cam.aspect = W / H; c.cam.updateProjectionMatrix();
      const t = (now - c.t0) / 1000;
      const auto = (c.mod === "voyage" || c.mod === "business") ? .004 : 0;
      if (!c.drag) { c.vel *= .94; c.yaw += c.vel + auto; c.tilt *= .9; if (!auto && !c.noYaw) c.yaw *= .985; }
      if (!c.noYaw) c.pivot.rotation.y = c.yaw;
      if (c.anim) c.anim(t, dt);
      r.render(c.scene, c.cam);
      c.ctx.clearRect(0, 0, W, H); c.ctx.drawImage(glc, 0, 0, W, H);
    });
  };
  raf = requestAnimationFrame(loop);
  return {
    set(mod, state) { const c = cards.find(c => c.mod === mod); if (!c) return; Object.assign(c.state, state); if (c.apply) c.apply(c.state); c.vel += .05; },
    stop() { on = false; cancelAnimationFrame(raf); io.disconnect(); kill(r); }
  };
}
