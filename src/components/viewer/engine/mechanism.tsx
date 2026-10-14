"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import type { EngineParts } from "@/lib/engine/geometry";
import { type EngineSpec, liftAt, rodAngle, sparkAt, strokeOf, wrap720, wristY } from "@/lib/engine/kinematics";
import { useEngine } from "@/store/engine";
import { INK, type Look, Part } from "./Part";

/*
 * Each cylinder runs the same 720° cycle shifted by its `phase` (crank degrees): with firing
 * order 1-3-4-2 the phases are 0, 540, 180 and 360. Its crank throw sits at phase mod 360,
 * so cylinders 1 and 4 share a throw at 0° and cylinders 2 and 3 a throw at 180°.
 */

const GAS: Record<ReturnType<typeof strokeOf>, string> = {
  intake: INK.intake,
  compression: "#9fb4d0",
  power: INK.exhaust,
  exhaust: "#7d7f85",
};

const thetaOf = (phase: number) => useEngine.getState().theta - phase;

/** Two webs and the pin of one crank throw. Mount it inside the group that turns with the crank. */
export function CrankThrow({ parts, x = 0, phase = 0 }: { parts: EngineParts; x?: number; phase?: number }) {
  return (
    <group position={[x, 0, 0]} rotation={[(-phase * Math.PI) / 180, 0, 0]}>
      <Part geometry={parts.web} color={INK.moving} />
      <Part geometry={parts.webFront} color={INK.moving} />
      <Part geometry={parts.pin} color={INK.moving} />
    </group>
  );
}

/** Connecting rod, piston and the charge above it for one cylinder. */
export function RodPiston({ spec, parts, x = 0, phase = 0 }: { spec: EngineSpec; parts: EngineParts; x?: number; phase?: number }) {
  const { L } = parts;
  const rod = useRef<THREE.Group>(null);
  const piston = useRef<THREE.Group>(null);
  const gas = useRef<THREE.Mesh>(null);
  const gasMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const theta = thetaOf(phase);
    const a = (theta * Math.PI) / 180;
    rod.current?.position.set(x, L.throw * Math.cos(a), L.throw * Math.sin(a));
    rod.current?.rotation.set(rodAngle(spec, theta), 0, 0);
    const wrist = wristY(spec, theta);
    piston.current?.position.set(x, wrist, 0);
    const crown = wrist + spec.compressionHeightMm;
    if (gas.current && gasMat.current) {
      const stroke = strokeOf(theta);
      gas.current.position.set(x, crown, 0);
      gas.current.scale.y = Math.max(0.1, L.deck - crown);
      gasMat.current.color.set(GAS[stroke]);
      const burn = Math.min(1, Math.max(0, 1 - (wrap720(theta) - 355) / 185));
      gasMat.current.opacity = stroke === "power" ? 0.1 + 0.4 * Math.max(sparkAt(theta), burn) : 0.1;
    }
  });

  return (
    <>
      <group ref={rod}>
        <Part geometry={parts.rod} color={INK.moving} />
      </group>
      <group ref={piston}>
        <Part geometry={parts.piston} color={INK.moving} threshold={10} />
        <Part geometry={parts.wristPin} color={INK.moving} />
        {parts.rings.map((ring, i) => (
          <Part key={i} geometry={ring} color={INK.line} threshold={30} />
        ))}
      </group>
      <mesh ref={gas} geometry={parts.gas}>
        <meshBasicMaterial ref={gasMat} transparent opacity={0.1} depthWrite={false} color={INK.intake} />
      </mesh>
    </>
  );
}

const SIDES = [
  { key: "intake", sign: -1, color: INK.intake },
  { key: "exhaust", sign: 1, color: INK.exhaust },
] as const;

