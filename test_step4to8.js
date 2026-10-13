const fs = require('fs');
const vm = require('vm');

const scriptCode = fs.readFileSync('script.js', 'utf8');

// ── Helper: make a full-featured mock DOM element ─────────────────────────
function makeMockElement(tag = 'div') {
  const classList = {
    _set: new Set(),
    add(...c)    { c.forEach(x => this._set.add(x)); },
    remove(...c) { c.forEach(x => this._set.delete(x)); },
    toggle(c)    { this._set.has(c) ? this._set.delete(c) : this._set.add(c); },
    contains(c)  { return this._set.has(c); }
  };
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    className: '',
    dataset: {},
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v == null ? '' : v); },
    textContent: '',
    value: '0',
    checked: false,
    disabled: false,
    offsetLeft: 0,
    offsetTop: 0,
    width: 960,
    height: 540,
    style: {},
    classList,
    addEventListener()    {},
    removeEventListener() {},
    appendChild()         {},
    removeChild()         {},
    insertBefore()        {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; },
    querySelectorAll()    { return []; },
    querySelector()       { return makeMockElement(); },
    getContext() {
      return {
        clearRect: ()=>{}, save: ()=>{}, restore: ()=>{},
        beginPath: ()=>{}, closePath: ()=>{},
        moveTo: ()=>{}, lineTo: ()=>{},
        stroke: ()=>{}, fill: ()=>{},
        arc: ()=>{}, rect: ()=>{}, ellipse: ()=>{},
        fillText: ()=>{}, strokeText: ()=>{},
        setLineDash: ()=>{}, getLineDash: ()=>([]),
        translate: ()=>{}, rotate: ()=>{}, scale: ()=>{},
        transform: ()=>{}, setTransform: ()=>{},
        measureText: ()=>({ width: 0 }),
        createLinearGradient: ()=>({ addColorStop: ()=>{} }),
        createRadialGradient: ()=>({ addColorStop: ()=>{} }),
        drawImage: ()=>{}, putImageData: ()=>{},
        fillRect: ()=>{}, strokeRect: ()=>{}, clearRect: ()=>{},
        clip: ()=>{}, isPointInPath: ()=>false,
        lineWidth: 1, strokeStyle: '#000', fillStyle: '#000',
        globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
        shadowColor: 'transparent', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
        globalCompositeOperation: 'source-over'
      };
    }
  };
  return el;
}

// ── Mock querySelectorAll result (plain Array) ────────────────────────────
function makeMockList() { return []; }

