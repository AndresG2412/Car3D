import * as THREE from "three";
import { type EngineSpec, liftAt } from "./kinematics";

type P2 = [number, number];

export function circle(cx: number, cy: number, r: number, n: number, from = 0, span = Math.PI * 2): P2[] {
  const closed = span >= Math.PI * 2 - 1e-6;
  return Array.from({ length: n }, (_, i) => {
    const a = from + (span * i) / (closed ? n : n - 1);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

export function hull(points: P2[]): P2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: P2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Extrudes a profile drawn in the (y, z) plane along x, from x0 to x1. */
export function extrudeX(profile: P2[], x0: number, x1: number, holes: P2[][] = []) {
  const shape = new THREE.Shape(profile.map(([y, z]) => new THREE.Vector2(y, z)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([y, z]) => new THREE.Vector2(y, z))));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: 24 });
  geometry.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, x0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  return geometry;
}

/** A turned part from an (r, y) profile around the vertical axis. */
export function turned(profile: P2[], segments = 20) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** A round bar along x. */
export function barX(radius: number, x0: number, x1: number, segments = 16) {
  const geometry = new THREE.CylinderGeometry(radius, radius, x1 - x0, segments);
  geometry.rotateZ(Math.PI / 2);
  geometry.translate((x0 + x1) / 2, 0, 0);
  return geometry;
}

/** A crank web: hub around the main journal, boss around the pin (at +y), counterweight opposite. */
export function crankWeb(throw_: number, x0: number, x1: number) {
  return extrudeX(hull([...circle(0, 0, 22, 36), ...circle(throw_, 0, 16, 28), ...circle(0, 0, 48, 15, Math.PI - 0.95, 1.9)]), x0, x1);
}

/** A connecting rod lying along +y from the big end (origin) to the small end. */
export function connectingRod(length: number) {
  return extrudeX(hull([...circle(0, 0, 19, 32), ...circle(length, 0, 11, 24)]), -6, 6, [circle(0, 0, 12, 24).reverse(), circle(length, 0, 5, 16).reverse()]);
}

/**
 * A cam lobe whose radius at each material angle is the base circle plus the valve lift
 * for the crank angle at which that point faces straight down, with the cam turning at
 * half crank speed (rotation.x = theta / 2).
 */
export function camLobe(spec: EngineSpec, window: [number, number], baseRadius: number, x0: number, x1: number) {
  const points: P2[] = [];
  for (let i = 0; i < 120; i++) {
    const alpha = (i / 120) * Math.PI * 2;
    const theta = (2 * (Math.PI - alpha) * 180) / Math.PI;
    const r = baseRadius + liftAt(spec, theta, window);
    points.push([r * Math.cos(alpha), r * Math.sin(alpha)]);
  }
  return extrudeX(hull(points), x0, x1, [circle(0, 0, 3, 12).reverse()]);
}

/** A block section with a round bore, extruded upward. */
export function boredBlock(size: number, boreRadius: number, y0: number, y1: number) {
  const half = size / 2;
  const shape = new THREE.Shape([new THREE.Vector2(-half, -half), new THREE.Vector2(half, -half), new THREE.Vector2(half, half), new THREE.Vector2(-half, half)]);
  shape.holes.push(new THREE.Path(circle(0, 0, boreRadius, 40).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 40 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y0, 0);
  return geometry;
}

/** Points of a coil spring standing on y = 0, one unit tall (scale it in y). */
export function helix(radius: number, turns: number, perTurn = 28) {
  const points: [number, number, number][] = [];
  const n = Math.round(turns * perTurn);
  for (let i = 0; i <= n; i++) {
    const a = (i / perTurn) * Math.PI * 2;
    points.push([radius * Math.cos(a), i / n, radius * Math.sin(a)]);
  }
  return points;
}
