"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { barX, boredBlock, camLobe, connectingRod, crankWeb, extrudeX, helix, turned } from "@/lib/engine/geometry";
import { type EngineSpec, layoutOf, liftAt, rodAngle, sparkAt, strokeOf, wrap720, wristY } from "@/lib/engine/kinematics";
import { useEngine } from "@/store/engine";
import { INK, Part } from "./Part";

const GAS: Record<ReturnType<typeof strokeOf>, string> = {
  intake: INK.intake,
  compression: "#9fb4d0",
  power: INK.exhaust,
  exhaust: "#7d7f85",
};

type Side = { key: "intake" | "exhaust"; z: number; window: [number, number]; color: string; headRadius: number };

/** One cylinder of the engine, in mm, with the crank axis on x at y = 0. */
export function EngineCylinder({ spec }: { spec: EngineSpec }) {
  const L = useMemo(() => layoutOf(spec), [spec]);
  const block = useEngine((s) => s.block);
  const ghost = block === "ghost";

  const sides: Side[] = useMemo(
    () => [
      { key: "intake", z: -L.valveZ, window: spec.intakeWindowDeg, color: INK.intake, headRadius: 7.6 },
      { key: "exhaust", z: L.valveZ, window: spec.exhaustWindowDeg, color: INK.exhaust, headRadius: 6.8 },
    ],
    [L, spec],
  );

  const geo = useMemo(() => {
    const springSeat = L.headTop + 3;
    const retainerBottom = L.bucketBottom - 2;
    const valveBase = L.deck - 1.5;
    return {
      base: new THREE.BoxGeometry(170, 10, 150).translate(0, -L.throw - 62, 0),
      pedestal: new THREE.BoxGeometry(12, L.throw + 80, 52).translate(0, -L.throw - 57 + (L.throw + 80) / 2, 0),
      journal: barX(20, -34, -18),
      journalFront: barX(20, 18, 46),
      pulley: barX(26, 50, 60, 24),
      pulleyHub: barX(9, 60, 64),
      web: crankWeb(L.throw, -18, -8),
      webFront: crankWeb(L.throw, 8, 18),
      pin: barX(12, -8, 8),
      rod: connectingRod(spec.rodMm),
      piston: turned(
        [
          [0, spec.compressionHeightMm],
          [L.boreRadius - 0.6, spec.compressionHeightMm],
          [L.boreRadius - 0.6, spec.compressionHeightMm - 4],
          [L.boreRadius - 1.8, spec.compressionHeightMm - 4],
          [L.boreRadius - 1.8, spec.compressionHeightMm - 6],
          [L.boreRadius - 0.6, spec.compressionHeightMm - 6],
          [L.boreRadius - 0.6, spec.compressionHeightMm - 9],
          [L.boreRadius - 1.8, spec.compressionHeightMm - 9],
          [L.boreRadius - 1.8, spec.compressionHeightMm - 11],
          [L.boreRadius - 0.6, spec.compressionHeightMm - 11],
          [L.boreRadius - 0.6, spec.compressionHeightMm - 56],
          [L.boreRadius - 4, spec.compressionHeightMm - 56],
        ],
        28,
      ),
      wristPin: barX(7, -30, 30, 12),
      barrel: boredBlock(110, L.boreRadius, L.barrelBottom, L.deck),
      head: (() => {
        const g = new THREE.BoxGeometry(110, L.headTop - L.deck, 110);
        g.translate(0, (L.deck + L.headTop) / 2, 0);
        return g;
      })(),
      valve: turned(
        [
          [0, 0],
          [7.2, 0],
          [7.2, 1.5],
          [3.4, 4.5],
          [2.6, 6.5],
          [2.6, retainerBottom - valveBase],
          [0, retainerBottom - valveBase],
        ],
        16,
      ),
      exhaustValve: turned(
        [
          [0, 0],
          [6.4, 0],
          [6.4, 1.5],
          [3.2, 4.5],
          [2.6, 6.5],
          [2.6, retainerBottom - valveBase],
          [0, retainerBottom - valveBase],
        ],
        16,
      ),
      guide: turned([[4.6, L.headTop], [4.6, L.headTop + 9], [0, L.headTop + 9]], 12),
      seat: turned([[0, L.headTop], [10, L.headTop], [10, L.headTop + 3], [0, L.headTop + 3]], 20),
      retainer: turned([[0, retainerBottom], [6, retainerBottom], [6, retainerBottom + 2], [0, retainerBottom + 2]], 16),
      bucket: turned([[0, L.bucketBottom], [9, L.bucketBottom], [9, L.bucketBottom + L.bucketHeight], [0, L.bucketBottom + L.bucketHeight]], 20),
      camShaft: barX(6, -46, 46, 12),
      camBearing: new THREE.BoxGeometry(8, L.camY + 10 - L.headTop, 20).translate(0, (L.headTop + L.camY + 10) / 2, 0),
      lobeIntake: [-1, 1].map((sx) => camLobe(spec, spec.intakeWindowDeg, L.camRadius, sx * 12 - 4, sx * 12 + 4)),
      lobeExhaust: [-1, 1].map((sx) => camLobe(spec, spec.exhaustWindowDeg, L.camRadius, sx * 12 - 4, sx * 12 + 4)),
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
      gas: new THREE.CylinderGeometry(L.boreRadius - 0.8, L.boreRadius - 0.8, 1, 40).translate(0, 0.5, 0),
      spring: helix(8, 5),
      springSeat,
      springRest: retainerBottom - springSeat,
      valveBase,
      pulleyMark: extrudeX([[17, -1.2], [25, -1.2], [25, 1.2], [17, 1.2]], 60, 60.6),
    };
  }, [L, spec]);

  const crank = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Group>(null);
  const piston = useRef<THREE.Group>(null);
  const gas = useRef<THREE.Mesh>(null);
  const gasMat = useRef<THREE.MeshBasicMaterial>(null);
  const spark = useRef<THREE.Mesh>(null);
  const cams = useRef<(THREE.Group | null)[]>([]);
  const valves = useRef<(THREE.Group | null)[]>([]);
  const springs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const { theta } = useEngine.getState();
    const a = (theta * Math.PI) / 180;
    crank.current?.rotation.set(a, 0, 0);
    rod.current?.position.set(0, L.throw * Math.cos(a), L.throw * Math.sin(a));
    rod.current?.rotation.set(rodAngle(spec, theta), 0, 0);
    const wrist = wristY(spec, theta);
    piston.current?.position.set(0, wrist, 0);
    const crown = wrist + spec.compressionHeightMm;
    if (gas.current && gasMat.current) {
      gas.current.position.y = crown;
      gas.current.scale.y = Math.max(0.1, L.deck - crown);
      gasMat.current.color.set(GAS[strokeOf(theta)]);
      const burn = Math.min(1, Math.max(0, 1 - (wrap720(theta) - 355) / 185));
      gasMat.current.opacity = strokeOf(theta) === "power" ? 0.1 + 0.4 * Math.max(sparkAt(theta), burn) : 0.1;
    }
    spark.current?.scale.setScalar(0.2 + 2.2 * sparkAt(theta));
    cams.current.forEach((cam) => cam?.rotation.set(a / 2, 0, 0));
    sides.forEach((side, i) => {
      const lift = liftAt(spec, theta, side.window);
      for (const sx of [0, 1]) {
        valves.current[i * 2 + sx]?.position.setY(-lift);
        springs.current[i * 2 + sx]?.scale.setY((geo.springRest - lift) / geo.springRest);
      }
    });
  });

  return (
    <group>
      {/* Bench: base plate and the two main-bearing pedestals */}
      <Part geometry={geo.base} />
      {block !== "hidden" && (
        <>
          <Part geometry={geo.pedestal} position={[-40, 0, 0]} ghost={ghost} />
          <Part geometry={geo.pedestal} position={[40, 0, 0]} ghost={ghost} />
        </>
      )}
      <Part geometry={geo.journal} />
      <Part geometry={geo.journalFront} />
      <Part geometry={geo.pulley} />
      <Part geometry={geo.pulleyHub} />

      {/* Crankshaft: webs, pin and timing mark turn together */}
      <group ref={crank}>
        <Part geometry={geo.web} color={INK.moving} />
        <Part geometry={geo.webFront} color={INK.moving} />
        <Part geometry={geo.pin} color={INK.moving} />
        <Part geometry={geo.pulleyMark} color={INK.spark} lineWidth={2} />
      </group>

      <group ref={rod}>
        <Part geometry={geo.rod} color={INK.moving} />
      </group>

      <group ref={piston}>
        <Part geometry={geo.piston} color={INK.moving} threshold={10} />
        <Part geometry={geo.wristPin} color={INK.moving} />
      </group>

      {/* Charge in the cylinder, coloured by stroke */}
      <mesh ref={gas} geometry={geo.gas}>
        <meshBasicMaterial ref={gasMat} transparent opacity={0.1} depthWrite={false} color={INK.intake} />
      </mesh>

      {/* Block and head */}
      {block !== "hidden" && (
        <>
          <Part geometry={geo.barrel} ghost={ghost} />
          <Part geometry={geo.head} ghost={ghost} />
        </>
      )}

      {/* Valve train: two intake (blue) and two exhaust (orange), bucket tappets under two cams */}
      {sides.map((side, i) => (
        <group key={side.key} position={[0, 0, side.z]}>
          {[-1, 1].map((sx, j) => (
            <group key={sx} position={[sx * L.valveX, 0, 0]}>
              <Part geometry={geo.seat} />
              <Part geometry={geo.guide} />
              <group ref={(g) => { springs.current[i * 2 + j] = g; }} position={[0, geo.springSeat, 0]}>
                <Line points={geo.spring} color={INK.line} lineWidth={1.1} scale={[1, geo.springRest, 1]} />
              </group>
              <group ref={(g) => { valves.current[i * 2 + j] = g; }}>
                <Part geometry={side.key === "intake" ? geo.valve : geo.exhaustValve} color={side.color} position={[0, geo.valveBase, 0]} />
                <Part geometry={geo.retainer} color={side.color} />
                <Part geometry={geo.bucket} color={side.color} />
              </group>
            </group>
          ))}
          {block !== "hidden" &&
            [-34, 34].map((x) => <Part key={x} geometry={geo.camBearing} position={[x, 0, 0]} ghost={ghost} />)}
          <group ref={(g) => { cams.current[i] = g; }} position={[0, L.camY, 0]}>
            <Part geometry={geo.camShaft} color={side.color} />
            {(side.key === "intake" ? geo.lobeIntake : geo.lobeExhaust).map((lobe, k) => (
              <Part key={k} geometry={lobe} color={side.color} />
            ))}
          </group>
        </group>
      ))}

      {/* Spark plug and its spark */}
      <Part geometry={geo.plug} />
      <mesh ref={spark} position={[0, L.deck - 2, 0]}>
        <sphereGeometry args={[2, 12, 12]} />
        <meshBasicMaterial color={INK.spark} />
      </mesh>
    </group>
  );
}
