export type EngineSpec = {
  displacementL: number;
  cylinders: number;
  valvesPerCylinder: number;
  boreMm: number;
  strokeMm: number;
  rodMm: number;
  compressionHeightMm: number;
  valveLiftMm: number;
  intakeWindowDeg: [number, number];
  exhaustWindowDeg: [number, number];
};

export type Stroke = "intake" | "compression" | "power" | "exhaust";

export const STROKES: Stroke[] = ["intake", "compression", "power", "exhaust"];

const DEG = Math.PI / 180;

/** Every height of the single-cylinder layout, in mm, with the crank axis at y = 0. */
export function layoutOf(spec: EngineSpec) {
  const throw_ = spec.strokeMm / 2;
  const crownTdc = throw_ + spec.rodMm + spec.compressionHeightMm;
  const deck = crownTdc + 6;
  const headTop = deck + 16;
  const camRadius = 12;
  const camY = headTop + 46;
  const bucketHeight = 12;
  const bucketBottom = camY - camRadius - bucketHeight;
  return {
    boreRadius: spec.boreMm / 2,
    throw: throw_,
    crownTdc,
    deck,
    headTop,
    camRadius,
    camY,
    bucketHeight,
    bucketBottom,
    barrelBottom: crownTdc - spec.strokeMm - 52,
    valveX: 12,
    valveZ: 24,
  };
}

export const wrap720 = (theta: number) => ((theta % 720) + 720) % 720;

export function strokeOf(theta: number): Stroke {
  return STROKES[Math.floor(wrap720(theta) / 180)];
}

/** Height of the wrist pin above the crank axis (slider-crank). */
export function wristY(spec: EngineSpec, theta: number) {
  const t = spec.strokeMm / 2;
  const a = theta * DEG;
  return t * Math.cos(a) + Math.sqrt(spec.rodMm ** 2 - (t * Math.sin(a)) ** 2);
}

/** Angle of the rod about the crank axis, from the crank pin toward the wrist pin. */
export function rodAngle(spec: EngineSpec, theta: number) {
  const t = spec.strokeMm / 2;
  const a = theta * DEG;
  return Math.atan2(-t * Math.sin(a), Math.sqrt(spec.rodMm ** 2 - (t * Math.sin(a)) ** 2));
}

/** Valve lift for a cam window [open, close] in crank degrees, smooth 1 - cos bump. */
export function liftAt(spec: EngineSpec, theta: number, [open, close]: [number, number]) {
  const d = wrap720(theta - open);
  const span = close - open;
  return d >= span ? 0 : spec.valveLiftMm * 0.5 * (1 - Math.cos((2 * Math.PI * d) / span));
}

/** Spark flash envelope, peaking a few degrees before TDC of the power stroke. */
export const sparkAt = (theta: number) => Math.exp(-(((wrap720(theta) - 355) / 12) ** 2));
