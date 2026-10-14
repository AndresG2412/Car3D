"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import { circle, extrudeX, hull, pistonProfile, splitRing, turned, turnedX } from "@/lib/engine/geometry";
import type { EngineSpec } from "@/lib/engine/kinematics";
import { useEngine } from "@/store/engine";
import { INK, Part } from "../engine/Part";

type P2 = [number, number];

const BIG_END = { outer: 27, bore: 22.5, shell: 21, width: 10, bolt: 29 };

/**
 * The outline of one half of the rod's big end, cut on the line y = -L: the hull of `points`
 * with the bearing bore notched out of the parting edge, into +y for the rod and -y for the cap.
 */
function withBore(points: P2[], L: number, dir: 1 | -1): P2[] {
  const outline = hull(points);
  const n = outline.length;
  const onCut = (p: P2) => Math.abs(p[0] + L) < 0.01;
  const i = outline.findIndex((p, k) => onCut(p) && onCut(outline[(k + 1) % n]));
  const ordered = [...outline.slice(i + 1), ...outline.slice(0, i + 1)];
  const from = ordered[ordered.length - 1];
  const r = BIG_END.bore;
  const psi0 = from[1] > 0 ? 0 : Math.PI;
  const notch: P2[] = Array.from({ length: 25 }, (_, k) => {
    const psi = psi0 + ((Math.PI - 2 * psi0) * k) / 24;
    return [-L + dir * r * Math.sin(psi), r * Math.cos(psi)];
  });
  return [...ordered, ...notch];
}

/** One piston-and-rod set in mm, wrist pin at the origin, rod pointing down (-y), pin along x. */
function pistonSet(spec: EngineSpec) {
  const R = spec.boreMm / 2;
  const ch = spec.compressionHeightMm;
  const L = spec.rodMm;
  // upper half of the big end: points at y >= -L; the cap mirrors it below y = -L
  const upperArc = Array.from({ length: 17 }, (_, k) => {
    const phi = (k / 16) * Math.PI;
    return [-L + BIG_END.outer * Math.sin(phi), BIG_END.outer * Math.cos(phi)] as P2;
  });
  const lowerArc = upperArc.map(([y, z]) => [-2 * L - y, z] as P2);
  const bosses = (dir: number): P2[] => [-1, 1].flatMap((s) => circle(-L + dir * 6, s * BIG_END.bolt, 7, 12).filter(([y]) => dir * (y + L) >= 0).concat([[-L, s * (BIG_END.bolt + 7)]]));

  const rodBody = extrudeX(withBore([...circle(0, 0, 16, 32), ...upperArc, ...bosses(1)], L, 1), -BIG_END.width, BIG_END.width, [circle(0, 0, 11, 24).reverse()]);
  const rodCap = extrudeX(withBore([...lowerArc, ...bosses(-1)], L, -1), -BIG_END.width, BIG_END.width);

  const ringAt = (y0: number, h: number, at: number, rIn = R - 3.4, rOut = R - 0.05) => splitRing(rIn, rOut, y0, h, 0.06, at);
  const shell = (upper: boolean) => {
    // turnedX maps a lathe angle phi to (y, z) = (-r sin phi, r cos phi): phi in (pi, 2pi) is the upper half
    const g = turnedX([[BIG_END.shell, -9], [BIG_END.bore, -9], [BIG_END.bore, 9], [BIG_END.shell, 9], [BIG_END.shell, -9]], 32, upper ? Math.PI : 0, Math.PI);
    g.translate(0, -L, 0);
    return g;
  };
  const bolt = (z: number) => {
    const g = turned([[0, -L - 22], [6.5, -L - 22], [6.5, -L - 18], [4, -L - 18], [4, -L + 14], [0, -L + 14]], 12);
    g.translate(0, 0, z);
    return g;
  };
  const clip = (x: number) => turnedX([[9.6, x - 0.5], [11, x - 0.5], [11, x + 0.5], [9.6, x + 0.5], [9.6, x - 0.5]], 32, 0.3, Math.PI * 2 - 0.6);
  const pinHalf = 32;

  // [id, geometry, explode offset in mm]
  const list: [string, THREE.BufferGeometry, [number, number, number]][] = [
    ["rod", rodBody, [0, 0, 0]],
    ["bushing", turnedX([[9.55, -11], [11, -11], [11, 11], [9.55, 11], [9.55, -11]], 24), [-60, 0, 0]],
    ["bearing", shell(true), [0, 0, 70]],
    ["bearing", shell(false), [0, -40, 70]],
    ["cap", rodCap, [0, -60, 0]],
    ["bolts", bolt(BIG_END.bolt), [0, -115, 0]],
    ["bolts", bolt(-BIG_END.bolt), [0, -115, 0]],
    ["pin", turnedX([[6, -pinHalf], [9.5, -pinHalf], [9.5, pinHalf], [6, pinHalf], [6, -pinHalf]], 24), [100, 0, 0]],
    ["clip", clip(pinHalf + 1.1), [160, 0, 0]],
    ["clip", clip(-pinHalf - 1.1), [-100, 0, 0]],
    ["piston", turned(pistonProfile(R, ch), 28), [0, 45, 0]],
    ["ring-oil", ringAt(ch - 15.95, 0.45, 3.5, R - 2.8), [0, 100 - (ch - 15.95), 0]],
    ["ring-oil", ringAt(ch - 15.4, 1.3, 4.2, R - 3.5, R - 0.6), [0, 106 - (ch - 15.4), 0]],
    ["ring-oil", ringAt(ch - 13.95, 0.45, 4.9, R - 2.8), [0, 112 - (ch - 13.95), 0]],
    ["ring-second", ringAt(ch - 10.45, 1.4, (2 * Math.PI) / 3), [0, 124 - (ch - 10.45), 0]],
    ["ring-top", ringAt(ch - 6.15, 1.1, 0), [0, 136 - (ch - 6.15), 0]],
  ];
  return list;
}

/** The piston-and-rod set, drawn solid; it comes apart along its natural directions when exploded. */
export function PistonAssembly({ spec }: { spec: EngineSpec }) {
  const list = useMemo(() => pistonSet(spec), [spec]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const amount = useRef(0);

  // parts hidden inside the assembly can only be seen apart: open it when one is chosen
  useEffect(
    () =>
      useEngine.subscribe((s, prev) => {
        if (s.selected && s.selected !== prev.selected && !["piston", "rod"].includes(s.selected) && !s.explode) useEngine.setState({ explode: true });
      }),
    [],
  );

  useFrame((_, delta) => {
    const target = useEngine.getState().explode ? 1 : 0;
    amount.current += (target - amount.current) * (1 - Math.exp(-delta / 0.25));
    const e = amount.current;
    list.forEach(([, , [dx, dy, dz]], i) => groups.current[i]?.position.set(dx * e, dy * e, dz * e));
  });

  return (
    <group position={[0, 60, 0]}>
      {list.map(([id, geometry], i) => (
        <group key={i} ref={(g) => { groups.current[i] = g; }}>
          <Part geometry={geometry} partId={id} color={id.startsWith("ring") || id === "clip" ? INK.exhaust : INK.moving} threshold={id === "piston" ? 10 : 20} />
        </group>
      ))}
    </group>
  );
}
