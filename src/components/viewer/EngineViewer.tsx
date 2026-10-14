"use client";

import { CameraControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useEffect, useRef } from "react";
import * as THREE from "three";
import { type PartInfo, objectsOf } from "@/lib/parts";
import { useEngine } from "@/store/engine";
import { EngineControls, type Toggle } from "@/components/ui/EngineControls";
import { INK } from "./engine/Part";

/**
 * A camera preset: the direction it looks from, the point it looks at (scene units, 1 = 100 mm)
 * and the width and height that must fit on screen.
 */
export type ViewPreset = {
  id: string;
  label: string;
  dir: [number, number, number];
  target: [number, number, number];
  fit: [number, number];
};

const FOV = 35;

function fitDistance([w, h]: [number, number], aspect: number) {
  const half = Math.tan(((FOV / 2) * Math.PI) / 180);
  return Math.max(h / 2 / half, w / 2 / (half * aspect));
}

function Clock() {
  useFrame((_, delta) => {
    const { playing, advance } = useEngine.getState();
    if (playing) advance(Math.min(delta, 1 / 20));
  });
  return null;
}

/** Moves the camera to the chosen preset, or frames the selected part from where the camera is. */
function Rig({ views }: { views: ViewPreset[] }) {
  const controls = useRef<CameraControls>(null);
  const view = useEngine((s) => s.view);
  const selected = useEngine((s) => s.selected);
  const explode = useEngine((s) => s.explode);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));

  // a preset, whenever it changes or the selection is cleared
  const framing = selected !== null;
  useEffect(() => {
    const c = controls.current;
    if (!c || framing) return;
    const preset = views.find((v) => v.id === view) ?? views[0];
    const [x, y, z] = preset.dir;
    const [tx, ty, tz] = preset.target;
    const d = fitDistance(preset.fit, aspect) / Math.hypot(x, y, z);
    c.setFocalOffset(0, 0, 0, true);
    c.setLookAt(tx + x * d, ty + y * d, tz + z * d, tx, ty, tz, true);
  }, [view, views, aspect, framing]);

  // the selected part, from where the camera is, once an explode animation has settled
  useEffect(() => {
    const c = controls.current;
    if (!c || !selected) return;
    const timer = setTimeout(() => {
      const box = new THREE.Box3();
      for (const object of objectsOf(selected)) box.expandByObject(object);
      if (box.isEmpty()) return;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const half = Math.tan(((FOV / 2) * Math.PI) / 180) * Math.min(1, aspect);
      const distance = Math.max(0.8, (sphere.radius * 2.4) / half);
      const from = c.camera.position.clone().sub(c.getTarget(new THREE.Vector3())).normalize();
      const at = sphere.center;
      c.setLookAt(at.x + from.x * distance, at.y + from.y * distance, at.z + from.z * distance, at.x, at.y, at.z, true);
      // keep the part above the sheet that opens at the bottom of the screen
      c.setFocalOffset(0, distance * half * 0.4, 0, true);
    }, 380);
    return () => clearTimeout(timer);
  }, [selected, explode, aspect]);

  return <CameraControls ref={controls} makeDefault minDistance={0.4} maxDistance={120} smoothTime={0.35} />;
}

type ViewerProps = {
  title: string;
  views: ViewPreset[];
  children: ReactNode;
  /** Prefix for the stroke name, e.g. which cylinder it describes. */
  subject?: string;
  /** Replaces the stroke read-out in the header. */
  description?: string;
  /** Show the 720° timeline and the stroke read-out. */
  timeline?: boolean;
  toggles?: Toggle[];
  parts?: PartInfo[];
  /** Where the model's mm origin sits in the scene (scene units). */
  offset?: [number, number, number];
};

export function EngineViewer({ title, views, children, subject, description, timeline = true, toggles = ["housing"], parts, offset = [0, -0.9, 0] }: ViewerProps) {
  useEffect(() => {
    useEngine.setState({ view: views[0].id, playing: true, selected: null, explode: false });
  }, [views]);

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: INK.paper }}>
      <Canvas dpr={[1, 2]} camera={{ position: [12, 0.5, 0], fov: FOV, near: 0.05, far: 400 }} gl={{ antialias: true }}>
        <color attach="background" args={[INK.paper]} />
        <Clock />
        <Rig views={views} />
        <group scale={0.01} position={offset}>
          {children}
        </group>
      </Canvas>
      <EngineControls title={title} views={views} subject={subject} description={description} timeline={timeline} toggles={toggles} parts={parts} />
    </div>
  );
}
