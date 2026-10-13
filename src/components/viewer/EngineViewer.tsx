"use client";

import { CameraControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { EngineSpec } from "@/lib/engine/kinematics";
import { type View, useEngine } from "@/store/engine";
import { EngineControls } from "@/components/ui/EngineControls";
import { EngineCylinder } from "./engine/EngineCylinder";
import { INK } from "./engine/Part";

/** Each preset: camera direction, the point it looks at, and how close it gets (1 = whole cylinder). */
const VIEWS: Record<View, { dir: [number, number, number]; target: [number, number, number]; zoom: number }> = {
  front: { dir: [1, 0.05, 0], target: [0, 0, 0], zoom: 1 },
  valves: { dir: [1, 0.12, 0], target: [0, 1.35, 0], zoom: 0.42 },
  side: { dir: [0, 0.05, 1], target: [0, 0, 0], zoom: 1 },
  iso: { dir: [0.68, 0.4, 0.68], target: [0, 0, 0], zoom: 1 },
};

/** The model is about 4 units tall and 2.4 wide; back off far enough to fit both on any screen. */
const FOV = 35;
function fitDistance(aspect: number) {
  const half = Math.tan(((FOV / 2) * Math.PI) / 180);
  return Math.max(2.3 / half, 1.4 / (half * aspect));
}

function Clock() {
  useFrame((_, delta) => {
    const { playing, advance } = useEngine.getState();
    if (playing) advance(Math.min(delta, 1 / 20));
  });
  return null;
}

function Rig() {
  const controls = useRef<CameraControls>(null);
  const view = useEngine((s) => s.view);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    const { dir: [x, y, z], target: [tx, ty, tz], zoom } = VIEWS[view];
    const d = (fitDistance(aspect) * zoom) / Math.hypot(x, y, z);
    controls.current?.setLookAt(tx + x * d, ty + y * d, tz + z * d, tx, ty, tz, true);
  }, [view, aspect]);
  return <CameraControls ref={controls} makeDefault minDistance={2} maxDistance={30} smoothTime={0.35} />;
}

export function EngineViewer({ spec, title }: { spec: EngineSpec; title: string }) {
  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: INK.paper }}>
      <Canvas dpr={[1, 2]} camera={{ position: [10, 0.5, 0], fov: FOV, near: 0.05, far: 100 }} gl={{ antialias: true }}>
        <color attach="background" args={[INK.paper]} />
        <Clock />
        <Rig />
        <group scale={0.01} position={[0, -0.9, 0]}>
          <EngineCylinder spec={spec} />
        </group>
      </Canvas>
      <EngineControls title={title} />
    </div>
  );
}
