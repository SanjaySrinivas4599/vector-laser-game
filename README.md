# VECTOR_VOID — 2D Laser-Reflection Puzzle Game & Optical Physics Simulator

A complete, playable 2D laser-reflection puzzle game and optical physics simulator inspired by aerospace testing chambers. Built strictly using **HTML5**, **CSS3**, **vanilla JavaScript (ES6+)**, and the **HTML Canvas API** (zero external frameworks or game engines).

---

## 🚀 Quick Start Instructions

### Option 1: Direct File Launch (No installation needed)
Double-click `index.html` to open and play directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Run via Built-in Local HTTP Server
```bash
node server.js
```
Then navigate to: **http://localhost:3000**

---

## 🎮 Game Features & Mechanics

- **21 Solvable Optical Chambers**: Progressively designed puzzles ranging from basic reflection to complex gravitational singularities and kinetic rails.
- **Snell's Law Specular Reflection**: Accurate 2D vector reflection ($\theta_i = \theta_r$) supporting up to 8 recursive bounces.
- **Gravitational Singularity Wells (Black Holes)**:
  - Dynamic visual event horizon, glowing accretion disk, and orbiting particle vortex.
  - Continuous radial distance-weighted beam bending ($\vec{a} \propto \frac{G}{r} \hat{u}$).
  - Event horizon photon absorption with expanding singularity shockwave effect.
- **Downward Gravity Zones**:
  - Translucent cyber-force fields with animated downward chevron flux lines.
  - Parabolic downward trajectory bending with smooth entry and exit transitions.
- **Kinetic Slider Rails**: Adjustable translation tracks for linear mirror movement.
- **Pulsed Aperture Gates**: Periodic oscillating barrier gates that open and close on timed intervals.
- **Refraction Prisms**: Optical chambers altering beam velocity and direction based on medium refractive indices.
- **Tactical Cyber-HUD UI**: Real-time incident telemetry, angular coordinates, oscilloscope sound synthesis, and level directory modal.

---

## ⌨️ Controls & Interactions

- **Move Objects**: Click and drag the **Laser Emitter** or **Mirrors** inside the chamber boundaries.
- **Aim Laser**: Click and drag the emitter's barrel tip, or click anywhere inside the chamber to aim.
- **Rotate Mirrors**: Click a mirror to select it, then:
  - Drag the circular rotation handles on either end.
  - Use the angle slider or numeric degree input in the control panel.
  - Click the **`-10°`**, **`-1°`**, **`+1°`**, **`+10°`** nudge buttons.
  - Press keyboard keys **`[Q]`** (counter-clockwise) or **`[E]`** (clockwise). Hold `[Shift]` for $5^\circ$ increments.
- **Auto-Aim Target**: Click **`AIM TARGET`** to automatically orient toward the receiver sensor.
- **Fire Laser**: Click **`FIRE BEAM`** or press **`[Space]`**.
- **Reset Puzzle**: Click **`RESET PUZZLE`** or press **`[R]`**.
- **Toggle Trajectory Preview**: Checkbox in top bar or press **`[P]`**.
- **Quick Level Select**: Use the scrollable top bar (`01` through `21`) or open the **Level Directory** modal.

---

## 🔬 Physics & Mathematics

### 1. Ray-Segment Intersection
Ray equation:
$$\mathbf{P}(t) = \mathbf{O} + t \cdot \mathbf{D}, \quad t \ge 0$$

Obstacle segment between endpoints $\mathbf{A}$ and $\mathbf{B}$:
$$\mathbf{Q}(s) = \mathbf{A} + s \cdot (\mathbf{B} - \mathbf{A}), \quad s \in [0, 1]$$

Intersection parameters via 2D cross-product determinants:
$$t = \frac{(\mathbf{A} - \mathbf{O}) \times (\mathbf{B} - \mathbf{A})}{\mathbf{D} \times (\mathbf{B} - \mathbf{A})}, \quad s = \frac{(\mathbf{A} - \mathbf{O}) \times \mathbf{D}}{\mathbf{D} \times (\mathbf{B} - \mathbf{A})}$$

### 2. Specular Reflection Law
$$\mathbf{R} = \mathbf{D} - 2(\mathbf{D} \cdot \mathbf{N})\mathbf{N}$$
- $\mathbf{D}$: Incoming incident unit vector ($\|\mathbf{D}\| = 1$).
- $\mathbf{N}$: Surface normal unit vector opposing incoming ray ($\mathbf{D} \cdot \mathbf{N} < 0$).
- $\mathbf{R}$: Reflected unit direction vector ($\|\mathbf{R}\| = 1$).

### 3. Adaptive Ray-Marching in Gravitational Fields
When passing through downward gravity fields or singularity influence zones:
$$\mathbf{v}_{n+1} = \text{normalize}\left(\mathbf{v}_n + \mathbf{a}(\mathbf{x}_n) \cdot \Delta t\right)$$
$$\mathbf{x}_{n+1} = \mathbf{x}_n + \mathbf{v}_{n+1} \cdot ds$$
Where $ds = 4.0\text{ px}$, maintaining smooth continuous curves and specular bounce detection at boundary intersections.

### 4. Scoring System
$$\text{Score} = \max\left(0, \; 1000 - 50 \times \text{Moves} - 100 \times \text{Surplus Bounces} + \text{Time Bonus}\right)$$
- **★★★ 3 Stars**: Score $\ge 850$ pts (optimal moves & bounces).
- **★★☆ 2 Stars**: Score $\ge 600$ pts.
- **★☆☆ 1 Star**: Score $> 0$ pts upon completion.

---

## 📁 Project Structure

```
vector project/
├── index.html        # Game layout, HUD overlays, control panels, audio synth, level modal
├── style.css         # Cyber-HUD neon styling, responsive layout, scrollable tabs
├── script.js         # Vector math, raycasting, reflection, gravity fields, black holes, 21 levels
├── server.js         # Zero-dependency local Node.js HTTP server (port 3000)
├── test_physics.js   # Foundational physics and reflection unit tests
├── test_step4to8.js  # Complete 58-test verification suite covering all mechanics & 21 levels
├── assets/           # Audio, keyframes, and visual assets
└── README.md         # Documentation and guide
```

---

## 🧪 Testing

Run the full verification test suite:
```bash
node test_step4to8.js
```
All 58 automated unit tests verify vector math, reflection formulas, gravity stepping, singularity absorption, and solvability across all 21 chambers.