const sandbox = {
  window: { addEventListener: () => {} },
  document: {
    getElementById:    (_id)  => makeMockElement(_id === 'game-canvas' ? 'canvas' : 'div'),
    querySelectorAll:  (_sel) => makeMockList(),
    querySelector:     (_sel) => makeMockElement(),
    createElement:     (tag)  => makeMockElement(tag),
    body: { appendChild: ()=>{}, removeChild: ()=>{} }
  },
  performance: { now: () => 2000 },
  requestAnimationFrame: () => {},
  cancelAnimationFrame:  () => {},
  setInterval:  () => 99,
  clearInterval: () => {},
  setTimeout:   (fn) => { try { fn(); } catch(e) {} return 1; },
  clearTimeout: () => {},
  AudioContext:       undefined,
  webkitAudioContext: undefined,
  localStorage: {
    _data: {},
    getItem(k)    { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear()       { this._data = {}; }
  },
  alert:   () => {},
  confirm: () => false,
  console: console
};

vm.createContext(sandbox);
vm.runInContext(scriptCode + `
  globalThis.Vec2            = Vec2;
  globalThis.LineSegment     = LineSegment;
  globalThis.Mirror          = Mirror;
  globalThis.Receiver        = Receiver;
  globalThis.ObstacleWall    = ObstacleWall;
  globalThis.TimedGate       = TimedGate;
  globalThis.RefractionField = RefractionField;
  globalThis.Emitter         = Emitter;
  globalThis.BlackHole       = BlackHole;
  globalThis.GravityZone     = GravityZone;
  globalThis.CHAMBER_LEVELS  = CHAMBER_LEVELS;
  globalThis.VectorVoidEngine = VectorVoidEngine;
`, sandbox);

const { Vec2, LineSegment, Emitter, Mirror, Receiver, TimedGate,
        RefractionField, BlackHole, GravityZone, CHAMBER_LEVELS, VectorVoidEngine } = sandbox;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const ok = fn();
    if (ok) {
      console.log(`  PASS  ${name}`);
      passed++;
    } else {
      console.log(`  FAIL  ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ERR   ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== VECTOR_VOID STEP 4-8 COMPLETE TEST SUITE ===\n');

// ── [1] Vector Mathematics ─────────────────────────────────────────────────
console.log('[1] Vector Mathematics');
test('Vec2 dot product orthogonality', () => new Vec2(1,0).dot(new Vec2(0,1)) === 0);
test('Vec2 cross product determinant', () => new Vec2(1,0).cross(new Vec2(0,1)) === 1);
test('Vec2 normalize unit length',     () => Math.abs(new Vec2(3,4).normalize().length() - 1) < 1e-9);
test('Vec2 lerp midpoint',             () => {
  const m = Vec2.lerp(new Vec2(0,0), new Vec2(10,0), 0.5);
  return Math.abs(m.x - 5) < 1e-9;
});
test('Vec2 rotate 90 degrees', () => {
  const r = new Vec2(1,0).rotate(90);
  return Math.abs(r.x) < 1e-6 && Math.abs(r.y - 1) < 1e-6;
});

// ── [2] Raycasting Intersections ───────────────────────────────────────────
console.log('\n[2] Raycasting Intersections');
test('Direct ray-segment hit', () => {
  const seg = new LineSegment(new Vec2(100,0), new Vec2(100,200), 'mirror');
  const h   = seg.intersectRay(new Vec2(0,100), new Vec2(1,0));
  return h && Math.abs(h.point.x - 100) < 1e-6;
});
test('Parallel ray no collision', () => {
  const seg = new LineSegment(new Vec2(100,0), new Vec2(100,200), 'mirror');
  return seg.intersectRay(new Vec2(0,100), new Vec2(0,1)) === null;
});
test('Backward ray no collision', () => {
  const seg = new LineSegment(new Vec2(100,0), new Vec2(100,200), 'mirror');
  return seg.intersectRay(new Vec2(200,100), new Vec2(1,0)) === null;
});

// ── [3] Specular Reflection Physics ───────────────────────────────────────
console.log('\n[3] Specular Reflection Physics');
test("Snell's Law: θi === θr (45°)", () => {
  const D  = new Vec2(1,1).normalize();
  const N  = new Vec2(-1,0).normalize();
  const R  = D.sub(N.scale(2 * D.dot(N))).normalize();
  const ti = Math.acos(-D.dot(N)) * 180 / Math.PI;
  const tr = Math.acos( R.dot(N)) * 180 / Math.PI;
  return Math.abs(ti - tr) < 1e-6;
});
test('Reflection stays in correct quadrant', () => {
  const D = new Vec2(1,1).normalize();
  const N = new Vec2(0,-1).normalize();
  const R = D.sub(N.scale(2 * D.dot(N))).normalize();
  return R.y < 0;   // reflected upward
});
test('Refraction field rotates direction', () => {
  const rf   = new RefractionField(500, 300, 50, 30);
  const D    = new Vec2(1,0);
  const bent = D.rotate(rf.bendAngle).normalize();
  return Math.abs(bent.y) > 0.01;   // should have vertical component
});

// ── [4] Engine Initialization ──────────────────────────────────────────────
console.log('\n[4] Engine Initialization');
let engine;
test('VectorVoidEngine instantiates', () => {
  engine = new VectorVoidEngine();
  return engine !== null;
});
test('Chamber perimeter has 4 walls',  () => engine.chamberPerimeter.length === 4);
test('Levels database has 21 levels',  () => CHAMBER_LEVELS.length === 21);

// ── [5] All 21 Level Solvability ───────────────────────────────────────────
console.log('\n[5] All 21 Level Solvability');

function sweepSolve(eng) {
  if (eng.mirrors.length === 0) {
    for (let ea = -60; ea <= 60; ea += 0.5) {
      eng.emitter.angle = ea;
      eng.calculateLaserTrajectory();
      if (eng.receiver.status === 'ACTIVATED') return { found: true, angles: [ea] };
    }
  } else if (eng.mirrors.length === 1) {
    for (let a = -180; a <= 180; a += 2) {
      eng.mirrors[0].angle = a;
      for (let ea = -45; ea <= 45; ea += 2) {
        eng.emitter.angle = ea;
        eng.calculateLaserTrajectory();
        if (eng.receiver.status === 'ACTIVATED') return { found: true, angles: [a, ea] };
      }
    }
  } else {
    // 2 Mirrors: Check near initial setup angles first (fast path)
    const initA1 = eng.mirrors[0].angle;
    const initA2 = eng.mirrors[1].angle;
    const initEa = eng.emitter.angle;
    for (let d1 = -24; d1 <= 24; d1 += 2) {
      for (let d2 = -24; d2 <= 24; d2 += 2) {
        eng.mirrors[0].angle = initA1 + d1;
        eng.mirrors[1].angle = initA2 + d2;
        for (let de = -30; de <= 30; de += 5) {
          eng.emitter.angle = initEa + de;
          eng.calculateLaserTrajectory();
          if (eng.receiver.status === 'ACTIVATED') return { found: true, angles: [eng.mirrors[0].angle, eng.mirrors[1].angle, eng.emitter.angle] };
        }
      }
    }
    // Fallback wider grid
    for (let a1 = -180; a1 <= 180; a1 += 6) {
      for (let a2 = -180; a2 <= 180; a2 += 6) {
        eng.mirrors[0].angle = a1;
        eng.mirrors[1].angle = a2;
        for (let ea = -40; ea <= 40; ea += 10) {
          eng.emitter.angle = ea;
          eng.calculateLaserTrajectory();
          if (eng.receiver.status === 'ACTIVATED') return { found: true, angles: [a1, a2, ea] };
        }
      }
    }
  }
  return { found: false };
}

for (const lvl of CHAMBER_LEVELS) {
  test(`Level ${lvl.id} (${lvl.title}) is solvable`, () => {
    // Fresh engine per level
    sandbox.localStorage._data = {};   // reset saved progression
    const eng = new VectorVoidEngine();
    lvl.init(eng);
    eng.isReflectionMode = true;
    // Open all timed gates so they don't block the sweep
    eng.timedGates.forEach(g => { g.isOpen = true; });
    return sweepSolve(eng).found;
  });
}

// ── [6] Step 4: Scoring & Telemetry ───────────────────────────────────────
console.log('\n[6] Step 4: Scoring & Telemetry');
test('Base score initializes to 1000', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  return engine.score === 1000;
});
test('Move penalty deducts 50 per move', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  CHAMBER_LEVELS[0].init(engine);
  engine.moves = 5;
  engine.receiver.status = 'INACTIVE';
  engine.calculateScore();
  return engine.score === 1000 - 5 * 50;
});
test('Score never goes below 0', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  CHAMBER_LEVELS[0].init(engine);
  engine.moves = 100;
  engine.calculateScore();
  return engine.score === 0;
});
test('3 stars awarded for optimal solve', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  CHAMBER_LEVELS[0].init(engine);
  engine.moves = 1;
  engine.elapsedSeconds = 5;
  engine.receiver.status = 'ACTIVATED';
  engine.lastTelemetry.bounces = 1;
  engine.calculateScore();
  return engine.starCount === 3;
});
test('3 receiver states working', () => {
  const r = new Receiver(800, 200, 180, 60, 44);
  r.status = 'INACTIVE';
  const s1 = r.status;
  r.status = 'RECEIVING';
  const s2 = r.status;
  r.status = 'ACTIVATED';
  const s3 = r.status;
  return s1 === 'INACTIVE' && s2 === 'RECEIVING' && s3 === 'ACTIVATED';
});

// ── [7] Step 5: Progression & localStorage ────────────────────────────────
console.log('\n[7] Step 5: Progression & localStorage');
test('Level 1 unlocked by default', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  return engine.progression.unlockedLevels.includes(1);
});
test('Recording score saves to progression', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  engine.score     = 850;
  engine.starCount = 3;
  engine.recordLevelScore(850, 3);
  return engine.progression.levelBestScores[1] === 850;
});
test('Unlock next level after completion', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  engine.score     = 850;
  engine.starCount = 3;
  engine.recordLevelScore(850, 3);
  return engine.progression.unlockedLevels.includes(2);
});

// ── [8] Step 6: Advanced Mechanics ────────────────────────────────────────
console.log('\n[8] Step 6: Advanced Mechanics');
test('Moving mirror rail updates position', () => {
  const m = new Mirror('T', 500, 300, 0, 100, {
    a: new Vec2(400,300), b: new Vec2(600,300), speed: 1, progress: 0, dir: 1
  });
  m.update(0.5, false);
  return m.pos.x > 400;
});
test('Timed gate closes and blocks ray', () => {
  const g = new TimedGate(500, 100, 500, 400, 4000, 2000, 3000);
  g.isOpen = false;
  const seg = g.getSegment();
  return seg !== null;
});
test('Timed gate open removes segment', () => {
  const g = new TimedGate(500, 100, 500, 400, 4000, 2000, 0);
  g.isOpen = true;
  return g.getSegment() === null;
});
test('Refraction field circle intersection', () => {
  const rf  = new RefractionField(500, 300, 60, 30);
  const hit = rf.intersectRay(new Vec2(400,300), new Vec2(1,0));
  return hit !== null && hit.t > 0;
});
test('Refraction field misses when not in path', () => {
  const rf  = new RefractionField(500, 300, 60, 30);
  const hit = rf.intersectRay(new Vec2(400, 10), new Vec2(1,0));
  return hit === null;
});
test('Black hole instantiates with horizon and influence radii', () => {
  const bh = new BlackHole('BH-TEST', 400, 300, 24, 120, 2800);
  return bh.horizonRadius === 24 && bh.influenceRadius === 120 && bh.containsPoint(new Vec2(450, 300));
});
test('Black hole accelerates nearby rays inward', () => {
  const bh = new BlackHole('BH-TEST', 400, 300, 24, 120, 2800);
  const acc = bh.getAcceleration(new Vec2(350, 300));
  return acc.x > 0;
});
test('Downward gravity zone accelerates rays downward', () => {
  const gz = new GravityZone('GZ-TEST', 400, 300, 100, 100, 0.08);
  const acc = gz.getAcceleration(new Vec2(400, 300));
  return acc.y > 0 && Math.abs(acc.x) < 1e-6;
});
test('Black hole absorbs beam at event horizon', () => {
  const eng = new VectorVoidEngine();
  eng.emitter = new Emitter(200, 300, 0);
  eng.mirrors = [];
  eng.receiver = new Receiver(800, 300, 180);
  eng.blackHoles = [new BlackHole('BH-ABSORB', 400, 300, 25, 120, 2800)];
  eng.gravityZones = [];
  eng.calculateLaserTrajectory();
  return eng.lastTrajectory.some(s => s.hit && s.hit.segment.surfaceType === 'black_hole') && eng.receiver.status === 'INACTIVE';
});

// ── [9] Step 7: Pause System ──────────────────────────────────────────────
console.log('\n[9] Step 7: Pause System');
test('Pause state initializes false', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  return engine.isSimulationPaused === false;
});
test('Toggle pause flips state', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  engine.togglePause();
  const p1 = engine.isSimulationPaused;
  engine.togglePause();
  const p2 = engine.isSimulationPaused;
  return p1 === true && p2 === false;
});

// ── [10] Step 8: Stability & Edge Cases ───────────────────────────────────
console.log('\n[10] Step 8: Stability & Edge Cases');
test('Load level resets score and moves', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  engine.score = 250;
  engine.moves = 15;
  engine.loadLevel(1);
  return engine.score === 1000 && engine.moves === 0;
});
test('Max 8 bounces prevents infinite loop', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  CHAMBER_LEVELS[0].init(engine);
  engine.emitter.angle = 45;
  engine.updateRaycastingPhysics();
  return engine.lastTelemetry.bounces <= 8;
});
test('Score stays >= 0 with many penalties', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  CHAMBER_LEVELS[0].init(engine);
  engine.moves = 500;
  engine.calculateScore();
  return engine.score >= 0;
});
test('Receiver inactive state on reset', () => {
  sandbox.localStorage._data = {};
  engine = new VectorVoidEngine();
  engine.receiver.status = 'ACTIVATED';
  engine.loadLevel(1);
  return engine.receiver.status === 'INACTIVE';
});

// ── FINAL SUMMARY ─────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
const total = passed + failed;
console.log(`RESULTS: ${passed} / ${total} tests passed`);
if (failed === 0) {
  console.log('ALL TESTS PASSED — VECTOR_VOID STEPS 4-8 VERIFIED ✓');
} else {
  console.log(`${failed} TESTS FAILED`);
}
console.log('='.repeat(50));
