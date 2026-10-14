"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { turned, turnedZ } from "@/lib/engine/geometry";
import { type EngineSpec, layoutOf, wrap720 } from "@/lib/engine/kinematics";
import { useEngine } from "@/store/engine";
import { EngineInline4, PITCH, phasesOf } from "../engine/EngineInline4";
import { INK, Part } from "../engine/Part";

type V3 = [number, number, number];
const v = (p: V3) => new THREE.Vector3(...p);

/*
 * Car frame, mm: the engine sits transversely with its crank axis along x at y = 0 and its
 * exhaust side facing forward (+z). The front axle is at z = 0, the rear at -wheelbase.
 * Everything below is a typical layout for a 1.4 L sedan, not measured on a Sail.
 */
const WHEELBASE = 2465;
const TRACK = 1450;
const WHEEL_R = 300;
const WHEEL_Y = -60;
const GROUND = WHEEL_Y - WHEEL_R;
const LENGTH = 4249;
const WIDTH = 1690;
const FRONT = 850;
const PIPE_Y = -200;

const MAIN: V3[] = [
  [0, 60, 142],
  [0, -40, 160],
  [0, -150, 120],
  [0, PIPE_Y, 40],
  [0, PIPE_Y, -300],
  [20, PIPE_Y, -600],
  [60, PIPE_Y - 5, -1100],
  [60, PIPE_Y - 5, -1800],
  [120, PIPE_Y - 5, -2300],
  [230, PIPE_Y, -2750],
  [280, PIPE_Y, -2950],
  [280, PIPE_Y, -3300],
  [300, PIPE_Y + 5, -3420],
];

/** Gas pulses: each one is a short train of dots that runs from an exhaust port to the tailpipe. */
const DOTS_PER_PULSE = 7;
const MAX_DOTS = 70;
const MM_PER_CRANK_DEGREE = 16;
const OPEN_AT = 485;

function samplePath(points: THREE.Vector3[], step = 10) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const n = Math.ceil(curve.getLength() / step);
  return curve.getSpacedPoints(n);
}

