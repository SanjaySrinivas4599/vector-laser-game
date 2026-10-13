/**
 * ============================================================================
 * VECTOR_VOID — 2D Laser-Reflection Optical Physics Engine & Puzzle Simulator
 * Pure Vanilla JavaScript (ES6+) Implementation // Rev: 5.0 (Steps 1–8 Complete)
 * 
 * Stages Implemented:
 * 1. Laser Raycasting (Parametric intersection & obstacle occlusion)
 * 2. Specular Reflection Physics (Normal vectors & Snell's reflection law)
 * 3. Kinematic Manipulation (Touch/pointer interactions, move commitment)
 * 4. Scoring, Telemetry & Evaluation (Angle logging, timer, star rating, 3 receiver states)
 * 5. Levels & Progression (6 Solvable levels, localStorage save, level directory, next/retry)
 * 6. Advanced Mechanics (Moving mirrors on rails, timed gates, beam benders)
 * 7. Polish & User Experience (Title screen, pause menu, victory celebration, Web Audio)
 * 8. Comprehensive Quality, Stability & Edge-Case Handling
 * ============================================================================
 */

'use strict';

// ============================================================================
// 1. 2D VECTOR MATHEMATICS UTILITIES
// ============================================================================

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  mag() {
    return this.length();
  }

  normalize() {
    const len = this.length();
    if (len > 1e-9) {
      return new Vec2(this.x / len, this.y / len);
    }
    return new Vec2(1, 0);
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  rotate(degrees) {
    const rad = Vec2.toRadians(degrees);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  static fromAngle(radians) {
    return new Vec2(Math.cos(radians), Math.sin(radians));
  }

  static toDegrees(radians) {
    return (radians * 180) / Math.PI;
  }

  static toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  static lerp(v1, v2, t) {
    return new Vec2(v1.x + (v2.x - v1.x) * t, v1.y + (v2.y - v1.y) * t);
  }
}

// ============================================================================
// 2. GEOMETRIC PRIMITIVES & COLLISION SEGMENTS
// ============================================================================

class LineSegment {
  constructor(a, b, surfaceType = 'wall', parent = null) {
    this.a = a;
    this.b = b;
    this.surfaceType = surfaceType; // 'wall' | 'mirror' | 'receiver' | 'obstacle' | 'timed_gate'
    this.parent = parent;
  }

  getNormal() {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    return new Vec2(-dy, dx).normalize();
  }

  intersectRay(rayOrigin, rayDir, epsilon = 0.001) {
    const qp = this.a.sub(rayOrigin);
    const seg = this.b.sub(this.a);
    const denom = rayDir.cross(seg);

    if (Math.abs(denom) < 1e-9) {
      return null;
    }

    const t = qp.cross(seg) / denom;
    const s = qp.cross(rayDir) / denom;

    if (t > epsilon && s >= 0 && s <= 1) {
      const point = rayOrigin.add(rayDir.scale(t));
      let normal = this.getNormal();

      if (rayDir.dot(normal) > 0) {
        normal = normal.scale(-1);
      }

      return {
        t,
        s,
        point,
        normal,
        segment: this
      };
    }

    return null;
  }
}

// ============================================================================
// 3. SYNTHESIZED WEB AUDIO ENGINE (STEP 7)
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaserHum() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playRotateClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  playTargetLocked() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  playVictoryChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880, 1108.7].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.09, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.45);
      });
    } catch (e) {}
  }

  playGateToggle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  }

  playReset() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }

  playUnlockSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.06, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch (e) {}
  }
}

// ============================================================================
// 4. ENTITY CLASSES (STEP 6 ADVANCED MECHANICS INCLUDED)
// ============================================================================

/**
 * Laser Emitter
 */
class Emitter {
  constructor(x, y, angleDeg = 0) {
    this.pos = new Vec2(x, y);
    this.angle = angleDeg;
    this.radius = 24;
    this.barrelLength = 36;
    this.isSelected = false;
  }

  getDirection() {
    return Vec2.fromAngle(Vec2.toRadians(this.angle));
  }

  getAperturePosition() {
    const dir = this.getDirection();
    return this.pos.add(dir.scale(this.barrelLength));
  }

  containsPoint(p) {
    return this.pos.dist(p) <= this.radius + 12;
  }

  containsAimHandle(p) {
    const handlePos = this.getAperturePosition();
    return handlePos.dist(p) <= 16;
  }
}

/**
 * Optical Mirror (Supports Static or Kinetic Moving Rail)
 */
class Mirror {
  constructor(id, x, y, angleDeg = 45, length = 110, track = null) {
    this.id = id;
    this.pos = new Vec2(x, y);
    this.angle = angleDeg;
    this.length = length;
    this.thickness = 10;
    this.isSelected = false;

    // Moving Mirror Track Mechanism (Step 6)
    this.track = track; // null or { a: Vec2, b: Vec2, speed: number, progress: number, dir: 1 }
  }

  update(dt, isPaused = false) {
    if (!this.track || isPaused) return;
    const t = this.track;
    t.progress += t.speed * t.dir * dt;
    if (t.progress >= 1) {
      t.progress = 1;
      t.dir = -1;
    } else if (t.progress <= 0) {
      t.progress = 0;
      t.dir = 1;
    }
    // Smooth step interpolation along pneumatic rail
    const ease = t.progress * t.progress * (3 - 2 * t.progress);
    this.pos = Vec2.lerp(t.a, t.b, ease);
  }

  getEndpoints() {
    const rad = Vec2.toRadians(this.angle);
    const halfL = this.length / 2;
    const dx = Math.cos(rad) * halfL;
    const dy = Math.sin(rad) * halfL;
    return {
      a: new Vec2(this.pos.x - dx, this.pos.y - dy),
      b: new Vec2(this.pos.x + dx, this.pos.y + dy)
    };
  }

  getSegment() {
    const { a, b } = this.getEndpoints();
    return new LineSegment(a, b, 'mirror', this);
  }

  containsPoint(p) {
    if (this.pos.dist(p) <= 22) return true;
    const { a, b } = this.getEndpoints();
    const ab = b.sub(a);
    const ap = p.sub(a);
    const abLen = ab.length();
    const t = Math.max(0, Math.min(1, ap.dot(ab) / (abLen * abLen)));
    const closest = a.add(ab.scale(t));
    return closest.dist(p) <= this.thickness + 10;
  }

  containsRotationHandle(p) {
    const { a, b } = this.getEndpoints();
    return a.dist(p) <= 14 || b.dist(p) <= 14;
  }
}

/**
 * Optical Receiver Target
 */
class Receiver {
  constructor(x, y, angleDeg = 180, width = 60, height = 44) {
    this.pos = new Vec2(x, y);
    this.angle = angleDeg;
    this.width = width;
    this.height = height;
    this.status = 'INACTIVE'; // 'INACTIVE' | 'RECEIVING' | 'ACTIVATED'
    this.pulsePhase = 0;
  }

  get isTargeted() {
    return this.status === 'ACTIVATED';
  }

  set isTargeted(val) {
    this.status = val ? 'ACTIVATED' : 'INACTIVE';
  }

  getApertureSegment() {
    const rad = Vec2.toRadians(this.angle);
    const normal = Vec2.fromAngle(rad);
    const tangent = new Vec2(-normal.y, normal.x);
    const halfH = this.height / 2;
    const halfW = this.width / 2;

    const sensorCenter = this.pos.add(normal.scale(halfW));
    const a = sensorCenter.sub(tangent.scale(halfH));
    const b = sensorCenter.add(tangent.scale(halfH));
    return new LineSegment(a, b, 'receiver', this);
  }

  getHousingSegments() {
    const rad = Vec2.toRadians(this.angle);
    const normal = Vec2.fromAngle(rad);
    const tangent = new Vec2(-normal.y, normal.x);
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    const front = normal.scale(halfW);
    const back = normal.scale(-halfW);
    const side1 = tangent.scale(halfH);
    const side2 = tangent.scale(-halfH);

    const c0 = this.pos.add(front).add(side1);
    const c1 = this.pos.add(back).add(side1);
    const c2 = this.pos.add(back).add(side2);
    const c3 = this.pos.add(front).add(side2);

    return [
      new LineSegment(c0, c1, 'wall', this),
      new LineSegment(c1, c2, 'wall', this),
      new LineSegment(c2, c3, 'wall', this)
    ];
  }
}

/**
 * Obstacle Wall / Internal Chamber Barrier
 */
class ObstacleWall {
  constructor(x1, y1, x2, y2, type = 'wall') {
    this.a = new Vec2(x1, y1);
    this.b = new Vec2(x2, y2);
    this.type = type;
  }

  getSegment() {
    return new LineSegment(this.a, this.b, this.type, this);
  }
}

/**
 * Timed Obstacle Gate (Step 6 Mechanic)
 * Cycles between OPEN (passable) and CLOSED (solid barrier)
 */
class TimedGate {
  constructor(x1, y1, x2, y2, periodMs = 4000, openDurationMs = 2000, offsetMs = 0) {
    this.a = new Vec2(x1, y1);
    this.b = new Vec2(x2, y2);
    this.period = periodMs;
    this.openDuration = openDurationMs;
    this.offset = offsetMs;
    this.isOpen = false;
    this.timer = 0;
  }

  update(dt, isPaused = false) {
    if (isPaused) return;
    this.timer = (performance.now() + this.offset) % this.period;
    const wasOpen = this.isOpen;
    this.isOpen = this.timer < this.openDuration;
    return wasOpen !== this.isOpen; // State changed
  }

  getSegment() {
    if (this.isOpen) return null; // Invisible to ray when open!
    return new LineSegment(this.a, this.b, 'timed_gate', this);
  }

  getProgress() {
    if (this.isOpen) {
      return this.timer / this.openDuration;
    }
    return (this.timer - this.openDuration) / (this.period - this.openDuration);
  }
}

/**
 * Controllable Beam-Bending Refraction Field (Step 6 Mechanic)
 * Curves or deflects incoming laser rays by bendAngleDegrees
 */
class RefractionField {
  constructor(x, y, radius = 50, bendAngleDegrees = 30) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
    this.bendAngle = bendAngleDegrees; // Angle to refract incoming ray
    this.isSelected = false;
  }

  containsPoint(p) {
    return this.pos.dist(p) <= this.radius;
  }

  /**
   * Ray-Circle Intersection test
   */
  intersectRay(origin, dir, epsilon = 0.5) {
    const oc = origin.sub(this.pos);
    const b = dir.dot(oc);
    const c = oc.dot(oc) - this.radius * this.radius;
    const disc = b * b - c;

    if (disc < 0) return null;

    const sqrtDisc = Math.sqrt(disc);
    const t1 = -b - sqrtDisc;
    const t2 = -b + sqrtDisc;

    let t = t1 > epsilon ? t1 : (t2 > epsilon ? t2 : -1);
    if (t > epsilon) {
      const hitPoint = origin.add(dir.scale(t));
      const normal = hitPoint.sub(this.pos).normalize();
      return {
        t,
        point: hitPoint,
        normal,
        bendAngle: this.bendAngle,
        field: this
      };
    }
    return null;
  }
}

/**
 * Black Hole Gravitational Singularity (Obstacle & Mechanic)
 * Absorbs light completely at event horizon and curves beams within influence radius.
 */
class BlackHole {
  constructor(id, x, y, horizonRadius = 24, influenceRadius = 120, mass = 2800) {
    this.id = id;
    this.pos = new Vec2(x, y);
    this.horizonRadius = horizonRadius;
    this.influenceRadius = influenceRadius;
    this.mass = mass;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.particles = [];
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        angle: (i / 24) * Math.PI * 2,
        dist: horizonRadius + Math.random() * (influenceRadius - horizonRadius),
        speed: 0.015 + Math.random() * 0.025,
        size: 1 + Math.random() * 2,
        hue: Math.random() > 0.4 ? 275 : 195 // Purple / Cyan
      });
    }
  }

  containsPoint(p) {
    return this.pos.dist(p) <= this.influenceRadius;
  }

  isInsideHorizon(p) {
    return this.pos.dist(p) <= this.horizonRadius;
  }

  getAcceleration(p) {
    const delta = this.pos.sub(p);
    const r = delta.mag();
    if (r > this.influenceRadius || r < 1) return new Vec2(0, 0);
    const t = 1 - (r - this.horizonRadius) / (this.influenceRadius - this.horizonRadius);
    const clampedT = Math.max(0, Math.min(1, t));
    const forceMag = (this.mass / Math.max(r * r, 300)) * (0.3 + 0.7 * clampedT);
    return delta.normalize().scale(forceMag * 0.05);
  }

  update(dt = 16) {
    this.pulsePhase += 0.03;
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      pt.angle += pt.speed;
      pt.dist -= 0.18;
      if (pt.dist < this.horizonRadius) {
        pt.dist = this.horizonRadius + (this.influenceRadius - this.horizonRadius) * (0.6 + Math.random() * 0.4);
      }
    }
  }
}