/** The four valves of one cylinder with seats, guides, springs, retainers and buckets, plus its spark plug. */
export function ValveSet({ spec, parts, x = 0, phase = 0 }: { spec: EngineSpec; parts: EngineParts; x?: number; phase?: number }) {
  const { L } = parts;
  const valves = useRef<(THREE.Group | null)[]>([]);
  const springs = useRef<(THREE.Group | null)[]>([]);
  const spark = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const theta = thetaOf(phase);
    SIDES.forEach((side, i) => {
      const lift = liftAt(spec, theta, side.key === "intake" ? spec.intakeWindowDeg : spec.exhaustWindowDeg);
      for (const j of [0, 1]) {
        valves.current[i * 2 + j]?.position.setY(-lift);
        springs.current[i * 2 + j]?.scale.setY((parts.springRest - lift) / parts.springRest);
      }
    });
    spark.current?.scale.setScalar(0.2 + 2.2 * sparkAt(theta));
  });

  return (
    <group position={[x, 0, 0]}>
      {SIDES.map((side, i) =>
        [-1, 1].map((sx, j) => (
          <group key={`${side.key}${sx}`} position={[sx * L.valveX, 0, side.sign * L.valveZ]}>
            <Part geometry={parts.seat} />
            <Part geometry={parts.guide} />
            <group ref={(g) => { springs.current[i * 2 + j] = g; }} position={[0, parts.springSeat, 0]}>
              <Line points={parts.spring} color={INK.line} lineWidth={1.1} scale={[1, parts.springRest, 1]} />
            </group>
            <group ref={(g) => { valves.current[i * 2 + j] = g; }}>
              <Part geometry={side.key === "intake" ? parts.intakeValve : parts.exhaustValve} color={side.color} position={[0, parts.valveBase, 0]} />
              <Part geometry={parts.retainer} color={side.color} />
              <Part geometry={parts.bucket} color={side.color} />
            </group>
          </group>
        )),
      )}
      <Part geometry={parts.plug} />
      <mesh ref={spark} position={[0, L.deck - 2, 0]}>
        <sphereGeometry args={[2, 12, 12]} />
        <meshBasicMaterial color={INK.spark} />
      </mesh>
    </group>
  );
}

/**
 * Intake and exhaust camshafts turning at half crank speed. Each cylinder gets a pair of lobes
 * at x ± valveX, turned back by half its phase.
 */
export function Camshafts({
  parts,
  cylinders,
  shaft,
  bearings,
  housing,
}: {
  parts: EngineParts;
  cylinders: { x: number; phase: number }[];
  shaft: THREE.BufferGeometry;
  bearings: number[];
  housing: Look | "hidden";
}) {
  const { L } = parts;
  const cams = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const a = (useEngine.getState().theta * Math.PI) / 180;
    cams.current.forEach((cam) => cam?.rotation.set(a / 2, 0, 0));
  });
  return (
    <>
      {SIDES.map((side, i) => (
        <group key={side.key} position={[0, 0, side.sign * L.valveZ]}>
          {housing !== "hidden" && bearings.map((bx) => <Part key={bx} geometry={parts.camBearing} position={[bx, 0, 0]} look={housing} />)}
          <group ref={(g) => { cams.current[i] = g; }} position={[0, L.camY, 0]}>
            <Part geometry={shaft} color={side.color} />
            {cylinders.flatMap(({ x, phase }) =>
              [-1, 1].map((sx) => (
                <Part
                  key={`${x}${sx}`}
                  geometry={side.key === "intake" ? parts.intakeLobe : parts.exhaustLobe}
                  color={side.color}
                  position={[x + sx * L.valveX, 0, 0]}
                  rotation={[(-phase * Math.PI) / 360, 0, 0]}
                />
              )),
            )}
          </group>
        </group>
      ))}
    </>
  );
}

/** Wraps children in a group that turns with the crank. */
export function Crank({ children }: { children: React.ReactNode }) {
  const crank = useRef<THREE.Group>(null);
  useFrame(() => {
    crank.current?.rotation.set((useEngine.getState().theta * Math.PI) / 180, 0, 0);
  });
  return <group ref={crank}>{children}</group>;
}
