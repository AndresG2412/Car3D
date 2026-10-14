import type * as THREE from "three";

/** What the sheet of a selectable part says. */
export type PartInfo = {
  id: string;
  name: string;
  /** One sentence: what it is for. */
  role: string;
  details: string[];
};

/** Meshes currently on screen for each part id, so the camera can frame a selection. */
const registry = new Map<string, Set<THREE.Object3D>>();

export function registerPart(id: string, object: THREE.Object3D) {
  const set = registry.get(id) ?? new Set();
  set.add(object);
  registry.set(id, set);
  return () => {
    set.delete(object);
  };
}

export const objectsOf = (id: string) => [...(registry.get(id) ?? [])];