/**
 * Downward Gravity Zone Field (Curvature Mechanic)
 * Applies progressive downward acceleration to light rays traversing the zone.
 */
class GravityZone {
  constructor(id, x, y, radiusX = 100, radiusY = 100, strength = 0.08, dir = new Vec2(0, 1)) {
    this.id = id;
    this.pos = new Vec2(x, y);
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.strength = strength;
    this.dir = dir.normalize();
  }

  containsPoint(p) {
    const dx = (p.x - this.pos.x) / this.radiusX;
    const dy = (p.y - this.pos.y) / this.radiusY;
    return (dx * dx + dy * dy) <= 1.0;
  }

  getAcceleration(p) {
    const dx = (p.x - this.pos.x) / this.radiusX;
    const dy = (p.y - this.pos.y) / this.radiusY;
    const distSq = dx * dx + dy * dy;
    if (distSq > 1.0) return new Vec2(0, 0);
    const distNorm = Math.sqrt(distSq);
    const factor = 1.0 - distNorm * 0.4;
    return this.dir.scale(this.strength * factor * 0.15);
  }
}

// ============================================================================
// 5. PUZZLE LEVEL DATABASE & PROGRESSION SCHEMA (STEP 5)
// ============================================================================

const CHAMBER_LEVELS = [
  {
    id: 1,
    title: "PRIMARY CALIBRATION",
    subtitle: "Basic Specular Deflection",
    hint: "Rotate Mirror M-01 to reflect the downward beam into the receiver sensor plate.",
    mechanicTag: "MECHANIC: ROTATION",
    optimalMoves: 2,
    optimalBounces: 1,
    init: (engine) => {
      engine.emitter = new Emitter(140, 160, 20);
      engine.mirrors = [
        new Mirror('M-01', 480, 380, -20, 120)
      ];
      engine.receiver = new Receiver(820, 160, 180, 60, 44);
      engine.walls = [...engine.chamberPerimeter];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [];
    }
  },
  {
    id: 2,
    title: "PERISCOPE DEFLECTOR",
    subtitle: "Dual Deflection Route",
    hint: "Use both mirrors to construct an S-path around the hanging central barrier.",
    mechanicTag: "MECHANIC: MULTI-MIRROR",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 120, 0);
      engine.mirrors = [
        new Mirror('M-01', 360, 120, 25, 110),
        new Mirror('M-02', 620, 420, -20, 110)
      ];
      engine.receiver = new Receiver(820, 200, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(480, 20, 480, 240, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [];
    }
  },
  {
    id: 3,
    title: "KINETIC RAIL TRACK",
    subtitle: "Oscillating Linear Deflector",
    hint: "Mirror M-02 glides along the rail track. Orient M-01 to intercept its patrol window.",
    mechanicTag: "MECHANIC: MOVING RAIL",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 140, 25);
      engine.mirrors = [
        new Mirror('M-01', 380, 250, 40, 100),
        new Mirror('M-02', 620, 400, -30, 110, {
          a: new Vec2(560, 400),
          b: new Vec2(700, 400),
          speed: 0.35,
          progress: 0.2,
          dir: 1
        })
      ];
      engine.receiver = new Receiver(850, 180, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(500, 160, 500, 320, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [];
    }
  },
  {
    id: 4,
    title: "PULSED APERTURE GATE",
    subtitle: "Periodic Security Barrier",
    hint: "The central hazard gate cycles open and closed. Time your beam through the gap.",
    mechanicTag: "MECHANIC: TIMED GATE",
    optimalMoves: 4,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 140, 15);
      engine.mirrors = [
        new Mirror('M-01', 360, 200, 30, 110),
        new Mirror('M-02', 680, 420, -35, 110)
      ];
      engine.receiver = new Receiver(850, 180, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(520, 20, 520, 130, 'obstacle'),
        new ObstacleWall(520, 350, 520, 520, 'obstacle')
      ];
      engine.timedGates = [
        new TimedGate(520, 130, 520, 350, 4000, 2200, 0)
      ];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [];
    }
  },
  {
    id: 5,
    title: "REFRACTION CHAMBER",
    subtitle: "Optical Beam Bender",
    hint: "The cyan field bends the laser by -20°. Direct the beam through it to bypass the shield.",
    mechanicTag: "MECHANIC: BEAM BENDER",
    optimalMoves: 3,
    optimalBounces: 1,
    init: (engine) => {
      engine.emitter = new Emitter(140, 160, 15);
      engine.mirrors = [
        new Mirror('M-01', 400, 380, -25, 120)
      ];
      engine.receiver = new Receiver(840, 160, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(560, 20, 560, 200, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [
        new RefractionField(580, 240, 48, -20)
      ];
      engine.blackHoles = [];
      engine.gravityZones = [];
    }
  },
  {
    id: 6,
    title: "GRAND CALIBRATION",
    subtitle: "Multi-Mechanic Synchronization",
    hint: "Synchronize the kinetic rail mirror, timed gate, and refraction field into the sensor.",
    mechanicTag: "GRAND CHALLENGE",
    optimalMoves: 5,
    optimalBounces: 3,
    init: (engine) => {
      engine.emitter = new Emitter(120, 140, 0);
      engine.mirrors = [
        new Mirror('M-01', 340, 140, 35, 110),
        new Mirror('M-02', 540, 420, -25, 110, {
          a: new Vec2(480, 420),
          b: new Vec2(600, 420),
          speed: 0.3,
          progress: 0.5,
          dir: 1
        })
      ];
      engine.receiver = new Receiver(860, 210, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(420, 20, 420, 260, 'obstacle')
      ];
      engine.timedGates = [
        new TimedGate(640, 160, 640, 360, 4000, 2000, 0)
      ];
      engine.refractionFields = [
        new RefractionField(720, 250, 40, 10)
      ];
      engine.blackHoles = [];
      engine.gravityZones = [];
    }
  },
  {
    id: 7,
    title: "GRAVITATIONAL WELL I",
    subtitle: "Downward Gravity Introduction",
    hint: "Angle the emitter slightly upward; the downward gravity zone curves the beam straight into the target.",
    mechanicTag: "MECHANIC: DOWNWARD GRAVITY",
    optimalMoves: 1,
    optimalBounces: 0,
    init: (engine) => {
      engine.emitter = new Emitter(140, 180, -10);
      engine.mirrors = [];
      engine.receiver = new Receiver(820, 360, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(480, 20, 480, 160, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [
        new GravityZone('GZ-01', 480, 260, 140, 140, 0.08)
      ];
    }
  },
  {
    id: 8,
    title: "GRAVITATIONAL ARC II",
    subtitle: "High-Altitude Curved Descent",
    hint: "Reflect the beam over the hanging barrier; gravity pulls it down into the lower receiver.",
    mechanicTag: "GRAVITY + MIRROR",
    optimalMoves: 2,
    optimalBounces: 1,
    init: (engine) => {
      engine.emitter = new Emitter(140, 360, -25);
      engine.mirrors = [
        new Mirror('M-01', 380, 220, 15, 110)
      ];
      engine.receiver = new Receiver(840, 420, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(560, 20, 560, 280, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [
        new GravityZone('GZ-01', 680, 280, 130, 130, 0.09)
      ];
    }
  },
  {
    id: 9,
    title: "CASCADE ACCELERATION",
    subtitle: "Dual Gravity Fields",
    hint: "Route through two cascading downward fields to plunge the beam into the deep basin.",
    mechanicTag: "DUAL GRAVITY",
    optimalMoves: 2,
    optimalBounces: 1,
    init: (engine) => {
      engine.emitter = new Emitter(120, 140, 5);
      engine.mirrors = [
        new Mirror('M-01', 360, 180, 25, 110)
      ];
      engine.receiver = new Receiver(860, 440, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(500, 20, 500, 180, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [
        new GravityZone('GZ-01', 500, 250, 100, 100, 0.06),
        new GravityZone('GZ-02', 680, 350, 100, 100, 0.07)
      ];
    }
  },
  {
    id: 10,
    title: "EVENT HORIZON AVOIDANCE",
    subtitle: "Singularity Introduction",
    hint: "Do not fire directly! The central black hole absorbs all light. Use mirrors to route above it.",
    mechanicTag: "MECHANIC: BLACK HOLE",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 270, 0);
      engine.mirrors = [
        new Mirror('M-01', 320, 140, 30, 110),
        new Mirror('M-02', 640, 140, -30, 110)
      ];
      engine.receiver = new Receiver(840, 270, 180, 60, 44);
      engine.walls = [...engine.chamberPerimeter];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 480, 270, 26, 130, 2800)
      ];
      engine.gravityZones = [];
    }
  },
  {
    id: 11,
    title: "GRAVITATIONAL LENSING",
    subtitle: "Slingshot Deflection Route",
    hint: "Skim close to the black hole's influence horizon to bend the beam around the shield wall.",
    mechanicTag: "SINGULARITY SLINGSHOT",
    optimalMoves: 2,
    optimalBounces: 1,
    init: (engine) => {
      engine.emitter = new Emitter(140, 180, 12);
      engine.mirrors = [
        new Mirror('M-01', 680, 380, -35, 110)
      ];
      engine.receiver = new Receiver(850, 180, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(440, 20, 440, 180, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 440, 290, 24, 140, 3200)
      ];
      engine.gravityZones = [];
    }
  },
  {
    id: 12,
    title: "BINARY SINGULARITY CHASM",
    subtitle: "Dual Horizon Navigation",
    hint: "Navigate the narrow safe corridor between two opposing black holes.",
    mechanicTag: "DUAL BLACK HOLE",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 270, 0);
      engine.mirrors = [
        new Mirror('M-01', 340, 360, -25, 110),
        new Mirror('M-02', 680, 180, 30, 110)
      ];
      engine.receiver = new Receiver(860, 340, 180, 60, 44);
      engine.walls = [...engine.chamberPerimeter];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 480, 130, 22, 110, 2200),
        new BlackHole('BH-02', 480, 410, 22, 110, 2200)
      ];
      engine.gravityZones = [];
    }
  },
  {
    id: 13,
    title: "PLANETARY GRAVITY WELL",
    subtitle: "Curved Reflection Interception",
    hint: "Gravity curves the beam between reflections. Aim M-01 to anticipate the arc onto M-02.",
    mechanicTag: "GRAVITY + DUAL MIRROR",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 140, 15);
      engine.mirrors = [
        new Mirror('M-01', 360, 200, 35, 110),
        new Mirror('M-02', 680, 440, -40, 110)
      ];
      engine.receiver = new Receiver(850, 220, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(520, 20, 520, 220, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [
        new GravityZone('GZ-01', 520, 320, 120, 120, 0.08)
      ];
    }
  },
  {
    id: 14,
    title: "KINETIC GRAVITATIONAL FLUX",
    subtitle: "Oscillating Track in Curved Field",
    hint: "Intercept the moving rail mirror as the beam curves through the gravitational vortex.",
    mechanicTag: "GRAVITY + MOVING RAIL",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 160, 18);
      engine.mirrors = [
        new Mirror('M-01', 360, 240, 30, 110),
        new Mirror('M-02', 640, 380, -25, 110, {
          a: new Vec2(580, 380),
          b: new Vec2(700, 380),
          speed: 0.35,
          progress: 0.5,
          dir: 1
        })
      ];
      engine.receiver = new Receiver(860, 180, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(500, 20, 500, 200, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [
        new GravityZone('GZ-01', 500, 280, 110, 110, 0.08)
      ];
    }
  },
  {
    id: 15,
    title: "TRIPLE REFLECTOR BASIN",
    subtitle: "Cascading Gravitational Wells",
    hint: "Navigate dual downward gravitational fields across the central partition into the sensor.",
    mechanicTag: "DUAL GRAVITY WELLS",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(120, 140, 8);
      engine.mirrors = [
        new Mirror('M-01', 340, 160, 30, 110),
        new Mirror('M-02', 660, 420, -35, 110)
      ];
      engine.receiver = new Receiver(860, 220, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(500, 20, 500, 240, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [];
      engine.gravityZones = [
        new GravityZone('GZ-01', 480, 340, 110, 110, 0.07),
        new GravityZone('GZ-02', 680, 240, 100, 100, 0.07)
      ];
    }
  },
  {
    id: 16,
    title: "ACCRETION PERIMETER",
    subtitle: "Singularity & Gravity Combination",
    hint: "A black hole pulls from below while gravity bends from above. Thread between both.",
    mechanicTag: "BLACK HOLE + GRAVITY",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 140, 10);
      engine.mirrors = [
        new Mirror('M-01', 340, 160, 25, 110),
        new Mirror('M-02', 740, 400, -35, 110)
      ];
      engine.receiver = new Receiver(860, 220, 180, 60, 44);
      engine.walls = [...engine.chamberPerimeter];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 460, 340, 24, 120, 2600)
      ];
      engine.gravityZones = [
        new GravityZone('GZ-01', 640, 220, 110, 110, 0.07)
      ];
    }
  },
  {
    id: 17,
    title: "ORBITAL GRAVITY SLING",
    subtitle: "Combined Curved Dynamics",
    hint: "Use both the black hole's gravitational suction and the downward field to curve into M-02.",
    mechanicTag: "ORBITAL DYNAMICS",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 160, 10);
      engine.mirrors = [
        new Mirror('M-01', 340, 180, 28, 110),
        new Mirror('M-02', 720, 420, -32, 110)
      ];
      engine.receiver = new Receiver(860, 220, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(520, 20, 520, 180, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 480, 260, 22, 110, 2200)
      ];
      engine.gravityZones = [
        new GravityZone('GZ-01', 660, 320, 110, 110, 0.08)
      ];
    }
  },
  {
    id: 18,
    title: "PULSED SINGULARITY GATE",
    subtitle: "Timed Barrier in Warped Space",
    hint: "Wait for the gate to open, then fire through warped gravitational space.",
    mechanicTag: "SINGULARITY + TIMED GATE",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 160, 12);
      engine.mirrors = [
        new Mirror('M-01', 320, 200, 30, 110),
        new Mirror('M-02', 740, 420, -30, 110)
      ];
      engine.receiver = new Receiver(860, 180, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(540, 20, 540, 140, 'obstacle'),
        new ObstacleWall(540, 380, 540, 520, 'obstacle')
      ];
      engine.timedGates = [
        new TimedGate(540, 140, 540, 380, 4000, 2200, 0)
      ];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 440, 180, 22, 110, 2400)
      ];
      engine.gravityZones = [
        new GravityZone('GZ-01', 660, 300, 110, 110, 0.07)
      ];
    }
  },
  {
    id: 19,
    title: "EVENT HORIZON LABYRINTH",
    subtitle: "Advanced Gravitational Maze",
    hint: "Navigate around black hole event horizons and narrow corridors using precision angles.",
    mechanicTag: "ADVANCED MAZE",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 140, 0);
      engine.mirrors = [
        new Mirror('M-01', 320, 140, 30, 110),
        new Mirror('M-02', 680, 420, -30, 110)
      ];
      engine.receiver = new Receiver(860, 220, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(480, 20, 480, 180, 'obstacle'),
        new ObstacleWall(480, 360, 480, 520, 'obstacle')
      ];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 480, 270, 22, 100, 2200)
      ];
      engine.gravityZones = [
        new GravityZone('GZ-01', 620, 320, 100, 100, 0.07)
      ];
    }
  },
  {
    id: 20,
    title: "DUAL SINGULARITY SLINGSHOT",
    subtitle: "High-G Double Singularity",
    hint: "Two black holes pull from opposite sides. Balance the kinetic rail mirror to slingshot.",
    mechanicTag: "DUAL SINGULARITY + RAIL",
    optimalMoves: 3,
    optimalBounces: 2,
    init: (engine) => {
      engine.emitter = new Emitter(140, 160, 10);
      engine.mirrors = [
        new Mirror('M-01', 320, 180, 30, 110),
        new Mirror('M-02', 720, 400, -32, 110, {
          a: new Vec2(660, 400),
          b: new Vec2(780, 400),
          speed: 0.3,
          progress: 0.5,
          dir: 1
        })
      ];
      engine.receiver = new Receiver(860, 200, 180, 60, 44);
      engine.walls = [...engine.chamberPerimeter];
      engine.timedGates = [];
      engine.refractionFields = [];
      engine.blackHoles = [
        new BlackHole('BH-01', 440, 140, 20, 90, 2000),
        new BlackHole('BH-02', 580, 340, 20, 90, 2000)
      ];
      engine.gravityZones = [
        new GravityZone('GZ-01', 500, 260, 90, 90, 0.06)
      ];
    }
  },
  {
    id: 21,
    title: "GRAND VOID CONVERGENCE",
    subtitle: "The Ultimate Cosmic Symphony",
    hint: "Synchronize Singularity, Gravity, Refraction, Timed Gate, and Kinetic Rail to solve the chamber.",
    mechanicTag: "MASTER FINALE",
    optimalMoves: 4,
    optimalBounces: 3,
    init: (engine) => {
      engine.emitter = new Emitter(120, 140, 5);
      engine.mirrors = [
        new Mirror('M-01', 300, 160, 32, 110),
        new Mirror('M-02', 740, 400, -28, 110, {
          a: new Vec2(680, 400),
          b: new Vec2(800, 400),
          speed: 0.25,
          progress: 0.5,
          dir: 1
        })
      ];
      engine.receiver = new Receiver(880, 180, 180, 60, 44);
      engine.walls = [
        ...engine.chamberPerimeter,
        new ObstacleWall(420, 20, 420, 180, 'obstacle')
      ];
      engine.timedGates = [
        new TimedGate(540, 120, 540, 320, 4000, 2200, 0)
      ];
      engine.refractionFields = [
        new RefractionField(660, 200, 40, -15)
      ];
      engine.blackHoles = [
        new BlackHole('BH-01', 440, 260, 20, 90, 2000)
      ];
      engine.gravityZones = [
        new GravityZone('GZ-01', 620, 340, 100, 100, 0.06)
      ];
    }
  }
];

