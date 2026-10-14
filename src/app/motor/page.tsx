import { EngineInline4 } from "@/components/viewer/engine/EngineInline4";
import { EngineViewer, type ViewPreset } from "@/components/viewer/EngineViewer";
import { currentCar } from "@/lib/cars";

const VIEWS: ViewPreset[] = [
  { id: "iso", label: "3/4", dir: [0.6, 0.35, 0.8], target: [0, 0, 0], fit: [4.6, 4.8] },
  { id: "side", label: "Lado", dir: [0, 0.05, 1], target: [0, 0, 0], fit: [4.6, 4.6] },
  { id: "front", label: "Frente", dir: [1, 0.05, 0], target: [0, 0, 0], fit: [2.8, 4.6] },
  { id: "valves", label: "Válvulas", dir: [0, 0.3, 1], target: [0, 1.35, 0], fit: [4.2, 1.6] },
  { id: "crank", label: "Cigüeñal", dir: [0.45, -0.1, 1], target: [0, -0.85, 0], fit: [4.4, 1.6] },
];

export default function EnginePage() {
  const { engine } = currentCar;
  return (
    <EngineViewer title={`${currentCar.name} · motor ${engine.displacementL} L · ${engine.cylinders} cilindros · orden ${engine.firingOrder.join("-")}`} views={VIEWS} subject="Cilindro 1 ·">
      <EngineInline4 spec={currentCar.spec} firingOrder={engine.firingOrder} />
    </EngineViewer>
  );
}
