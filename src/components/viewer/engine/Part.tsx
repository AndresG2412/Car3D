"use client";

import { Edges } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";

export const INK = {
  paper: "#0c0d0f",
  line: "#d8dade",
  moving: "#f4f5f7",
  faint: "#4a4e55",
  intake: "#5aa9ff",
  exhaust: "#ff8a4c",
  spark: "#fff1a8",
};

type PartProps = ThreeElements["mesh"] & {
  geometry: THREE.BufferGeometry;
  color?: string;
  ghost?: boolean;
  lineWidth?: number;
  threshold?: number;
};

/**
 * One piece drawn as lines: a paper-coloured fill hides what is behind it (hidden-line look),
 * and its sharp edges are stroked. A ghost part is see-through and stroked faintly.
 */
export function Part({ geometry, color = INK.line, ghost = false, lineWidth = 1.2, threshold = 15, ...mesh }: PartProps) {
  return (
    <mesh geometry={geometry} {...mesh}>
      <meshBasicMaterial
        color={INK.paper}
        transparent={ghost}
        opacity={ghost ? 0.06 : 1}
        depthWrite={!ghost}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
      <Edges threshold={threshold} color={ghost ? INK.faint : color} lineWidth={ghost ? 1 : lineWidth} />
    </mesh>
  );
}
