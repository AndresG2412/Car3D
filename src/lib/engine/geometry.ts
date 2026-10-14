import * as THREE from "three";
import { type EngineSpec, layoutOf, liftAt } from "./kinematics";

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

/** A block with round bores at each x, extruded upward from y0 to y1. */
export function boredBlock(width: number, depth: number, bores: number[], boreRadius: number, y0: number, y1: number) {
  const [w, d] = [width / 2, depth / 2];
  const shape = new THREE.Shape([new THREE.Vector2(-w, -d), new THREE.Vector2(w, -d), new THREE.Vector2(w, d), new THREE.Vector2(-w, d)]);
  for (const x of bores) shape.holes.push(new THREE.Path(circle(x, 0, boreRadius, 40).reverse().map(([px, py]) => new THREE.Vector2(px, py))));
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

/**
 * Outline of a hollow piston from the crown down, with three ring grooves (top compression,
 * second, oil control), in (r, y) with the wrist pin at y = 0.
 */
export function pistonProfile(R: number, ch: number): P2[] {
  const rp = R - 0.1;
  const rg = R - 3.6;
  const groove = (top: number, bottom: number): P2[] => [[rp, ch - top], [rg, ch - top], [rg, ch - bottom], [rp, ch - bottom]];
  return [[0, ch], [rp, ch], ...groove(5, 6.2), ...groove(9, 10.5), ...groove(13.5, 16), [rp, ch - 56], [rp - 3, ch - 56], [rp - 3, ch - 8], [0, ch - 8]];
}

/** Every reusable piece of one cylinder, in mm, built once from the spec. */
export function engineParts(spec: EngineSpec) {
  const L = layoutOf(spec);
  const ch = spec.compressionHeightMm;
  const R = L.boreRadius;
  const springSeat = L.headTop + 3;
  const retainerBottom = L.bucketBottom - 2;
  const valveBase = L.deck - 1.5;
  const stem = retainerBottom - valveBase;
  const valve = (head: number) => turned([[0, 0], [head, 0], [head, 1.5], [head * 0.45, 4.5], [2.6, 6.5], [2.6, stem], [0, stem]], 16);
  return {
    L,
    springSeat,
    springRest: retainerBottom - springSeat,
    valveBase,
    web: crankWeb(L.throw, -18, -8),
    webFront: crankWeb(L.throw, 8, 18),
    pin: barX(12, -8, 8),
    rod: connectingRod(spec.rodMm),
    piston: turned(pistonProfile(R, ch), 28),
    wristPin: barX(7, -30, 30, 12),
    rings: [
      splitRing(R - 3.4, R - 0.05, ch - 6.15, 1.1, 0.06, 0),
      splitRing(R - 3.4, R - 0.05, ch - 10.45, 1.4, 0.06, (2 * Math.PI) / 3),
      splitRing(R - 3.4, R - 0.05, ch - 15.9, 2.3, 0.06, (4 * Math.PI) / 3),
    ],
    gas: new THREE.CylinderGeometry(R - 0.8, R - 0.8, 1, 40).translate(0, 0.5, 0),
    intakeValve: valve(7.6),
    exhaustValve: valve(6.8),
    guide: turned([[4.6, L.headTop], [4.6, L.headTop + 9], [0, L.headTop + 9]], 12),
    seat: turned([[0, L.headTop], [10, L.headTop], [10, L.headTop + 3], [0, L.headTop + 3]], 20),
    retainer: turned([[0, retainerBottom], [6, retainerBottom], [6, retainerBottom + 2], [0, retainerBottom + 2]], 16),
    bucket: turned([[0, L.bucketBottom], [9, L.bucketBottom], [9, L.bucketBottom + L.bucketHeight], [0, L.bucketBottom + L.bucketHeight]], 20),
    spring: helix(8, 5),
    intakeLobe: camLobe(spec, spec.intakeWindowDeg, L.camRadius, -4, 4),
    exhaustLobe: camLobe(spec, spec.exhaustWindowDeg, L.camRadius, -4, 4),
    camBearing: new THREE.BoxGeometry(8, L.camY + 10 - L.headTop, 20).translate(0, (L.headTop + L.camY + 10) / 2, 0),
    plug: turned(
      [
        [0, L.headTop],
        [8.5, L.headTop],
        [8.5, L.headTop + 2],
        [7.5, L.headTop + 2],
        [7.5, L.headTop + 11],
        [4.6, L.headTop + 11],
        [4.6, L.headTop + 37],
        [2.4, L.headTop + 37],
        [2.4, L.headTop + 43],
        [3.2, L.headTop + 43],
        [3.2, L.headTop + 45],
        [0, L.headTop + 45],
      ],
      6,
    ),
    pedestal: new THREE.BoxGeometry(12, L.throw + 80, 52).translate(0, -L.throw - 57 + (L.throw + 80) / 2, 0),
    pulleyMark: extrudeX([[17, -1.2], [25, -1.2], [25, 1.2], [17, 1.2]], 0, 0.6),
  };
}

export type EngineParts = ReturnType<typeof engineParts>;

/**
 * A split ring (piston ring, circlip) of rectangular section around the vertical axis, with an
 * end gap of `gap` radians centred at angle `at` (0 = +z, measured toward +x).
 */
export function splitRing(rIn: number, rOut: number, y0: number, height: number, gap = 0.06, at = 0, segments = 64) {
  const profile = [new THREE.Vector2(rIn, y0), new THREE.Vector2(rOut, y0), new THREE.Vector2(rOut, y0 + height), new THREE.Vector2(rIn, y0 + height), new THREE.Vector2(rIn, y0)];
  return new THREE.LatheGeometry(profile, segments, at + gap / 2, Math.PI * 2 - gap);
}

/** A tube or sleeve along x, from an (r, x) outline turned around the x axis. */
export function turnedX(profile: P2[], segments = 20, phiStart = 0, phiLength = Math.PI * 2) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, s]) => new THREE.Vector2(r, s)), segments, phiStart, phiLength);
  geometry.rotateZ(-Math.PI / 2);
  return geometry;
}

/** A turned part along z (for pipes, cans and sensors that run front to back). */
export function turnedZ(profile: P2[], segments = 20) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, s]) => new THREE.Vector2(r, s)), segments);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
