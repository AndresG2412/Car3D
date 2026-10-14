import { ExhaustSystem } from "@/components/viewer/exhaust/ExhaustSystem";
import { EngineViewer, type ViewPreset } from "@/components/viewer/EngineViewer";
import { currentCar } from "@/lib/cars";
import exhaust from "../../../data/systems/exhaust.json";

/** The car's middle sits at z = -1275 mm, so the scene is shifted forward by 12.75 units. */
const VIEWS: ViewPreset[] = [
  { id: "overview", label: "Completo", dir: [1, 0.45, 0.1], target: [0, -1, 0], fit: [50, 16] },
  { id: "under", label: "Por debajo", dir: [0.05, -1, 0.3], target: [0, -2, -3], fit: [24, 60] },
  { id: "engine", label: "Motor", dir: [0.6, 0.45, 1], target: [0, 0.2, 13.4], fit: [6, 6] },
  { id: "rear", label: "Trasera", dir: [1, 0.5, -0.7], target: [2.8, -2, -18.25], fit: [9, 6] },
];

export default function ExhaustPage() {
  return (
    <EngineViewer
      title={`${currentCar.name} · ${exhaust.title}`}
      description={exhaust.description}
      views={VIEWS}
      parts={exhaust.parts}
      offset={[0, 0, 12.75]}
    >
      <ExhaustSystem spec={currentCar.spec} firingOrder={currentCar.engine.firingOrder} />
    </EngineViewer>
  );
}
