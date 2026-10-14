"use client";

import { Edges } from "@react-three/drei";
import type { ThreeElements, ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { registerPart } from "@/lib/parts";
import { useEngine } from "@/store/engine";

export const INK = {
  paper: "#0c0d0f",
  line: "#d8dade",
  moving: "#f4f5f7",
  faint: "#4a4e55",
  dashed: "#6b7079",
  intake: "#5aa9ff",
  exhaust: "#ff8a4c",
  spark: "#fff1a8",
  selected: "#ffd84a",
};

/**
 * solid: paper fill hides what is behind it (hidden-line look) and the edges are stroked.
 * ghost: see-through, faint solid edges.
 * dashed: see-through, dashed faint edges, for housings you look through at the mechanism.
 */
export type Look = "solid" | "ghost" | "dashed";

type PartProps = ThreeElements["mesh"] & {
  geometry: THREE.BufferGeometry;
  /** Makes the part tappable: it opens the sheet with this id and is highlighted while open. */
  partId?: string;
  color?: string;
  look?: Look;
  lineWidth?: number;
  threshold?: number;
};

export function Part({ geometry, partId, color = INK.line, look = "solid", lineWidth = 1.2, threshold = 15, ...mesh }: PartProps) {
  const ref = useRef<THREE.Mesh>(null);
  const selected = useEngine((s) => partId !== undefined && s.selected === partId);
  const see = look !== "solid";

  useEffect(() => {
    if (partId && ref.current) return registerPart(partId, ref.current);
  }, [partId]);

  const handlers = partId
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return; // a drag that orbits the camera, not a tap
          e.stopPropagation();
          useEngine.getState().select(partId);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          document.body.style.cursor = "";
        },
      }
    : {};

  return (
    <mesh ref={ref} geometry={geometry} {...handlers} {...mesh}>
      <meshBasicMaterial
        color={INK.paper}
        transparent={see}
        opacity={see ? (look === "ghost" ? 0.06 : 0.03) : 1}
        depthWrite={!see}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
      {selected ? (
        <Edges threshold={threshold} color={INK.selected} lineWidth={2.2} />
      ) : look === "dashed" ? (
        <Edges threshold={threshold} color={INK.dashed} lineWidth={1} dashed dashSize={4} gapSize={3} transparent opacity={0.75} />
      ) : (
        <Edges threshold={threshold} color={see ? INK.faint : color} lineWidth={see ? 1 : lineWidth} />
      )}
    </mesh>
  );
}
