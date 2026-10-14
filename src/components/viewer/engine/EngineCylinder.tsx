"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { barX, boredBlock, engineParts } from "@/lib/engine/geometry";
import type { EngineSpec } from "@/lib/engine/kinematics";
import { useEngine } from "@/store/engine";
import { Camshafts, Crank, CrankThrow, RodPiston, ValveSet } from "./mechanism";
import { INK, Part } from "./Part";

/** One cylinder of the engine on a bench, in mm, with the crank axis on x at y = 0. */
export function EngineCylinder({ spec }: { spec: EngineSpec }) {
  const parts = useMemo(() => engineParts(spec), [spec]);
  const { L } = parts;
  const housing = useEngine((s) => (s.housing ? "ghost" : "hidden"));

  const geo = useMemo(
    () => ({
      base: new THREE.BoxGeometry(170, 10, 150).translate(0, -L.throw - 62, 0),
      journal: barX(20, -34, -18),
      journalFront: barX(20, 18, 46),
      pulley: barX(26, 50, 60, 24),
      pulleyHub: barX(9, 60, 64),
      camShaft: barX(6, -46, 46, 12),
      barrel: boredBlock(110, 110, [0], L.boreRadius, L.barrelBottom, L.deck),
      head: new THREE.BoxGeometry(110, L.headTop - L.deck, 110).translate(0, (L.deck + L.headTop) / 2, 0),
    }),
    [L],
  );

  return (
    <group>
      <Part geometry={geo.base} />
      {housing !== "hidden" && (
        <>
          <Part geometry={parts.pedestal} position={[-40, 0, 0]} look={housing} />
          <Part geometry={parts.pedestal} position={[40, 0, 0]} look={housing} />
          <Part geometry={geo.barrel} look={housing} />
          <Part geometry={geo.head} look={housing} />
        </>
      )}
      <Part geometry={geo.journal} />
      <Part geometry={geo.journalFront} />
      <Part geometry={geo.pulley} />
      <Part geometry={geo.pulleyHub} />

      <Crank>
        <CrankThrow parts={parts} />
        <Part geometry={parts.pulleyMark} color={INK.spark} lineWidth={2} position={[60, 0, 0]} />
      </Crank>
      <RodPiston spec={spec} parts={parts} />
      <ValveSet spec={spec} parts={parts} />
      <Camshafts parts={parts} cylinders={[{ x: 0, phase: 0 }]} shaft={geo.camShaft} bearings={[-34, 34]} housing={housing} />
    </group>
  );
}
