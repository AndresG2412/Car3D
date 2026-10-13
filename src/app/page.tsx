import { EngineViewer } from "@/components/viewer/EngineViewer";
import type { EngineSpec } from "@/lib/engine/kinematics";
import car from "../../data/cars/chevrolet-sail-2013.json";

const window2 = ([open, close]: number[]): [number, number] => [open, close];

const spec: EngineSpec = {
  ...car.engine,
  intakeWindowDeg: window2(car.engine.intakeWindowDeg),
  exhaustWindowDeg: window2(car.engine.exhaustWindowDeg),
};

export default function Home() {
  return <EngineViewer spec={spec} title={`${car.make} ${car.model} ${car.year} · motor ${car.engine.displacementL} L · 1 cilindro`} />;
}
