"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { barX, boredBlock, engineParts } from "@/lib/engine/geometry";
import type { EngineSpec } from "@/lib/engine/kinematics";
import { useEngine } from "@/store/engine";
import { Camshafts, Crank, CrankThrow, RodPiston, ValveSet } from "./mechanism";
import { INK, Part } from "./Part";

/** Distance between cylinder centres, mm (approximate). */
export const PITCH = 86;

/**
 * Cycle phase of each cylinder for a firing order: the n-th cylinder to fire is 180·n crank
 * degrees behind the first. Order 1-3-4-2 gives cylinders 1..4 the phases 0, 540, 180, 360.
 */
export function phasesOf(firingOrder: number[]) {
  const phases = new Array<number>(firingOrder.length);
  firingOrder.forEach((cylinder, n) => (phases[cylinder - 1] = (n * 720) / firingOrder.length));
  return phases;
}

/**
 * The whole inline-4: crankshaft with four throws and five main journals, four rods and pistons,
 * sixteen valves and two camshafts. Moving parts are drawn solid; the block, head and bearing
 * caps are dashed so the mechanism reads through them.
 */
export function EngineInline4({ spec, firingOrder, bench = true }: { spec: EngineSpec; firingOrder: number[]; bench?: boolean }) {
  const parts = useMemo(() => engineParts(spec), [spec]);
  const { L } = parts;
  const housing = useEngine((s) => (s.housing ? "dashed" : "hidden"));

  const cylinders = useMemo(() => {
    const phases = phasesOf(firingOrder);
    return phases.map((phase, i) => ({ number: i + 1, x: (i - (phases.length - 1) / 2) * PITCH, phase }));
  }, [firingOrder]);

  const span = cylinders.length * PITCH;
  const mains = cylinders.map((c) => c.x - PITCH / 2).concat(cylinders[cylinders.length - 1].x + PITCH / 2);

  const geo = useMemo(() => {
    const ends = [mains[0], mains[mains.length - 1]];
    return {
      base: new THREE.BoxGeometry(span + 120, 10, 170).translate(0, -L.throw - 62, 0),
      journals: cylinders.slice(1).map((c) => barX(20, c.x - PITCH + 18, c.x - 18)),
      journalBack: barX(20, ends[0] - 10, cylinders[0].x - 18),
      journalFront: barX(20, cylinders[cylinders.length - 1].x + 18, ends[1] + 14),
      flywheel: barX(72, ends[0] - 24, ends[0] - 12, 48),
      flywheelHub: barX(20, ends[0] - 12, ends[0] - 10),
      pulley: barX(26, ends[1] + 18, ends[1] + 28, 24),
      pulleyHub: barX(14, ends[1] + 14, ends[1] + 18),
      camShaft: barX(6, ends[0] - 6, ends[1] + 6, 12),
      block: boredBlock(span + 16, 110, cylinders.map((c) => c.x), L.boreRadius, L.barrelBottom, L.deck),
      head: new THREE.BoxGeometry(span + 16, L.headTop - L.deck, 110).translate(0, (L.deck + L.headTop) / 2, 0),
    };
  }, [L, cylinders, mains, span]);

  return (
    <group>
      {bench && <Part geometry={geo.base} />}
      {housing !== "hidden" && (
        <>
          {mains.map((x) => (
            <Part key={x} geometry={parts.pedestal} position={[x, 0, 0]} look={housing} />
          ))}
          <Part geometry={geo.block} look={housing} />
          <Part geometry={geo.head} look={housing} />
        </>
      )}

      <Crank>
        {cylinders.map((c) => (
          <CrankThrow key={c.number} parts={parts} x={c.x} phase={c.phase} />
        ))}
        {geo.journals.map((g, i) => (
          <Part key={i} geometry={g} color={INK.moving} />
        ))}
        <Part geometry={geo.journalBack} color={INK.moving} />
        <Part geometry={geo.journalFront} color={INK.moving} />
        <Part geometry={geo.flywheel} color={INK.moving} />
        <Part geometry={geo.flywheelHub} color={INK.moving} />
        <Part geometry={geo.pulley} color={INK.moving} />
        <Part geometry={geo.pulleyHub} color={INK.moving} />
        <Part geometry={parts.pulleyMark} color={INK.spark} lineWidth={2} position={[mains[mains.length - 1] + 28, 0, 0]} />
      </Crank>

      {cylinders.map((c) => (
        <group key={c.number}>
          <RodPiston spec={spec} parts={parts} x={c.x} phase={c.phase} />
          <ValveSet spec={spec} parts={parts} x={c.x} phase={c.phase} />
        </group>
      ))}
      <Camshafts parts={parts} cylinders={cylinders} shaft={geo.camShaft} bearings={mains} housing={housing} />
    </group>
  );
}