// ============================================================================
// 6. GAME ENGINE CORE & SIMULATION CONTROLLER
// ============================================================================

class VectorVoidEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = 960;
    this.height = 540;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.sound = new SoundEngine();

    // Chamber Configuration
    this.currentLevel = 1;
    this.currentStep = 4;
    this.isReflectionMode = true;
    this.previewTrajectory = true;
    this.isBeamFired = false;
    this.fireTimer = 0;
    this.isSimulationPaused = false;

    // Simulation Entities
    this.emitter = null;
    this.mirrors = [];
    this.receiver = null;
    this.walls = [];
    this.timedGates = [];
    this.refractionFields = [];
    this.blackHoles = [];
    this.gravityZones = [];

    // State Tracking
    this.gameState = 'READY';
    this.activeEntity = null;
    this.dragTarget = null;

    // Scoring & Telemetry Metrics
    this.score = 1000;
    this.moves = 0;
    this.starCount = 0;
    this.startTime = null;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.isPuzzleCompleted = false;

    // Target Metrics
    this.levelTargetBounces = 1;
    this.levelTargetMoves = 2;

    // Telemetry State
    this.lastTrajectory = [];
    this.lastTelemetry = {
      incidentAngle: null,
      reflectionAngle: null,
      bounces: 0,
      finalSurface: 'NONE',
      receiverStatus: 'INACTIVE',
      emitterAngle: 0
    };

    // Load LocalStorage Progression (Step 5)
    this.loadProgression();

    // Cache DOM
    this.initDom();
    this.initChamberWalls();
    this.loadLevel(this.currentLevel);
    this.bindEvents();

    // Start Simulation Loop
    this.lastFrameTime = performance.now();
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
  }

  // ==========================================================================
  // PROGRESSION & STORAGE (STEP 5)
  // ==========================================================================

  loadProgression() {
    const defaultData = {
      unlockedLevels: [1],
      levelBestScores: {},
      levelStars: {},
      soundMuted: false
    };

    try {
      const saved = localStorage.getItem('vector_void_progress_v2');
      this.progression = saved ? JSON.parse(saved) : defaultData;
    } catch (e) {
      this.progression = defaultData;
    }

    if (this.progression.soundMuted) {
      this.sound.muted = true;
    }
  }

  saveProgression() {
    try {
      localStorage.setItem('vector_void_progress_v2', JSON.stringify(this.progression));
    } catch (e) {}
  }

  unlockNextLevel() {
    const nextLvl = this.currentLevel + 1;
    if (nextLvl <= CHAMBER_LEVELS.length && !this.progression.unlockedLevels.includes(nextLvl)) {
      this.progression.unlockedLevels.push(nextLvl);
      this.saveProgression();
    }
  }

  recordLevelScore(score, stars) {
    const lvl = this.currentLevel;
    const currentBest = this.progression.levelBestScores[lvl] || 0;
    if (score > currentBest) {
      this.progression.levelBestScores[lvl] = score;
    }
    const currentStars = this.progression.levelStars[lvl] || 0;
    if (stars > currentStars) {
      this.progression.levelStars[lvl] = stars;
    }
    this.unlockNextLevel();
    this.saveProgression();
  }

  // ==========================================================================
  // DOM CACHE & INITIALIZATION
  // ==========================================================================

  initDom() {
    this.dom = {
      systemStateLabel: document.getElementById('system-state-label'),
      headerSystemState: document.getElementById('header-system-state'),
      audioIcon: document.getElementById('audio-icon'),
      btnAudioToggle: document.getElementById('btn-audio-toggle'),
      btnPauseToggle: document.getElementById('btn-pause-toggle'),
      pauseIcon: document.getElementById('pause-icon'),
      pauseWatermark: document.getElementById('pause-watermark'),
      missionObjectiveText: document.getElementById('mission-objective-text'),
      missionMechanicBadge: document.getElementById('mission-mechanic-badge'),
      chamberTagDisplay: document.getElementById('chamber-tag-display'),
      chamberModeDisplay: document.getElementById('chamber-mode-display'),
      chkPreview: document.getElementById('chk-preview'),
      chkReflectionMode: document.getElementById('chk-reflection-mode'),
      reflectionModeLabel: document.getElementById('reflection-mode-label'),
      hudChamberId: document.getElementById('hud-chamber-id'),
      hudPointerCoords: document.getElementById('hud-pointer-coords'),
      hudActiveTarget: document.getElementById('hud-active-target'),
      selectionBanner: document.getElementById('selection-banner'),
      selectionName: document.getElementById('selection-name'),
      quickLevelTabs: document.querySelectorAll('.level-tab-btn'),
      btnFire: document.getElementById('btn-fire'),
      btnReset: document.getElementById('btn-reset'),
      valReceiverStatus: document.getElementById('val-receiver-status'),
      valBounces: document.getElementById('val-bounces'),
      valIncidentAngle: document.getElementById('val-incident-angle'),
      valReflectionAngle: document.getElementById('val-reflection-angle'),
      valEmitterAngle: document.getElementById('val-emitter-angle'),
      valImpactSurface: document.getElementById('val-impact-surface'),
      valScore: document.getElementById('val-score'),
      valMoves: document.getElementById('val-moves'),
      valTime: document.getElementById('val-time'),
      valTimeBonus: document.getElementById('val-time-bonus'),
      stars: document.querySelectorAll('#star-display .star'),
      selectedBadge: document.getElementById('selected-badge'),
      actuatorLabel: document.getElementById('actuator-label'),
      sliderRotation: document.getElementById('slider-rotation'),
      numAngle: document.getElementById('num-angle'),
      entitySelectorTabs: document.getElementById('entity-selector-tabs'),
      btnNudgeCcw10: document.getElementById('btn-nudge-ccw-10'),
      btnNudgeCcw1: document.getElementById('btn-nudge-ccw-1'),
      btnNudgeCw1: document.getElementById('btn-nudge-cw-1'),
      btnNudgeCw10: document.getElementById('btn-nudge-cw-10'),
      btnAimReceiver: document.getElementById('btn-aim-receiver'),
      stepButtons: document.querySelectorAll('.step-btn'),
      stageTabButtons: document.querySelectorAll('.stage-tab-btn'),
      stagePanels: document.querySelectorAll('.stage-content-panel'),
      // Modals
      modalTitleScreen: document.getElementById('modal-title-screen'),
      btnOpenMenu: document.getElementById('btn-open-menu'),
      btnMenuContinue: document.getElementById('btn-menu-continue'),
      btnMenuLevelSelect: document.getElementById('btn-menu-level-select'),
      btnMenuInstructions: document.getElementById('btn-menu-instructions'),
      modalLevelSelect: document.getElementById('modal-level-select'),
      btnOpenLevels: document.getElementById('btn-open-levels'),
      btnCloseLevelSelect: document.getElementById('btn-close-level-select'),
      levelDirectoryGrid: document.getElementById('level-directory-grid'),
      btnResetProgress: document.getElementById('btn-reset-progress'),
      modalLevelComplete: document.getElementById('modal-level-complete'),
      victoryChamberName: document.getElementById('victory-chamber-name'),
      victoryStars: document.querySelectorAll('#victory-star-display .vic-star'),
      victoryScore: document.getElementById('victory-score'),
      victoryMoves: document.getElementById('victory-moves'),
      victoryTime: document.getElementById('victory-time'),
      victoryBounces: document.getElementById('victory-bounces'),
      btnVictoryNext: document.getElementById('btn-victory-next'),
      btnVictoryRetry: document.getElementById('btn-victory-retry'),
      btnVictoryLevels: document.getElementById('btn-victory-levels'),
      modalPauseMenu: document.getElementById('modal-pause-menu'),
      btnPauseResume: document.getElementById('btn-pause-resume'),
      btnPauseRetry: document.getElementById('btn-pause-retry'),
      btnPauseLevels: document.getElementById('btn-pause-levels'),
      btnPauseMenu: document.getElementById('btn-pause-menu'),
      toastMechanic: document.getElementById('toast-mechanic'),
      toastTitle: document.getElementById('toast-title'),
      toastDesc: document.getElementById('toast-desc'),
      // Cyber Intro Keyframe Splash
      introKeyframeOverlay: document.getElementById('intro-keyframe-overlay'),
      btnEnterChamber: document.getElementById('btn-enter-chamber'),
      btnSkipIntro: document.getElementById('btn-skip-intro'),
      introFrameChassis: document.getElementById('intro-frame-chassis'),
      introStatusText: document.getElementById('intro-status-text'),
      btnReplayIntro: document.getElementById('btn-replay-intro'),
      btnMenuIntro: document.getElementById('btn-menu-intro'),
      // Knowledge Base Footer Collapse
      infoFooter: document.getElementById('info-footer'),
      btnToggleInfoFooter: document.getElementById('btn-toggle-info-footer')
    };

    if (this.sound.muted) {
      this.dom.audioIcon.textContent = '🔇';
    }
  }

  initChamberWalls() {
    const pad = 20;
    const w = this.width;
    const h = this.height;
    this.chamberPerimeter = [
      new ObstacleWall(pad, pad, w - pad, pad, 'wall'),
      new ObstacleWall(w - pad, pad, w - pad, h - pad, 'wall'),
      new ObstacleWall(w - pad, h - pad, pad, h - pad, 'wall'),
      new ObstacleWall(pad, h - pad, pad, pad, 'wall')
    ];
  }

  loadLevel(levelIndex) {
    const config = CHAMBER_LEVELS.find(lvl => lvl.id === levelIndex) || CHAMBER_LEVELS[0];
    this.currentLevel = config.id;

    this.stopTimer();
    this.startTime = null;
    this.elapsedSeconds = 0;
    this.moves = 0;
    this.score = 1000;
    this.isPuzzleCompleted = false;
    this.isBeamFired = false;
    this.gameState = 'READY';
    this.isSimulationPaused = false;
    this.updatePauseUi();

    // Close any open modals
    this.hideModals();

    // Initialize Level Geometry
    config.init(this);
    this.levelTargetBounces = config.optimalBounces;
    this.levelTargetMoves = config.optimalMoves;

    // Update Header & Briefing Bar
    const idPad = config.id < 10 ? `0${config.id}` : `${config.id}`;
    this.dom.chamberTagDisplay.textContent = `CHAMBER ${idPad}`;
    this.dom.hudChamberId.textContent = `CH-${idPad} // 960x540`;
    this.dom.chamberModeDisplay.textContent = `LEVEL ${config.id}: ${config.title}`;
    this.dom.missionObjectiveText.textContent = config.hint;
    this.dom.missionMechanicBadge.textContent = config.mechanicTag;

    // Quick Selector Tabs
    if (!this.dom.quickLevelTabs || this.dom.quickLevelTabs.length < CHAMBER_LEVELS.length) {
      this.dom.quickLevelTabs = document.querySelectorAll('.level-tab-btn');
    }
    this.dom.quickLevelTabs.forEach(btn => {
      const lvl = parseInt(btn.dataset.level, 10);
      btn.classList.toggle('active', lvl === config.id);
      const isUnlocked = this.progression.unlockedLevels.includes(lvl);
      btn.disabled = !isUnlocked;
      btn.style.opacity = isUnlocked ? '1' : '0.4';
    });

    // Populate Entity Selector Tabs
    this.populateEntityTabs();

    // Default Selection: Emitter
    this.selectEntity(this.emitter, 'emitter');

    // Show Toast on Level Introduction
    this.showMechanicToast(config.mechanicTag, config.subtitle);

    this.updateRaycastingPhysics();
    this.updateUiTelemetry();
    this.updateScoreDisplay();
    this.updateActuatorForm();
    this.sound.playReset();
  }

  populateEntityTabs() {
    const container = this.dom.entitySelectorTabs;
    container.innerHTML = '';

    // Emitter Tab
    const emitterBtn = document.createElement('button');
    emitterBtn.className = 'entity-tab-btn active';
    emitterBtn.dataset.entity = 'emitter';
    emitterBtn.textContent = 'EMITTER';
    emitterBtn.addEventListener('click', () => this.selectEntity(this.emitter, 'emitter'));
    container.appendChild(emitterBtn);

    // Mirrors Tabs
    this.mirrors.forEach((m, idx) => {
      const btn = document.createElement('button');
      btn.className = 'entity-tab-btn';
      btn.dataset.entity = `mirror-${idx}`;
      btn.textContent = `MIRROR 0${idx + 1}`;
      btn.addEventListener('click', () => this.selectEntity(m, `mirror-${idx}`));
      container.appendChild(btn);
    });

    // Refraction Field Tabs (if present)
    this.refractionFields.forEach((rf, idx) => {
      const btn = document.createElement('button');
      btn.className = 'entity-tab-btn';
      btn.dataset.entity = `field-${idx}`;
      btn.textContent = `FIELD 0${idx + 1}`;
      btn.addEventListener('click', () => this.selectEntity(rf, `field-${idx}`));
      container.appendChild(btn);
    });
  }

  showMechanicToast(title, desc) {
    this.dom.toastTitle.textContent = title;
    this.dom.toastDesc.textContent = desc;
    this.dom.toastMechanic.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toastMechanic.classList.add('hidden');
    }, 3200);
  }

  // ==========================================================================
  // RAYCASTING & SPECULAR REFLECTION (STEPS 1, 2, 6)
  // ==========================================================================

  getAllSegments() {
    const segments = [];
    this.walls.forEach(w => segments.push(w.getSegment()));
    this.mirrors.forEach(m => segments.push(m.getSegment()));

    // Timed Gates (Only active when closed)
    this.timedGates.forEach(g => {
      const seg = g.getSegment();
      if (seg) segments.push(seg);
    });

    // Receiver target
    if (this.receiver) {
      segments.push(this.receiver.getApertureSegment());
      this.receiver.getHousingSegments().forEach(s => segments.push(s));
    }

    return segments;
  }

  findNearestIntersection(rayOrigin, rayDir, segments, epsilon = 0.5) {
    let nearest = null;
    let minDistance = Infinity;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const hit = seg.intersectRay(rayOrigin, rayDir, epsilon);
      if (hit && hit.t < minDistance) {
        minDistance = hit.t;
        nearest = hit;
      }
    }

    // Check circular Refraction Fields (Step 6)
    for (let i = 0; i < this.refractionFields.length; i++) {
      const rf = this.refractionFields[i];
      const hit = rf.intersectRay(rayOrigin, rayDir, epsilon);
      if (hit && hit.t < minDistance) {
        minDistance = hit.t;
        nearest = {
          t: hit.t,
          point: hit.point,
          normal: hit.normal,
          segment: { surfaceType: 'refraction_field', parent: rf }
        };
      }
    }

    return nearest;
  }

  calculateLaserTrajectory() {
    const trajectory = [];
    const segments = this.getAllSegments();

    let currentOrigin = this.emitter.getAperturePosition();
    let currentDir = this.emitter.getDirection();
    const maxBounces = this.isReflectionMode ? 8 : 1;
    let bounceCount = 0;

    let firstMirrorHit = null;
    let receiverHitState = 'INACTIVE';
    let finalImpactSurface = 'NONE';

    const hasCurvature = (this.blackHoles && this.blackHoles.length > 0) || (this.gravityZones && this.gravityZones.length > 0);

    if (!hasCurvature) {
      for (let bounce = 0; bounce < maxBounces; bounce++) {
        const hit = this.findNearestIntersection(currentOrigin, currentDir, segments, 0.4);

        if (!hit) {
          const farPoint = currentOrigin.add(currentDir.scale(1500));
          trajectory.push({ start: currentOrigin, end: farPoint, hit: null });
          finalImpactSurface = 'OPEN_CHAMBER';
          break;
        }

        trajectory.push({ start: currentOrigin, end: hit.point, hit: hit });
        const surfaceType = hit.segment.surfaceType;
        finalImpactSurface = surfaceType.toUpperCase();

        // Check Receiver
        if (surfaceType === 'receiver') {
          receiverHitState = 'ACTIVATED';
          break;
        } else if (surfaceType === 'wall' && hit.segment.parent === this.receiver) {
          receiverHitState = 'RECEIVING'; // Striking housing
          break;
        }

        // Check Refraction Field (Step 6)
        if (surfaceType === 'refraction_field') {
          const rf = hit.segment.parent;
          const bentDir = currentDir.rotate(rf.bendAngle).normalize();
          currentOrigin = hit.point.add(bentDir.scale(0.8));
          currentDir = bentDir;
          bounceCount++;
          continue;
        }

        // Check Mirror Reflection
        if (surfaceType === 'mirror') {
          if (!firstMirrorHit) firstMirrorHit = hit;

          if (!this.isReflectionMode) {
            finalImpactSurface = 'MIRROR (ABSORBED)';
            break;
          }

          const D = currentDir;
          let N = hit.normal;
          const dot = D.dot(N);
          const R = D.sub(N.scale(2 * dot)).normalize();

          const epsilonOffset = 0.5;
          currentOrigin = hit.point.add(R.scale(epsilonOffset));
          currentDir = R;
          bounceCount++;
        } else {
          break;
        }
      }
    } else {
      // Step-wise ray marching in curved space (Downward Gravity & Black Hole Singularities)
      const ds = 4.0;
      const maxSteps = 1200;
      let currPos = currentOrigin;
      let currV = currentDir;
      let lastPoint = currPos;

      for (let step = 0; step < maxSteps; step++) {
        // 1. Check Black Hole event horizon absorption
        let absorbedBH = null;
        for (let b = 0; b < this.blackHoles.length; b++) {
          const bh = this.blackHoles[b];
          if (bh.pos.dist(currPos) <= bh.horizonRadius) {
            absorbedBH = bh;
            break;
          }
        }
        if (absorbedBH) {
          trajectory.push({
            start: lastPoint,
            end: currPos,
            hit: { point: currPos, normal: currV.scale(-1), segment: { surfaceType: 'black_hole', parent: absorbedBH } }
          });
          finalImpactSurface = 'BLACK HOLE (ABSORBED)';
          break;
        }

        // 2. Check collision within step ds
        const hit = this.findNearestIntersection(currPos, currV, segments, 0.1);
        if (hit && hit.t <= ds) {
          trajectory.push({ start: lastPoint, end: hit.point, hit });
          const surfaceType = hit.segment.surfaceType;
          finalImpactSurface = surfaceType.toUpperCase();

          if (surfaceType === 'receiver') {
            receiverHitState = 'ACTIVATED';
            break;
          } else if (surfaceType === 'wall' && hit.segment.parent === this.receiver) {
            receiverHitState = 'RECEIVING';
            break;
          }

          if (surfaceType === 'refraction_field') {
            const rf = hit.segment.parent;
            currV = currV.rotate(rf.bendAngle).normalize();
            currPos = hit.point.add(currV.scale(0.8));
            lastPoint = currPos;
            bounceCount++;
            continue;
          }

          if (surfaceType === 'mirror') {
            if (!firstMirrorHit) firstMirrorHit = hit;
            if (!this.isReflectionMode || bounceCount >= maxBounces) {
              finalImpactSurface = 'MIRROR (ABSORBED)';
              break;
            }
            const D = currV;
            const N = hit.normal;
            const dot = D.dot(N);
            currV = D.sub(N.scale(2 * dot)).normalize();
            currPos = hit.point.add(currV.scale(0.6));
            lastPoint = currPos;
            bounceCount++;
            continue;
          }

          break; // wall or gate hit
        }

        // 3. Compute acceleration from gravity zones & black holes
        let totalAcc = new Vec2(0, 0);
        for (let g = 0; g < this.gravityZones.length; g++) {
          const gz = this.gravityZones[g];
          if (gz.containsPoint(currPos)) {
            totalAcc = totalAcc.add(gz.getAcceleration(currPos));
          }
        }
        for (let b = 0; b < this.blackHoles.length; b++) {
          const bh = this.blackHoles[b];
          if (bh.containsPoint(currPos)) {
            totalAcc = totalAcc.add(bh.getAcceleration(currPos));
          }
        }

        const nextV = currV.add(totalAcc).normalize();
        const nextPos = currPos.add(nextV.scale(ds));
        trajectory.push({ start: currPos, end: nextPos, hit: null });
        currPos = nextPos;
        currV = nextV;
        lastPoint = nextPos;

        if (currPos.x < 10 || currPos.x > 950 || currPos.y < 10 || currPos.y > 530) {
          finalImpactSurface = 'CHAMBER BOUNDARY';
          break;
        }
      }
    }

    // Telemetry Angles
    let incAngleDeg = null;
    let refAngleDeg = null;

    if (firstMirrorHit) {
      const hitSeg = trajectory.find(s => s.hit === firstMirrorHit);
      if (hitSeg) {
        const D = hitSeg.end.sub(hitSeg.start).normalize();
        let N = firstMirrorHit.normal;
        const cosInc = Math.max(-1, Math.min(1, -D.dot(N)));
        incAngleDeg = Vec2.toDegrees(Math.acos(cosInc));
        refAngleDeg = incAngleDeg;
      }
    }

    this.lastTrajectory = trajectory;
    this.receiver.status = receiverHitState;

    this.lastTelemetry = {
      incidentAngle: incAngleDeg !== null ? incAngleDeg.toFixed(1) : '--.-',
      reflectionAngle: refAngleDeg !== null ? refAngleDeg.toFixed(1) : '--.-',
      bounces: bounceCount,
      finalSurface: finalImpactSurface,
      receiverStatus: receiverHitState,
      emitterAngle: this.emitter.angle.toFixed(1)
    };

    return trajectory;
  }

  updateRaycastingPhysics() {
    this.calculateLaserTrajectory();

    if (this.receiver.status === 'ACTIVATED' && !this.isPuzzleCompleted) {
      this.handlePuzzleComplete();
    } else if (this.receiver.status !== 'ACTIVATED' && this.isPuzzleCompleted) {
      this.isPuzzleCompleted = false;
      this.gameState = this.isBeamFired ? 'BEAM_FIRED' : 'AIMING';
    }
  }

  handlePuzzleComplete() {
    this.isPuzzleCompleted = true;
    this.gameState = 'RECEIVER_ACQUIRED';
    this.stopTimer();
    this.sound.playTargetLocked();
    this.calculateScore();
    this.recordLevelScore(this.score, this.starCount);

    // Show Level Complete Celebration Modal (Step 4 & 5)
    setTimeout(() => {
      this.showVictoryModal();
    }, 700);
  }

  showVictoryModal() {
    this.sound.playVictoryChime();
    const idPad = this.currentLevel < 10 ? `0${this.currentLevel}` : `${this.currentLevel}`;
    this.dom.victoryChamberName.textContent = `CHAMBER ${idPad} CALIBRATED`;
    this.dom.victoryScore.textContent = this.score;
    this.dom.victoryMoves.textContent = `${this.moves} (OPT: ${this.levelTargetMoves})`;
    this.dom.victoryTime.textContent = this.dom.valTime.textContent;
    this.dom.victoryBounces.textContent = `${this.lastTelemetry.bounces} / ${this.levelTargetBounces}`;

    this.dom.victoryStars.forEach((star, idx) => {
      star.classList.toggle('active', idx < this.starCount);
    });

    this.dom.modalLevelComplete.classList.remove('hidden');
  }

  // ==========================================================================
  // SCORING & TIMER (STEP 4)
  // ==========================================================================

  startTimerIfNeeded() {
    if (!this.startTime) {
      this.startTime = performance.now();
      if (!this.timerInterval) {
        this.timerInterval = setInterval(() => {
          if (this.startTime && !this.isPuzzleCompleted && !this.isSimulationPaused) {
            this.elapsedSeconds = Math.floor((performance.now() - this.startTime) / 1000);
            this.updateTimerDisplay();
          }
        }, 500);
      }
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (this.elapsedSeconds % 60).toString().padStart(2, '0');
    this.dom.valTime.textContent = `${mins}:${secs}`;
    this.dom.valTimeBonus.textContent = `+${Math.max(0, 300 - this.elapsedSeconds * 5)}`;
  }

  calculateScore() {
    let score = 1000;

    // Move penalty (-50)
    score -= this.moves * 50;

    // Surplus bounces penalty (-100)
    const surplusBounces = Math.max(0, this.lastTelemetry.bounces - this.levelTargetBounces);
    score -= surplusBounces * 100;

    // Efficiency bonus (+200) for target moves & bounces
    if (this.receiver && this.receiver.status === 'ACTIVATED') {
      if (this.moves <= this.levelTargetMoves && this.lastTelemetry.bounces <= this.levelTargetBounces) {
        score += 200;
      }
      // Time bonus
      const timeBonus = Math.max(0, Math.floor(300 - (this.elapsedSeconds * 5)));
      score += timeBonus;
    }

    this.score = Math.max(0, score);

    // Star Rating
    if (this.receiver && this.receiver.status === 'ACTIVATED') {
      if (this.score >= 850 && this.moves <= this.levelTargetMoves + 1) {
        this.starCount = 3;
      } else if (this.score >= 600) {
        this.starCount = 2;
      } else {
        this.starCount = 1;
      }
    } else {
      this.starCount = 0;
    }

    this.updateScoreDisplay();
  }

  updateScoreDisplay() {
    this.dom.valScore.textContent = this.score;
    this.dom.valMoves.textContent = this.moves;
    this.dom.stars.forEach((star, index) => {
      const starIndex = index + 1;
      star.classList.toggle('active', starIndex <= this.starCount);
      star.classList.toggle('empty', starIndex > this.starCount);
    });
  }

  commitMove() {
    this.moves++;
    this.startTimerIfNeeded();
    this.calculateScore();
  }

  // ==========================================================================
  // TELEMETRY & UI UPDATES (STEP 4)
  // ==========================================================================

  updateUiTelemetry() {
    const tele = this.lastTelemetry;

    // 3 Receiver States: INACTIVE | RECEIVING | ACTIVATED
    this.dom.valReceiverStatus.textContent = tele.receiverStatus;
    this.dom.valReceiverStatus.className = 'tele-value status-val';

    if (tele.receiverStatus === 'ACTIVATED') {
      this.dom.valReceiverStatus.classList.add('val-activated');
      this.dom.headerSystemState.className = 'status-indicator locked';
      this.dom.systemStateLabel.textContent = 'RECEIVER ACTIVATED';
    } else if (tele.receiverStatus === 'RECEIVING') {
      this.dom.valReceiverStatus.classList.add('val-receiving');
      this.dom.headerSystemState.className = 'status-indicator firing';
      this.dom.systemStateLabel.textContent = 'CHASSIS GRAZING';
    } else {
      this.dom.valReceiverStatus.classList.add('val-inactive');
      if (this.isBeamFired) {
        this.dom.headerSystemState.className = 'status-indicator firing';
        this.dom.systemStateLabel.textContent = 'BEAM ACTIVE';
      } else {
        this.dom.headerSystemState.className = 'status-indicator ready';
        this.dom.systemStateLabel.textContent = 'SYSTEM READY';
      }
    }

    this.dom.valBounces.textContent = `${tele.bounces} / 8`;
    this.dom.valIncidentAngle.textContent = tele.incidentAngle !== '--.-' ? `${tele.incidentAngle}°` : '--.-°';
    this.dom.valReflectionAngle.textContent = tele.reflectionAngle !== '--.-' ? `${tele.reflectionAngle}°` : '--.-°';
    this.dom.valEmitterAngle.textContent = `${tele.emitterAngle}°`;
    this.dom.valImpactSurface.textContent = tele.finalSurface;

    this.calculateScore();
  }

  selectEntity(entity, entityType = 'emitter') {
    if (this.emitter) this.emitter.isSelected = false;
    this.mirrors.forEach(m => (m.isSelected = false));
    this.refractionFields.forEach(rf => (rf.isSelected = false));

    this.activeEntity = entity;
    if (entity) entity.isSelected = true;

    // Update Tab Selection
    const tabs = this.dom.entitySelectorTabs.querySelectorAll('.entity-tab-btn');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.entity === entityType);
    });

    if (entity === this.emitter) {
      this.dom.selectedBadge.textContent = 'EMITTER (FIXED)';
      this.dom.hudActiveTarget.textContent = 'ACTIVE: EMITTER (FIXED)';
      this.dom.selectionName.textContent = 'LASER EMITTER [STATIONARY TURRET]';
      this.dom.selectionBanner.classList.remove('hidden');
    } else if (entity instanceof Mirror) {
      const idx = this.mirrors.indexOf(entity);
      this.dom.selectedBadge.textContent = `MIRROR 0${idx + 1} SELECTED`;
      this.dom.hudActiveTarget.textContent = `ACTIVE: MIRROR 0${idx + 1}`;
      this.dom.selectionName.textContent = `OPTICAL MIRROR 0${idx + 1}`;
      this.dom.selectionBanner.classList.remove('hidden');
    } else if (entity instanceof RefractionField) {
      const idx = this.refractionFields.indexOf(entity);
      this.dom.selectedBadge.textContent = `FIELD 0${idx + 1} SELECTED`;
      this.dom.hudActiveTarget.textContent = `ACTIVE: FIELD 0${idx + 1}`;
      this.dom.selectionName.textContent = `REFRACTION PRISM FIELD`;
      this.dom.selectionBanner.classList.remove('hidden');
    } else {
      this.dom.selectionBanner.classList.add('hidden');
    }

    this.updateActuatorForm();
  }

  updateActuatorForm() {
    if (!this.activeEntity) return;

    let angle = this.activeEntity.angle !== undefined ? this.activeEntity.angle : this.activeEntity.bendAngle;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;

    const rounded = Math.round(angle * 10) / 10;
    this.dom.sliderRotation.value = rounded;
    this.dom.numAngle.value = Math.round(rounded);

    if (this.activeEntity === this.emitter) {
      this.dom.actuatorLabel.textContent = 'EMITTER ORIENTATION (θ)';
    } else if (this.activeEntity instanceof Mirror) {
      const idx = this.mirrors.indexOf(this.activeEntity);
      this.dom.actuatorLabel.textContent = `MIRROR 0${idx + 1} ANGLE (θ)`;
    } else if (this.activeEntity instanceof RefractionField) {
      this.dom.actuatorLabel.textContent = `PRISM BEND ANGLE (Δθ)`;
    }
  }

  // ==========================================================================
  // INPUT & MODALS INTERACTION (STEPS 3, 5, 7)
  // ==========================================================================

  getCanvasCoords(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = evt.touches && evt.touches.length > 0 ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches && evt.touches.length > 0 ? evt.touches[0].clientY : evt.clientY;
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    return new Vec2((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  }

  togglePause() {
    this.isSimulationPaused = !this.isSimulationPaused;
    this.updatePauseUi();
  }

  updatePauseUi() {
    this.dom.pauseIcon.textContent = this.isSimulationPaused ? '▶' : '⏸';
    this.dom.pauseWatermark.classList.toggle('hidden', !this.isSimulationPaused);
  }

  hideModals() {
    this.dom.modalTitleScreen.classList.add('hidden');
    this.dom.modalLevelSelect.classList.add('hidden');
    this.dom.modalLevelComplete.classList.add('hidden');
    this.dom.modalPauseMenu.classList.add('hidden');
    if (this.dom.introKeyframeOverlay) {
      this.dom.introKeyframeOverlay.classList.add('hidden');
    }
  }

  showIntroKeyframe() {
    if (!this.dom.introKeyframeOverlay) return;
    this.dom.introKeyframeOverlay.classList.remove('hidden', 'unlocking');
    if (this.dom.introStatusText) {
      this.dom.introStatusText.innerHTML = `
        <span class="intro-blink-dot"></span>
        <span>GPT DEFENSE PROTOCOL ACTIVE • CLICK OR PRESS SPACE TO INITIALIZE</span>
      `;
    }
  }

  unlockIntroKeyframe() {
    if (!this.dom.introKeyframeOverlay) return;
    if (this.dom.introKeyframeOverlay.classList.contains('hidden') || this.dom.introKeyframeOverlay.classList.contains('unlocking')) return;

    this.sound.playUnlockSound();
    if (this.dom.introStatusText) {
      this.dom.introStatusText.innerHTML = `
        <span class="intro-blink-dot" style="background:#00e676;box-shadow:0 0 10px #00e676;"></span>
        <span style="color:#00e676;text-shadow:0 0 8px rgba(0,230,118,0.6);">ACCESS GRANTED // INITIALIZING TACTICAL CHAMBER...</span>
      `;
    }

    this.dom.introKeyframeOverlay.classList.add('unlocking');

    // Energy bloom on background HUD
    const cyberBg = document.getElementById('cyber-hud-bg');
    if (cyberBg) {
      cyberBg.classList.add('surge-active');
      setTimeout(() => cyberBg.classList.remove('surge-active'), 1400);
    }

    setTimeout(() => {
      this.dom.introKeyframeOverlay.classList.add('hidden');
      this.dom.introKeyframeOverlay.classList.remove('unlocking');
    }, 700);
  }

  renderLevelDirectory() {
    const grid = this.dom.levelDirectoryGrid;
    grid.innerHTML = '';

    CHAMBER_LEVELS.forEach(lvl => {
      const isUnlocked = this.progression.unlockedLevels.includes(lvl.id);
      const bestScore = this.progression.levelBestScores[lvl.id] || 0;
      const stars = this.progression.levelStars[lvl.id] || 0;
      const isCurrent = this.currentLevel === lvl.id;

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'active-current' : ''}`;

      card.innerHTML = `
        <div class="level-card-header">
          <span class="level-card-num">SECTOR ${lvl.id < 10 ? '0' + lvl.id : lvl.id}</span>
          <div class="level-card-stars">
            <span class="${stars >= 1 ? 'star-lit' : ''}">★</span>
            <span class="${stars >= 2 ? 'star-lit' : ''}">★</span>
            <span class="${stars >= 3 ? 'star-lit' : ''}">★</span>
          </div>
        </div>
        <div class="level-card-title">${lvl.title}</div>
        <div class="level-card-desc">${lvl.subtitle}</div>
        <div class="level-card-tag" style="font-family: var(--font-mono); font-size: 10px; color: var(--cyan-bright); font-weight: 700; margin-top: 2px;">${lvl.mechanicTag}</div>
        <div class="level-card-footer">
          <span class="level-card-score">${bestScore > 0 ? `BEST: ${bestScore} PTS` : 'UNCOMPLETED'}</span>
          <span class="level-card-badge ${isUnlocked ? (stars > 0 ? 'badge-completed' : 'badge-unlocked') : 'badge-locked'}">
            ${isUnlocked ? (stars > 0 ? 'CLEARED' : 'UNLOCKED') : 'LOCKED'}
          </span>
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.loadLevel(lvl.id);
          this.hideModals();
        });
      }

      grid.appendChild(card);
    });
  }

  bindEvents() {
    // Pointer Events
    const onPointerDown = (evt) => {
      if (this.isSimulationPaused) return;
      evt.preventDefault();
      const p = this.getCanvasCoords(evt);
      this.sound.init();

      if (this.emitter.containsAimHandle(p) || this.emitter.containsPoint(p)) {
        this.selectEntity(this.emitter, 'emitter');
        // Emitter is firmly anchored in place - dragging aims/rotates its beam orientation without changing position
        this.dragTarget = { entity: this.emitter, mode: 'aim', startAngle: this.emitter.angle };
        this.gameState = 'AIMING';
        return;
      }

      for (let i = 0; i < this.mirrors.length; i++) {
        const mirror = this.mirrors[i];
        if (mirror.containsRotationHandle(p)) {
          this.selectEntity(mirror, `mirror-${i}`);
          this.dragTarget = { entity: mirror, mode: 'rotate', startAngle: mirror.angle };
          return;
        }
        if (mirror.containsPoint(p)) {
          this.selectEntity(mirror, `mirror-${i}`);
          // If mirror is on rail, dragging moves it along rail or selects it
          this.dragTarget = { entity: mirror, mode: mirror.track ? 'rail_drag' : 'move', offset: mirror.pos.sub(p), startPos: mirror.pos.clone() };
          return;
        }
      }

      for (let i = 0; i < this.refractionFields.length; i++) {
        const rf = this.refractionFields[i];
        if (rf.containsPoint(p)) {
          this.selectEntity(rf, `field-${i}`);
          this.dragTarget = { entity: rf, mode: 'move', offset: rf.pos.sub(p), startPos: rf.pos.clone() };
          return;
        }
      }

      // Empty space click aims active emitter
      if (this.activeEntity === this.emitter) {
        const diff = p.sub(this.emitter.pos);
        const newAngle = Vec2.toDegrees(Math.atan2(diff.y, diff.x));
        if (Math.abs(newAngle - this.emitter.angle) > 0.5) {
          this.emitter.angle = newAngle;
          this.commitMove();
          this.updateRaycastingPhysics();
          this.updateActuatorForm();
          this.sound.playRotateClick();
        }
      }
    };

    const onPointerMove = (evt) => {
      const p = this.getCanvasCoords(evt);
      this.dom.hudPointerCoords.textContent = `X: ${Math.round(p.x).toString().padStart(3, '0')} | Y: ${Math.round(p.y).toString().padStart(3, '0')}`;

      if (!this.dragTarget || this.isSimulationPaused) return;
      evt.preventDefault();

      const { entity, mode, offset } = this.dragTarget;

      if (mode === 'move') {
        if (entity === this.emitter) return; // Emitter stays firmly in one place
        const margin = 50;
        let newX = Math.max(margin, Math.min(this.width - margin, p.x + offset.x));
        let newY = Math.max(margin, Math.min(this.height - margin, p.y + offset.y));
        entity.pos.set(newX, newY);
        this.updateRaycastingPhysics();
        this.updateUiTelemetry();
      } else if (mode === 'rail_drag' && entity.track) {
        // Drag along rail track
        const t = entity.track;
        const railVec = t.b.sub(t.a);
        const railLenSq = railVec.lengthSq();
        const ap = p.sub(t.a);
        const proj = Math.max(0, Math.min(1, ap.dot(railVec) / railLenSq));
        t.progress = proj;
        entity.pos = Vec2.lerp(t.a, t.b, proj);
        this.updateRaycastingPhysics();
        this.updateUiTelemetry();
      } else if (mode === 'rotate') {
        const diff = p.sub(entity.pos);
        entity.angle = Vec2.toDegrees(Math.atan2(diff.y, diff.x));
        this.updateRaycastingPhysics();
        this.updateUiTelemetry();
        this.updateActuatorForm();
      } else if (mode === 'aim') {
        const diff = p.sub(entity.pos);
        entity.angle = Vec2.toDegrees(Math.atan2(diff.y, diff.x));
        this.updateRaycastingPhysics();
        this.updateUiTelemetry();
        this.updateActuatorForm();
      }
    };

    const onPointerUp = () => {
      if (!this.dragTarget) return;
      const { entity, mode, startPos, startAngle } = this.dragTarget;
      let committed = false;

      if ((mode === 'move' || mode === 'rail_drag') && startPos) {
        if (entity.pos.dist(startPos) > 3) committed = true;
      } else if ((mode === 'rotate' || mode === 'aim') && startAngle !== undefined) {
        let diffAngle = Math.abs(entity.angle - startAngle) % 360;
        if (diffAngle > 180) diffAngle = 360 - diffAngle;
        if (diffAngle > 0.8) committed = true;
      }

      if (committed) {
        this.commitMove();
        this.sound.playRotateClick();
      }

      this.dragTarget = null;
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // Actuator Controls
    this.dom.sliderRotation.addEventListener('input', (evt) => {
      if (!this.activeEntity) return;
      const val = parseFloat(evt.target.value);
      if (this.activeEntity.angle !== undefined) {
        this.activeEntity.angle = val;
      } else if (this.activeEntity.bendAngle !== undefined) {
        this.activeEntity.bendAngle = val;
      }
      this.dom.numAngle.value = Math.round(val);
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
    });

    this.dom.sliderRotation.addEventListener('change', () => {
      this.commitMove();
      this.sound.playRotateClick();
    });

    this.dom.numAngle.addEventListener('change', (evt) => {
      if (!this.activeEntity) return;
      const val = parseFloat(evt.target.value) || 0;
      if (this.activeEntity.angle !== undefined) {
        this.activeEntity.angle = val;
      } else if (this.activeEntity.bendAngle !== undefined) {
        this.activeEntity.bendAngle = val;
      }
      this.dom.sliderRotation.value = val;
      this.commitMove();
      this.sound.playRotateClick();
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
    });

    const handleNudge = (delta) => {
      if (!this.activeEntity) return;
      if (this.activeEntity.angle !== undefined) {
        this.activeEntity.angle += delta;
      } else if (this.activeEntity.bendAngle !== undefined) {
        this.activeEntity.bendAngle += delta;
      }
      this.commitMove();
      this.sound.playRotateClick();
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
      this.updateActuatorForm();
    };

    this.dom.btnNudgeCcw10.addEventListener('click', () => handleNudge(-10));
    this.dom.btnNudgeCcw1.addEventListener('click', () => handleNudge(-1));
    this.dom.btnNudgeCw1.addEventListener('click', () => handleNudge(1));
    this.dom.btnNudgeCw10.addEventListener('click', () => handleNudge(10));

    this.dom.btnAimReceiver.addEventListener('click', () => {
      if (!this.activeEntity || !this.receiver) return;
      const diff = this.receiver.pos.sub(this.activeEntity.pos);
      this.activeEntity.angle = Vec2.toDegrees(Math.atan2(diff.y, diff.x));
      this.commitMove();
      this.sound.playRotateClick();
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
      this.updateActuatorForm();
    });

    this.dom.btnFire.addEventListener('click', () => this.triggerLaserFire());
    this.dom.btnReset.addEventListener('click', () => this.loadLevel(this.currentLevel));

    this.dom.chkPreview.addEventListener('change', (evt) => {
      this.previewTrajectory = evt.target.checked;
      this.updateRaycastingPhysics();
    });

    this.dom.chkReflectionMode.addEventListener('change', (evt) => {
      this.isReflectionMode = evt.target.checked;
      this.dom.reflectionModeLabel.textContent = this.isReflectionMode ? 'REFLECTION: ON' : 'RAYCAST ONLY: ON';
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
    });

    // Audio & Pause Toggles
    this.dom.btnAudioToggle.addEventListener('click', () => {
      this.sound.muted = !this.sound.muted;
      this.dom.audioIcon.textContent = this.sound.muted ? '🔇' : '🔊';
      this.progression.soundMuted = this.sound.muted;
      this.saveProgression();
    });

    this.dom.btnPauseToggle.addEventListener('click', () => this.togglePause());

    // Header Modal Launchers
    this.dom.btnOpenLevels.addEventListener('click', () => {
      this.renderLevelDirectory();
      this.dom.modalLevelSelect.classList.remove('hidden');
    });

    this.dom.btnCloseLevelSelect.addEventListener('click', () => {
      this.dom.modalLevelSelect.classList.add('hidden');
    });

    this.dom.btnOpenMenu.addEventListener('click', () => {
      this.dom.modalTitleScreen.classList.remove('hidden');
    });

    this.dom.btnResetProgress.addEventListener('click', () => {
      if (confirm('Reset all saved chamber sector progress?')) {
        localStorage.removeItem('vector_void_progress_v2');
        this.loadProgression();
        this.loadLevel(1);
      }
    });

    // Title Screen Actions
    this.dom.btnMenuContinue.addEventListener('click', () => this.hideModals());
    this.dom.btnMenuLevelSelect.addEventListener('click', () => {
      this.hideModals();
      this.renderLevelDirectory();
      this.dom.modalLevelSelect.classList.remove('hidden');
    });
    this.dom.btnMenuInstructions.addEventListener('click', () => {
      this.hideModals();
      this.switchDevelopmentStep(3);
    });

    // Victory Modal Actions
    this.dom.btnVictoryNext.addEventListener('click', () => {
      this.hideModals();
      if (this.currentLevel < CHAMBER_LEVELS.length) {
        this.loadLevel(this.currentLevel + 1);
      } else {
        alert('ALL CHAMBER SECTORS SUCCESSFULLY CALIBRATED! EXCELLENT WORK, OPERATOR.');
        this.renderLevelDirectory();
        this.dom.modalLevelSelect.classList.remove('hidden');
      }
    });

    this.dom.btnVictoryRetry.addEventListener('click', () => {
      this.hideModals();
      this.loadLevel(this.currentLevel);
    });

    this.dom.btnVictoryLevels.addEventListener('click', () => {
      this.hideModals();
      this.renderLevelDirectory();
      this.dom.modalLevelSelect.classList.remove('hidden');
    });

    // Pause Menu Actions
    this.dom.btnPauseResume.addEventListener('click', () => {
      this.isSimulationPaused = false;
      this.updatePauseUi();
      this.hideModals();
    });

    this.dom.btnPauseRetry.addEventListener('click', () => {
      this.isSimulationPaused = false;
      this.updatePauseUi();
      this.hideModals();
      this.loadLevel(this.currentLevel);
    });

    this.dom.btnPauseLevels.addEventListener('click', () => {
      this.hideModals();
      this.renderLevelDirectory();
      this.dom.modalLevelSelect.classList.remove('hidden');
    });

    this.dom.btnPauseMenu.addEventListener('click', () => {
      this.hideModals();
      this.dom.modalTitleScreen.classList.remove('hidden');
    });

    // Intro Keyframe Splash Events
    if (this.dom.btnEnterChamber) {
      this.dom.btnEnterChamber.addEventListener('click', () => this.unlockIntroKeyframe());
    }
    if (this.dom.introFrameChassis) {
      this.dom.introFrameChassis.addEventListener('click', () => this.unlockIntroKeyframe());
    }
    if (this.dom.btnSkipIntro) {
      this.dom.btnSkipIntro.addEventListener('click', () => {
        if (this.dom.introKeyframeOverlay) this.dom.introKeyframeOverlay.classList.add('hidden');
      });
    }
    if (this.dom.btnReplayIntro) {
      this.dom.btnReplayIntro.addEventListener('click', () => this.showIntroKeyframe());
    }
    if (this.dom.btnMenuIntro) {
      this.dom.btnMenuIntro.addEventListener('click', () => {
        this.hideModals();
        this.showIntroKeyframe();
      });
    }

    // Step Buttons
    this.dom.stepButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchDevelopmentStep(parseInt(btn.dataset.step, 10)));
    });

    this.dom.stageTabButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchDevelopmentStep(parseInt(btn.dataset.panel, 10)));
    });

    if (this.dom.btnToggleInfoFooter && this.dom.infoFooter) {
      this.dom.btnToggleInfoFooter.addEventListener('click', () => {
        const isCollapsed = this.dom.infoFooter.classList.toggle('collapsed');
        const icon = this.dom.btnToggleInfoFooter.querySelector('.toggle-icon');
        const text = this.dom.btnToggleInfoFooter.querySelector('.toggle-text-btn');
        if (icon) icon.textContent = isCollapsed ? '▲' : '▼';
        if (text) text.textContent = isCollapsed ? 'EXPAND' : 'COLLAPSE';
        this.dom.btnToggleInfoFooter.setAttribute('aria-expanded', (!isCollapsed).toString());
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (evt) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      // Handle active Intro Keyframe overlay
      if (this.dom.introKeyframeOverlay && !this.dom.introKeyframeOverlay.classList.contains('hidden')) {
        if (evt.code === 'Space' || evt.code === 'Enter') {
          evt.preventDefault();
          this.unlockIntroKeyframe();
          return;
        } else if (evt.code === 'Escape') {
          evt.preventDefault();
          this.dom.introKeyframeOverlay.classList.add('hidden');
          return;
        }
      }

      if (evt.code === 'Space') {
        evt.preventDefault();
        this.triggerLaserFire();
      } else if (evt.code === 'KeyR') {
        this.loadLevel(this.currentLevel);
      } else if (evt.code === 'KeyQ') {
        handleNudge(evt.shiftKey ? -5 : -1);
      } else if (evt.code === 'KeyE') {
        handleNudge(evt.shiftKey ? 5 : 1);
      } else if (evt.code === 'ArrowLeft') {
        handleNudge(-1);
      } else if (evt.code === 'ArrowRight') {
        handleNudge(1);
      } else if (evt.code === 'KeyP') {
        this.dom.chkPreview.checked = !this.dom.chkPreview.checked;
        this.previewTrajectory = this.dom.chkPreview.checked;
      } else if (evt.code === 'Escape') {
        this.togglePause();
      }
    });

    // Quick Level Tabs Click Handlers
    this.dom.quickLevelTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.dataset.level, 10);
        if (this.progression.unlockedLevels.includes(lvl)) {
          this.loadLevel(lvl);
        }
      });
    });
  }

  switchDevelopmentStep(stepNumber) {
    this.currentStep = stepNumber;
    this.dom.stepButtons.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.step, 10) === stepNumber));
    this.dom.stageTabButtons.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.panel, 10) === stepNumber));
    this.dom.stagePanels.forEach(panel => panel.classList.toggle('active', panel.id === `panel-step-${stepNumber}`));

    if (stepNumber === 1) {
      this.isReflectionMode = false;
      this.dom.chkReflectionMode.checked = false;
      this.dom.reflectionModeLabel.textContent = 'RAYCAST ONLY: ON';
    } else {
      this.isReflectionMode = true;
      this.dom.chkReflectionMode.checked = true;
      this.dom.reflectionModeLabel.textContent = 'REFLECTION: ON';
    }

    this.updateRaycastingPhysics();
    this.updateUiTelemetry();
  }

  triggerLaserFire() {
    this.sound.playLaserHum();
    this.isBeamFired = true;
    this.fireTimer = 1.0;
    this.gameState = 'BEAM_FIRED';
    this.dom.btnFire.classList.add('firing-active');
    this.startTimerIfNeeded();

    const cyberBg = document.getElementById('cyber-hud-bg');
    if (cyberBg) {
      cyberBg.classList.add('surge-active');
    }

    setTimeout(() => {
      this.dom.btnFire.classList.remove('firing-active');
      this.isBeamFired = false;
      if (cyberBg) {
        cyberBg.classList.remove('surge-active');
      }
      if (this.receiver && this.receiver.status === 'ACTIVATED') {
        this.gameState = 'RECEIVER_ACQUIRED';
      } else {
        this.gameState = 'READY';
      }
      this.updateUiTelemetry();
    }, 1200);

    this.updateRaycastingPhysics();
    this.updateUiTelemetry();
  }

  // ==========================================================================
  // RENDERING & SIMULATION LOOP (STEP 6, 7)
  // ==========================================================================

  render(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000);
    this.lastFrameTime = currentTime;

    // 1. Update Dynamic Advanced Mechanics (Moving mirrors, Timed gates, Black holes)
    let needsPhysicsUpdate = false;

    if (!this.isSimulationPaused) {
      this.mirrors.forEach(m => {
        if (m.track) {
          m.update(dt, this.isSimulationPaused);
          needsPhysicsUpdate = true;
        }
      });

      this.timedGates.forEach(g => {
        const changed = g.update(dt, this.isSimulationPaused);
        if (changed) {
          needsPhysicsUpdate = true;
          this.sound.playGateToggle();
        }
      });

      if (this.blackHoles && this.blackHoles.length > 0) {
        this.blackHoles.forEach(bh => bh.update(dt * 1000));
      }
    }

    if (needsPhysicsUpdate) {
      this.updateRaycastingPhysics();
      this.updateUiTelemetry();
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 2. Render Layers
    this.renderTechnicalGrid(ctx);
    this.renderRails(ctx);
    this.renderChamberWalls(ctx);
    this.renderGravityZones(ctx, currentTime);
    this.renderBlackHoles(ctx, currentTime);
    this.renderTimedGates(ctx, currentTime);
    this.renderRefractionFields(ctx, currentTime);
    this.renderReceiver(ctx, currentTime);
    this.renderMirrors(ctx);
    this.renderEmitter(ctx);

    if (this.previewTrajectory || this.isBeamFired) {
      this.renderLaserBeam(ctx, currentTime);
    }

    requestAnimationFrame(this.render);
  }

  renderGravityZones(ctx, currentTime) {
    if (!this.gravityZones || this.gravityZones.length === 0) return;

    ctx.save();
    this.gravityZones.forEach((gz) => {
      ctx.save();
      ctx.translate(gz.pos.x, gz.pos.y);

      // 1. Subtle translucent force-field fill
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(gz.radiusX, gz.radiusY));
      grad.addColorStop(0, 'rgba(0, 170, 255, 0.16)');
      grad.addColorStop(0.7, 'rgba(0, 102, 255, 0.08)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.01)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, gz.radiusX, gz.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Neon cyan/blue boundary with animated dash
      const dashOffset = (currentTime * 0.02) % 20;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -dashOffset;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Secondary inner ring
      ctx.strokeStyle = 'rgba(0, 102, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 8]);
      ctx.lineDashOffset = dashOffset;
      ctx.beginPath();
      ctx.ellipse(0, 0, gz.radiusX * 0.65, gz.radiusY * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Animated downward flowing flux chevrons (showing force vector direction)
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      const numRays = 3;
      const spacingX = gz.radiusX * 0.45;
      for (let r = -numRays + 1; r < numRays; r++) {
        const rx = r * (spacingX / numRays);
        const maxH = Math.sqrt(Math.max(0, 1 - (rx * rx) / (gz.radiusX * gz.radiusX))) * gz.radiusY * 0.75;
        if (maxH < 15) continue;

        // Flow phase
        const flowY = ((currentTime * 0.06 + Math.abs(r) * 30) % (maxH * 2)) - maxH;
        const alpha = Math.max(0, 1 - Math.abs(flowY) / maxH) * 0.6;

        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        // Downward chevron: \ /
        ctx.moveTo(rx - 7, flowY - 4);
        ctx.lineTo(rx, flowY + 3);
        ctx.lineTo(rx + 7, flowY - 4);
        ctx.stroke();
      }

      // 4. Tactical HUD Label
      ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.font = '700 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`GRAVITY FIELD [↓ ${(gz.strength * 10).toFixed(1)}G]`, 0, gz.radiusY - 8);

      ctx.restore();
    });
    ctx.restore();
  }

  renderBlackHoles(ctx, currentTime) {
    if (!this.blackHoles || this.blackHoles.length === 0) return;

    ctx.save();
    this.blackHoles.forEach((bh) => {
      ctx.save();
      ctx.translate(bh.pos.x, bh.pos.y);

      // 1. Gravitational Influence Boundary (Dashed outer perimeter)
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -(currentTime * 0.01) % 20;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, bh.influenceRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Influence Field Radial Distortion Vignette
      const infGrad = ctx.createRadialGradient(0, 0, bh.horizonRadius, 0, 0, bh.influenceRadius);
      infGrad.addColorStop(0, 'rgba(147, 51, 234, 0.22)');
      infGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)');
      infGrad.addColorStop(1, 'rgba(168, 85, 247, 0.01)');
      ctx.fillStyle = infGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bh.influenceRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Swirling Inflowing Particle Disk
      bh.particles.forEach(pt => {
        const px = Math.cos(pt.angle) * pt.dist;
        const py = Math.sin(pt.angle) * pt.dist;
        const normDist = (pt.dist - bh.horizonRadius) / (bh.influenceRadius - bh.horizonRadius);
        const alpha = Math.max(0.1, 1 - normDist);
        ctx.fillStyle = pt.hue === 275 ? `rgba(192, 132, 252, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Swirling Luminous Accretion Disk (Rotational Vortex)
      const swirlAngle = (currentTime * 0.0018 + bh.pulsePhase);
      ctx.save();
      ctx.rotate(swirlAngle);

      // Luminous Accretion Halo
      const accGrad = ctx.createRadialGradient(0, 0, bh.horizonRadius * 0.8, 0, 0, bh.horizonRadius * 2.2);
      accGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      accGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.85)');
      accGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.6)');
      accGrad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

      ctx.fillStyle = accGrad;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, bh.horizonRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Accretion Disk Spiral Streamers
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
      ctx.lineWidth = 2.2;
      for (let s = 0; s < 3; s++) {
        const off = (s * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, bh.horizonRadius * 1.35, off, off + Math.PI * 0.75);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Void Core / Event Horizon (Dark black circular center)
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#030712'; // Deepest cosmic void
      ctx.beginPath();
      ctx.arc(0, 0, bh.horizonRadius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle Event Horizon Neon Rim
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, bh.horizonRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Tactical HUD text
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(192, 132, 252, 0.85)';
      ctx.font = '700 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SINGULARITY [${bh.id}]`, 0, -bh.influenceRadius - 5);

      ctx.restore();
    });
    ctx.restore();
  }

  renderTechnicalGrid(ctx) {
    ctx.save();
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Deep cosmic space gradient
    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 550);
    grad.addColorStop(0, '#071638');
    grad.addColorStop(0.45, '#040d26');
    grad.addColorStop(1, '#020514');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Distant cosmic star particles (seeded coordinates)
    if (!this._stars) {
      this._stars = [];
      let s = 12345;
      for (let i = 0; i < 90; i++) {
        s = (s * 16807) % 2147483647;
        const x = (s % 960);
        s = (s * 16807) % 2147483647;
        const y = (s % 540);
        s = (s * 16807) % 2147483647;
        const r = (s % 20) / 10 + 0.5;
        this._stars.push({ x, y, r, speed: (i % 3) + 1 });
      }
    }

    const t = performance.now() * 0.001;
    this._stars.forEach((star, i) => {
      const alpha = 0.35 + 0.45 * Math.sin(t * star.speed + i);
      ctx.fillStyle = `rgba(180, 230, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Subtle tactical coordinate grid
    ctx.strokeStyle = 'rgba(0, 180, 255, 0.06)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < this.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = 0; y < this.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }

    // Sector Major Lines with tick marks
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.15)';
    for (let x = 0; x < this.width; x += 160) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 120) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }

    // Center Tactical Crosshair / Orbit Ring (from Reference Image Panel 2)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    const tickLen = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy); ctx.lineTo(cx - 56 + tickLen, cy);
    ctx.moveTo(cx + 56 - tickLen, cy); ctx.lineTo(cx + 56, cy);
    ctx.moveTo(cx, cy - 56); ctx.lineTo(cx, cy - 56 + tickLen);
    ctx.moveTo(cx, cy + 56 - tickLen); ctx.lineTo(cx, cy + 56);
    ctx.stroke();

    ctx.restore();
  }

  renderRails(ctx) {
    ctx.save();
    this.mirrors.forEach(m => {
      if (!m.track) return;
      const { a, b } = m.track;

      // Track slot
      ctx.strokeStyle = '#1a283e';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

      // Slotted groove
      ctx.strokeStyle = '#0a101d';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

      // End stoppers
      [a, b].forEach(pt => {
        ctx.fillStyle = '#ffb300';
        ctx.fillRect(pt.x - 4, pt.y - 8, 8, 16);
      });
    });
    ctx.restore();
  }

  renderChamberWalls(ctx) {
    ctx.save();
    this.walls.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(w.a.x, w.a.y);
      ctx.lineTo(w.b.x, w.b.y);

      if (w.type === 'obstacle') {
        ctx.strokeStyle = '#ffb300';
        ctx.lineWidth = 8;
        ctx.lineCap = 'square';
        ctx.stroke();

        ctx.strokeStyle = '#111a28';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#293d58';
        ctx.lineWidth = 6;
        ctx.lineCap = 'square';
        ctx.stroke();

        ctx.strokeStyle = '#0e1726';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  renderTimedGates(ctx, currentTime) {
    ctx.save();
    this.timedGates.forEach(g => {
      const open = g.isOpen;
      const progress = g.getProgress();

      if (open) {
        // Open Gate: Retracted posts with green clearance indicators
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(g.a.x, g.a.y); ctx.lineTo(g.b.x, g.b.y); ctx.stroke();
        ctx.setLineDash([]);

        [g.a, g.b].forEach(pt => {
          ctx.fillStyle = '#00e676';
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2); ctx.fill();
        });
      } else {
        // Closed Gate: Solid heavy barrier with pulsing amber hazard LEDs
        const pulse = Math.sin(currentTime * 0.008) * 0.2 + 0.8;
        ctx.strokeStyle = `rgba(255, 179, 0, ${pulse})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'square';
        ctx.beginPath(); ctx.moveTo(g.a.x, g.a.y); ctx.lineTo(g.b.x, g.b.y); ctx.stroke();

        ctx.strokeStyle = '#101828';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Status LED
        const mid = g.a.add(g.b).scale(0.5);
        ctx.fillStyle = '#ff2a4b';
        ctx.shadowColor = '#ff2a4b';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(mid.x, mid.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    ctx.restore();
  }

  renderRefractionFields(ctx, currentTime) {
    ctx.save();
    this.refractionFields.forEach((rf, idx) => {
      const rot = currentTime * 0.001;

      // Outer refractive aura
      ctx.fillStyle = 'rgba(0, 210, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rf.pos.x, rf.pos.y, rf.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating optical prism ring
      ctx.save();
      ctx.translate(rf.pos.x, rf.pos.y);
      ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, rf.radius - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Label
      ctx.fillStyle = '#00d2ff';
      ctx.font = '700 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PRISM ${rf.bendAngle > 0 ? '+' : ''}${rf.bendAngle}°`, rf.pos.x, rf.pos.y + 3);
    });
    ctx.restore();
  }

  renderReceiver(ctx, currentTime) {
    if (!this.receiver) return;
    const r = this.receiver;
    const activated = r.status === 'ACTIVATED';
    const receiving = r.status === 'RECEIVING';

    ctx.save();
    ctx.translate(r.pos.x, r.pos.y);
    ctx.rotate(Vec2.toRadians(r.angle));

    // Outer Tactical Targeting Reticle (from Reference Image Panel 2)
    const pulse = Math.sin(currentTime * 0.008) * 0.2 + 0.8;
    const reticleColor = activated ? '#00e676' : (receiving ? '#00f0ff' : 'rgba(0, 208, 255, 0.45)');
    ctx.strokeStyle = reticleColor;
    ctx.lineWidth = activated ? 2.5 : 1.5;
    if (activated) {
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 18 * pulse;
    }

    // Reticle Ring & Crosshair Ticks
    const reticleR = Math.max(r.width, r.height) / 2 + 14;
    ctx.beginPath();
    ctx.arc(0, 0, reticleR, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Ticks on reticle
    const tLen = 7;
    ctx.beginPath();
    ctx.moveTo(-reticleR - tLen, 0); ctx.lineTo(-reticleR, 0);
    ctx.moveTo(reticleR, 0); ctx.lineTo(reticleR + tLen, 0);
    ctx.moveTo(0, -reticleR - tLen); ctx.lineTo(0, -reticleR);
    ctx.moveTo(0, reticleR); ctx.lineTo(0, reticleR + tLen);
    ctx.stroke();

    // Housing Base (Sci-Fi Pod)
    ctx.fillStyle = '#06132d';
    ctx.strokeStyle = activated ? '#00e676' : (receiving ? '#00d2ff' : '#0088ff');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-r.width / 2, -r.height / 2, r.width, r.height);
    ctx.fill();
    ctx.stroke();

    // Sensor Lens Aperture (Front Face)
    ctx.fillStyle = activated ? '#00e676' : (receiving ? '#00f0ff' : '#0a224a');
    ctx.strokeStyle = activated ? '#b9f6ca' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(r.width / 2 - 8, -r.height / 2 + 4, 8, r.height - 8);
    ctx.fill();
    ctx.stroke();

    // Optical Core Diode
    ctx.fillStyle = activated ? '#ffffff' : '#00f0ff';
    ctx.beginPath();
    ctx.arc(r.width / 2 - 4, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Receptive Status Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = activated ? '#00e676' : (receiving ? '#00f0ff' : '#88b0d4');
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(activated ? 'LOCKED' : (receiving ? 'RECEIVING' : 'TARGET'), -8, 3);

    ctx.restore();
  }

  renderMirrors(ctx) {
    ctx.save();
    this.mirrors.forEach((m, idx) => {
      const { a, b } = m.getEndpoints();
      const normal = m.getSegment().getNormal();

      // Selected Ring
      if (m.isSelected) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(m.pos.x, m.pos.y, m.length / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Surface Normal Arrow
        const normalEnd = m.pos.add(normal.scale(34));
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.pos.x, m.pos.y);
        ctx.lineTo(normalEnd.x, normalEnd.y);
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.font = '600 9px monospace';
        ctx.fillText('N', normalEnd.x + 4, normalEnd.y);
      }

      // Metal Backing with Dark Glass
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#06132b';
      ctx.lineWidth = m.thickness + 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Optical Reflective Front Face (Electric Cyan / Specular)
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = m.isSelected ? '#ffffff' : '#00f0ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'butt';
      ctx.shadowColor = '#00d2ff';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Mounting Pivot
      ctx.fillStyle = m.isSelected ? '#00f0ff' : (m.track ? '#ffb300' : '#0a2452');
      ctx.strokeStyle = '#00c8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.pos.x, m.pos.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotation Handles
      [a, b].forEach(pt => {
        ctx.fillStyle = '#030a1c';
        ctx.strokeStyle = m.isSelected ? '#ffffff' : '#00d2ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Label Tag
      ctx.fillStyle = '#a2d6ff';
      ctx.font = '700 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`M-0${idx + 1}${m.track ? ' [RAIL]' : ''}`, m.pos.x, m.pos.y - 14);
    });
    ctx.restore();
  }

  renderEmitter(ctx) {
    const e = this.emitter;
    if (!e) return;

    ctx.save();

    // Fixed Station Turret Platform (Firmly Anchored to Chamber Floor)
    ctx.strokeStyle = 'rgba(0, 208, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(e.pos.x, e.pos.y, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Mooring Anchor Bolts
    const brR = e.radius + 6;
    ctx.fillStyle = '#06132b';
    ctx.strokeStyle = '#00c8ff';
    ctx.lineWidth = 1.5;
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(ang => {
      const bx = e.pos.x + Math.cos(ang) * brR;
      const by = e.pos.y + Math.sin(ang) * brR;
      ctx.fillRect(bx - 3, by - 3, 6, 6);
      ctx.strokeRect(bx - 3, by - 3, 6, 6);
    });

    // Calibrated Outer Azimuth Ring
    ctx.strokeStyle = 'rgba(0, 208, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(e.pos.x, e.pos.y, e.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(e.pos.x, e.pos.y);
    ctx.rotate(Vec2.toRadians(e.angle));

    // Dual Plasma Thruster Trails (Matching Starfighter in Reference Image)
    const thrustGlow = ctx.createRadialGradient(-e.radius - 4, 0, 2, -e.radius - 12, 0, 16);
    thrustGlow.addColorStop(0, '#ffffff');
    thrustGlow.addColorStop(0.3, '#00f0ff');
    thrustGlow.addColorStop(0.7, '#0066ff');
    thrustGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = thrustGlow;
    ctx.beginPath();
    ctx.ellipse(-e.radius - 8, 0, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (e.isSelected) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, e.barrelLength + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Forward Laser Cannon Barrel
    ctx.fillStyle = '#081a3d';
    ctx.strokeStyle = '#00c8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(0, -6, e.barrelLength, 12);
    ctx.fill();
    ctx.stroke();

    // Muzzle Emitter Aperture Glow
    const isFiring = this.isBeamFired;
    ctx.fillStyle = isFiring ? '#ffffff' : '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = isFiring ? 18 : 8;
    ctx.beginPath();
    ctx.arc(e.barrelLength, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Aerospace Hull Chassis (Fighter Core)
    ctx.fillStyle = '#05112a';
    ctx.strokeStyle = e.isSelected ? '#00f0ff' : '#0088ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(e.radius + 4, 0);
    ctx.lineTo(-e.radius * 0.5, -e.radius);
    ctx.lineTo(-e.radius, -e.radius * 0.6);
    ctx.lineTo(-e.radius * 0.8, 0);
    ctx.lineTo(-e.radius, e.radius * 0.6);
    ctx.lineTo(-e.radius * 0.5, e.radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit / Energy Core
    ctx.fillStyle = isFiring ? '#ffffff' : '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderLaserBeam(ctx, currentTime) {
    if (!this.lastTrajectory || this.lastTrajectory.length === 0) return;

    ctx.save();
    const isFiring = this.isBeamFired;
    const beamAlpha = isFiring ? 1.0 : 0.8;
    const pulse = Math.sin(currentTime * 0.015) * 0.15 + 0.85;

    // Wide Atmospheric Blue Halo (Matching Twin Blue Lasers in Reference Image)
    ctx.strokeStyle = `rgba(0, 102, 255, ${0.45 * beamAlpha * pulse})`;
    ctx.lineWidth = isFiring ? 14 : 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = isFiring ? 30 : 16;

    ctx.beginPath();
    this.lastTrajectory.forEach((seg, i) => {
      if (i === 0) ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
    });
    ctx.stroke();

    // Vibrant Electric Cyan Core
    ctx.strokeStyle = isFiring ? '#70f6ff' : '#00f0ff';
    ctx.lineWidth = isFiring ? 6 : 3.5;
    ctx.beginPath();
    this.lastTrajectory.forEach((seg, i) => {
      if (i === 0) ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
    });
    ctx.stroke();

    // Intense White-Hot Core Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = isFiring ? 2.5 : 1.5;
    ctx.beginPath();
    this.lastTrajectory.forEach((seg, i) => {
      if (i === 0) ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
    });
    ctx.stroke();

    // Sparks & Reflection Nodes
    this.lastTrajectory.forEach((seg, i) => {
      if (!seg.hit) return;
      const pt = seg.hit.point;
      const st = seg.hit.segment.surfaceType;

      if (st === 'black_hole') {
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = isFiring ? 32 : 18;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isFiring ? 10 : 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (isFiring ? 16 : 10) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#c084fc';
        ctx.font = '700 9px monospace';
        ctx.fillText('ABSORBED', pt.x + 8, pt.y - 8);
        return;
      }

      ctx.fillStyle = st === 'receiver' ? '#00e676' : (st === 'refraction_field' ? '#00f0ff' : '#00d2ff');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = isFiring ? 24 : 14;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isFiring ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing energy ring at impact
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (isFiring ? 10 : 7) * pulse, 0, Math.PI * 2);
      ctx.stroke();

      if (st === 'mirror') {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00f0ff';
        ctx.font = '700 10px monospace';
        ctx.fillText(`B${i + 1}`, pt.x + 8, pt.y - 8);
      }
    });

    ctx.restore();
  }
}

// ============================================================================
// 7. APPLICATION BOOTSTRAP
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  const engine = new VectorVoidEngine();
  window.VECTOR_VOID_ENGINE = engine;
});
