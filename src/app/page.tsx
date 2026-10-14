import { EngineCylinder } from "@/components/viewer/engine/EngineCylinder";
import { EngineViewer, type ViewPreset } from "@/components/viewer/EngineViewer";
import { currentCar } from "@/lib/cars";

const VIEWS: ViewPreset[] = [
  { id: "front", label: "Frente", dir: [1, 0.05, 0], target: [0, 0, 0], fit: [2.8, 4.6] },
  { id: "valves", label: "Válvulas", dir: [1, 0.12, 0], target: [0, 1.35, 0], fit: [1.2, 1.9] },
  { id: "side", label: "Lado", dir: [0, 0.05, 1], target: [0, 0, 0], fit: [2.8, 4.6] },
  { id: "iso", label: "3/4", dir: [0.68, 0.4, 0.68], target: [0, 0, 0], fit: [3, 4.8] },
];

export default function CylinderPage() {
  return (
    <EngineViewer title={`${currentCar.name} · motor ${currentCar.engine.displacementL} L · 1 cilindro`} views={VIEWS}>
      <EngineCylinder spec={currentCar.spec} />
    </EngineViewer>
  );
}
