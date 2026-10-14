import car from "../../data/cars/chevrolet-sail-2013.json";
import type { EngineSpec } from "./engine/kinematics";

const window2 = ([open, close]: number[]): [number, number] => [open, close];

/** The only car for now; later this comes from the database by slug. */
export const currentCar = {
  ...car,
  name: `${car.make} ${car.model} ${car.year}`,
  spec: {
    ...car.engine,
    intakeWindowDeg: window2(car.engine.intakeWindowDeg),
    exhaustWindowDeg: window2(car.engine.exhaustWindowDeg),
  } satisfies EngineSpec,
};
