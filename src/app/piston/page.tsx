import { PistonAssembly } from "@/components/viewer/piston/PistonAssembly";
import { EngineViewer, type ViewPreset } from "@/components/viewer/EngineViewer";
import { currentCar } from "@/lib/cars";
import piston from "../../../data/systems/piston.json";

const VIEWS: ViewPreset[] = [
  { id: "iso", label: "3/4", dir: [0.8, 0.35, 0.7], target: [0, -0.5, 0], fit: [3, 5.4] },
  { id: "front", label: "Frente", dir: [1, 0.1, 0], target: [0, -0.5, 0], fit: [3, 5.4] },
  { id: "side", label: "Lado", dir: [0, 0.1, 1], target: [0, -0.5, 0], fit: [3, 5.4] },
];

export default function PistonPage() {
  return (
    <EngineViewer
      title={`${currentCar.name} · ${piston.title}`}
      description={piston.description}
      views={VIEWS}
      timeline={false}
      toggles={["explode"]}
      parts={piston.parts}
      offset={[0, -0.3, 0]}
    >
      <PistonAssembly spec={currentCar.spec} />
    </EngineViewer>
  );
}