export function ExhaustSystem({ spec, firingOrder }: { spec: EngineSpec; firingOrder: number[] }) {
  const L = layoutOf(spec);
  const phases = useMemo(() => phasesOf(firingOrder), [firingOrder]);
  const cylinders = phases.map((phase, i) => ({ x: (i - (phases.length - 1) / 2) * PITCH, phase }));

  const geo = useMemo(() => {
    const runners = cylinders.map(({ x }) => [v([x, L.deck + 8, 56]), v([x, L.deck - 5, 95]), v([x * 0.55, L.deck - 60, 125]), v([x * 0.2, 90, 140]), v(MAIN[0])]);
    const main = MAIN.map(v);
    const tube = (pts: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), Math.max(24, pts.length * 12), r, 10);
    const oval = (rx: number, ry: number, z0: number, z1: number) => {
      const g = new THREE.CylinderGeometry(1, 1, z1 - z0, 28, 1);
      g.scale(rx, 1, ry);
      g.rotateX(Math.PI / 2);
      g.translate(0, 0, (z0 + z1) / 2);
      return g;
    };
    const sensor = turned([[0, 0], [11, 0], [11, 6], [8, 6], [8, 16], [5, 16], [5, 40], [0, 40]], 6);
    const flexProfile: [number, number][] = [];
    for (let s = 0; s <= 120; s += 6) flexProfile.push([s % 12 === 0 ? 27 : 30, s]);
    const flex = turnedZ([[0, 0], ...flexProfile, [0, 120]], 20);
    flex.translate(0, PIPE_Y, -450);
    const wheel = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 175, 28);
    wheel.rotateZ(Math.PI / 2);
    const hanger = new THREE.TorusGeometry(14, 4, 6, 14);
    hanger.rotateY(Math.PI / 2);
    return {
      runners: runners.map((pts) => tube(pts, 16)),
      collector: turned([[0, 0], [32, 0], [26, -45], [0, -45]], 20).translate(...MAIN[0]),
      flange: new THREE.BoxGeometry(cylinders.length * PITCH - 20, 46, 8).translate(0, L.deck + 8, 60),
      gasket: new THREE.BoxGeometry(cylinders.length * PITCH - 30, 40, 2).translate(0, L.deck + 8, 55),
      main: tube(main, 24),
      catalytic: oval(70, 52, -280, 30).translate(0, PIPE_Y, 0),
      heatShield: new THREE.BoxGeometry(170, 3, 330).translate(0, PIPE_Y + 62, -125),
      o2Up: sensor.clone().rotateX(Math.PI / 2).translate(0, -10, 190),
      o2Down: sensor.clone().translate(0, PIPE_Y + 22, -330),
      flex,
      resonator: oval(62, 62, -1750, -1300).translate(60, PIPE_Y - 5, 0),
      muffler: oval(170, 95, -3280, -2930).translate(280, PIPE_Y, 0),
      tailpipe: turnedZ([[24, 0], [29, 0], [29, 90], [24, 90], [24, 0]], 20).translate(300, PIPE_Y + 5, -3500),
      hangers: ([[60, PIPE_Y + 40, -1000], [180, PIPE_Y + 40, -2550], [420, PIPE_Y + 60, -3100]] as V3[]).map((p) => hanger.clone().translate(...p)),
      wheel,
      paths: runners.map((pts) => samplePath([...pts.slice(0, -1), ...main])),
    };
  }, [L, cylinders]);

  const dots = useRef<THREE.InstancedMesh>(null);
  const pulses = useRef<{ cylinder: number; at: number }[]>([]);
  const last = useRef<number | null>(null);
  const hot = useMemo(() => new THREE.Color(INK.exhaust), []);
  const clean = useMemo(() => new THREE.Color("#9fb4d0"), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color() }), []);

  useFrame(() => {
    const theta = useEngine.getState().theta;
    const prev = last.current ?? theta;
    last.current = theta;
    const step = wrap720(theta - prev);
    if (step > 360) {
      pulses.current = []; // scrubbed backwards: start clean
    } else if (step > 0) {
      for (const p of pulses.current) p.at += step * MM_PER_CRANK_DEGREE;
      cylinders.forEach(({ phase }, i) => {
        const a = wrap720(prev - phase);
        if ((a < OPEN_AT && a + step >= OPEN_AT) || a + step >= OPEN_AT + 720) pulses.current.push({ cylinder: i, at: 0 });
      });
      pulses.current = pulses.current.filter((p) => p.at - DOTS_PER_PULSE * 30 < geo.paths[p.cylinder].length * 10);
    }
    const mesh = dots.current;
    if (!mesh) return;
    let n = 0;
    for (const p of pulses.current) {
      const path = geo.paths[p.cylinder];
      for (let k = 0; k < DOTS_PER_PULSE && n < MAX_DOTS; k++) {
        const index = Math.round((p.at - k * 30) / 10);
        if (index < 0 || index >= path.length) continue;
        tmp.m.makeTranslation(path[index]);
        mesh.setMatrixAt(n, tmp.m);
        const cooled = Math.min(1, index / (path.length * 0.35));
        mesh.setColorAt(n, tmp.c.copy(hot).lerp(clean, cooled));
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const footprint: V3[] = [
    [-WIDTH / 2, GROUND, FRONT],
    [WIDTH / 2, GROUND, FRONT],
    [WIDTH / 2, GROUND, FRONT - LENGTH],
    [-WIDTH / 2, GROUND, FRONT - LENGTH],
    [-WIDTH / 2, GROUND, FRONT],
  ];

  return (
    <group>
      {/* Context: the engine, the wheels and the car's footprint on the ground */}
      <EngineInline4 spec={spec} firingOrder={firingOrder} bench={false} />
      {[0, -WHEELBASE].flatMap((z) => [-1, 1].map((s) => <Part key={`${z}${s}`} geometry={geo.wheel} position={[(s * TRACK) / 2, WHEEL_Y, z]} look="dashed" />))}
      <Line points={footprint} color={INK.dashed} dashed dashSize={40} gapSize={30} lineWidth={1} />

      {geo.runners.map((g, i) => (
        <Part key={i} geometry={g} partId="manifold" color={INK.exhaust} threshold={25} />
      ))}
      <Part geometry={geo.collector} partId="manifold" color={INK.exhaust} />
      <Part geometry={geo.flange} partId="manifold" color={INK.exhaust} />
      <Part geometry={geo.gasket} partId="manifold-gasket" />
      <Part geometry={geo.o2Up} partId="o2-upstream" color={INK.intake} />
      <Part geometry={geo.main} partId="pipe" threshold={25} />
      <Part geometry={geo.heatShield} partId="heat-shield" look="ghost" />
      <Part geometry={geo.catalytic} partId="catalytic" color={INK.spark} threshold={20} />
      <Part geometry={geo.o2Down} partId="o2-downstream" color={INK.intake} />
      <Part geometry={geo.flex} partId="flex" threshold={20} />
      <Part geometry={geo.resonator} partId="resonator" threshold={20} />
      <Part geometry={geo.muffler} partId="muffler" threshold={20} />
      <Part geometry={geo.tailpipe} partId="tailpipe" />
      {geo.hangers.map((g, i) => (
        <Part key={i} geometry={g} partId="hangers" threshold={40} />
      ))}

      <instancedMesh ref={dots} args={[undefined, undefined, MAX_DOTS]} frustumCulled={false} renderOrder={10}>
        <sphereGeometry args={[9, 10, 10]} />
        <meshBasicMaterial depthTest={false} transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
}
