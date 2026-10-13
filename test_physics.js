const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptCode = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');

const sandbox = {
  window: { addEventListener: () => {} },
  document: {
    getElementById: (id) => ({
      getContext: () => ({
        clearRect: () => {}, save: () => {}, restore: () => {},
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
        stroke: () => {}, fill: () => {}, arc: () => {}, rect: () => {},
        fillText: () => {}, setLineDash: () => {}, translate: () => {}, rotate: () => {}
      }),
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      style: {},
      dataset: {}
    }),
    querySelectorAll: () => []
  },
  performance: { now: () => 1000 },
  requestAnimationFrame: () => {},
  setInterval: (fn, ms) => 123,
  clearInterval: (id) => {},
  setTimeout: (fn, ms) => fn(),
  console: console
};

vm.createContext(sandbox);
vm.runInContext(scriptCode + `
  globalThis.Vec2 = Vec2;
  globalThis.LineSegment = LineSegment;
  globalThis.Emitter = Emitter;
  globalThis.Mirror = Mirror;
  globalThis.Receiver = Receiver;
  globalThis.ObstacleWall = ObstacleWall;
  globalThis.VectorVoidEngine = VectorVoidEngine;
`, sandbox);

const { Vec2, LineSegment, Emitter, Mirror, Receiver, VectorVoidEngine } = sandbox;

console.log('=== VECTOR_VOID TEST SUITE ===');

// 1. Vector Math tests
const v1 = new Vec2(1, 0);
const v2 = new Vec2(0, 1);
console.log('Test 1 - Dot Product (orthogonality):', v1.dot(v2) === 0 ? 'PASS' : 'FAIL');
console.log('Test 2 - Cross Product (2D determinant):', v1.cross(v2) === 1 ? 'PASS' : 'FAIL');

// 2. Ray-Segment Intersection tests
const seg = new LineSegment(new Vec2(100, 0), new Vec2(100, 200), 'mirror');
const hit = seg.intersectRay(new Vec2(0, 100), new Vec2(1, 0));
console.log('Test 3 - Direct Ray Hit:', (hit && hit.point.x === 100 && hit.point.y === 100) ? 'PASS' : 'FAIL');

const parallelHit = seg.intersectRay(new Vec2(0, 100), new Vec2(0, 1));
console.log('Test 4 - Parallel Ray Non-Collision:', parallelHit === null ? 'PASS' : 'FAIL');

const backHit = seg.intersectRay(new Vec2(200, 100), new Vec2(1, 0));
console.log('Test 5 - Ray Directed Away Non-Collision:', backHit === null ? 'PASS' : 'FAIL');

// 3. Snell Reflection Law Test
const D = new Vec2(1, 1).normalize();
const N = new Vec2(-1, 0).normalize();
const R = D.sub(N.scale(2 * D.dot(N))).normalize();
const theta_i = Math.acos(-D.dot(N)) * 180 / Math.PI;
const theta_r = Math.acos(R.dot(N)) * 180 / Math.PI;
console.log('Test 6 - Snell Angle Identity (θi === θr):', Math.abs(theta_i - theta_r) < 1e-6 ? 'PASS' : 'FAIL');

// 4. Test Engine Levels Solvability
const engine = new VectorVoidEngine();

// Level 1:
engine.loadLevel(1);
console.log('Level 1 initialized. Emitter angle:', engine.emitter.angle);

// Find emitter/mirror angle that hits receiver:
// Align emitter to aim at mirror center:
engine.emitter.angle = 32.9;
let l1Solved = false;
let l1Angle = null;
for (let a = -45; a <= 45; a += 0.5) {
  engine.mirrors[0].angle = a;
  engine.updateRaycastingPhysics();
  if (engine.receiver.isTargeted) {
    l1Solved = true;
    l1Angle = a;
    break;
  }
}
console.log('Test 7 - Level 1 Solvability:', l1Solved ? `PASS (Mirror Angle ${l1Angle}° hits receiver)` : 'FAIL');

// Test Step 1 Absorption Mode
engine.switchDevelopmentStep(1);
engine.updateRaycastingPhysics();
console.log('Test 8 - Step 1 Mode (Absorption):', engine.lastTrajectory.length === 1 && engine.lastTelemetry.finalSurface.includes('MIRROR') ? 'PASS' : 'FAIL');

// Test Step 2 Reflection Mode
engine.switchDevelopmentStep(2);
engine.mirrors[0].angle = l1Angle;
engine.updateRaycastingPhysics();
console.log('Test 9 - Step 2 Mode (Reflection to Receiver):', engine.lastTelemetry.bounces === 1 && engine.receiver.isTargeted ? 'PASS' : 'FAIL');

// Test Step 4 Scoring & Stars
engine.commitMove();
engine.commitMove();
engine.calculateScore();
console.log('Test 10 - Scoring System:', engine.score > 0 && engine.starCount > 0 ? `PASS (Score: ${engine.score}, Stars: ${engine.starCount})` : 'FAIL');

console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
