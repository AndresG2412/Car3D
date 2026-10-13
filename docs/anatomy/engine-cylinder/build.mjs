// Fig 1 · Un cilindro del motor 1.4 L 16V en corte, ciclo de 4 tiempos.
// Construido con la skill anatomy: node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LATHE = join(HERE, "../../../.claude/skills/anatomy/kit/lathe.mjs");
const theme = process.argv.includes("--light") ? "light" : "dark";

// Unidades del mundo: 1 = 1 mm. Datos representativos de un 1.4 L de 4 cilindros
// (diámetro 77.6 × carrera 73.4 → 1389 cc). Biela y alzada de válvula aproximadas.
const C = {
  BORE_R: 38.8,
  THROW: 36.7, // carrera / 2
  ROD: 130,
  CH: 28, // altura de compresión: pasador → corona
  ZC: 67.3, // eje del cigüeñal
  REST: 262, // corona en PMS
  LIFT: 8,
  VX: -12, // válvulas en la mitad conservada
  VY: 24, // admisión en -VY, escape en +VY
  ZCAM: 327,
  CAM_R: 12,
  DECK: 268,
  HEAD_TOP: 282,
  BARREL_Z: 135,
  INTAKE: [-15, 235],
  EXHAUST: [485, 735],
};

const WIDTH = 600;
const HEIGHT = 720;
const PLATE = { x: -82, y: -76, w: 164, d: 152, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-12, -24, C.ZCAM + 22], [-12, 24, C.ZCAM + 22], [0, 0, 345], [60, 26, C.ZC + 26], [60, -26, C.ZC]],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 45 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const AXIS_X = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);

// ---------- modelo puro (se usa en Node y en la página) ----------
function crownAt(C, th) {
  const a = (th * Math.PI) / 180;
  return C.ZC + C.THROW * Math.cos(a) + Math.sqrt(C.ROD ** 2 - (C.THROW * Math.sin(a)) ** 2) + C.CH;
}
function liftAt(C, th, [open, close]) {
  const d = (((th - open) % 720) + 720) % 720;
  const span = close - open;
  return d >= span ? 0 : C.LIFT * 0.5 * (1 - Math.cos((2 * Math.PI * d) / span));
}
function strokeOf(th) {
  const t = ((th % 720) + 720) % 720;
  return ["Admisión", "Compresión", "Explosión", "Escape"][Math.floor(t / 180)];
}

// ---------- piezas que cambian de forma cada cuadro ----------
function circlePts(cy, cz, r, n, a0 = 0, span = Math.PI * 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (span * i) / (span === Math.PI * 2 ? n : n - 1);
    out.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return out;
}
function crankSvg(C, P, th) {
  const a = (th * Math.PI) / 180;
  const pin = [C.THROW * Math.sin(a), C.ZC + C.THROW * Math.cos(a)];
  const wrist = [0, crownAt(C, th) - C.CH];
  const F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const away = Math.atan2(-(pin[1] - C.ZC), -pin[0]);
  const web = G.hullOf([...circlePts(0, C.ZC, 22, 36), ...circlePts(pin[0], pin[1], 16, 28), ...circlePts(0, C.ZC, 48, 15, away - 0.95, 1.9)]);
  const rod = G.hullOf([...circlePts(pin[0], pin[1], 19, 32), ...circlePts(wrist[0], wrist[1], 11, 24)]);
  const S = (paths, style) => k.solidSvg(paths, style);
  const bolts = [-1, 1].map((side) => k.iso([6, pin[0] + side * 13 * Math.cos(a), pin[1] - side * 13 * Math.sin(a)], P));
  return (
    S(G.prismOf(F, web, -18, -8, P), { tone: "mid" }) +
    S(G.prismOf(F, circlePts(pin[0], pin[1], 12, 28), -8, 8, P), { tone: "mid" }) +
    S(G.prismOf(F, rod, -6, 6, P), { tone: "hi" }) +
    k.dotsSvg(bolts, { size: 0.55, tone: "lo" }) +
    k.dotsSvg([k.iso([6, wrist[0], wrist[1]], P)], { size: 0.5, tone: "mid" }) +
    S(G.prismOf(F, web, 8, 18, P), { tone: "mid" })
  );
}
function lobeSvg(C, P, th, side) {
  const window = side < 0 ? C.INTAKE : C.EXHAUST;
  const phi = (-th / 2) * (Math.PI / 180);
  const pts = [];
  for (let i = 0; i < 90; i++) {
    const alpha = (i / 90) * Math.PI * 2;
    const r = C.CAM_R + liftAt(C, 180 + (2 * alpha * 180) / Math.PI, window);
    pts.push([r * Math.cos(alpha + phi), r * Math.sin(alpha + phi)]);
  }
  const F = G.frameOf([0, side * C.VY, C.ZCAM], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  return k.solidSvg(G.prismOf(F, G.hullOf(pts), C.VX - 4, C.VX + 4, P), { tone: "hi" });
}
function springSvg(C, P, top, y) {
  const z0 = C.HEAD_TOP + 10, z1 = top, r = 8, turns = 4.5, n = 140;
  const toward = Math.PI / 4;
  const runs = { back: [], front: [] };
  let run = null, kind = null;
  const out = (list) => (list.length > 1 ? k.pathOf(list) : "");
  const paths = { back: "", front: "" };
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * turns * Math.PI * 2;
    const front = Math.cos(phi - toward) > 0 ? "front" : "back";
    const p = k.iso([C.VX + r * Math.cos(phi), y + r * Math.sin(phi), z0 + ((z1 - z0) * i) / n], P);
    if (front !== kind) {
      if (run) { run.push(p); paths[kind] += out(run); }
      run = [p];
      kind = front;
    } else run.push(p);
  }
  if (run) paths[kind] += out(run);
  return paths;
}

// ---------- piezas estáticas ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 20).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -66, y: PLATE.y + PLATE.d - 16, w: 132, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const label = { x: 30, y: PLATE.y + 12, w: 40, d: 18, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 20, label.y + 8], 0.8, P, "x"), "SAIL 1.4 16V", { size: 3, tone: "mid", anchor: "middle" }));
  out.push(L([12, 15].map((dy) => k.lineOnTop([label.x + 6, label.y + dy], [label.x + 34, label.y + dy], 0.8, P)).join(""), { tone: "faint", free: true }));
  out.push(D(k.corners(label, 2.2).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  return out.join("");
}

function pillar(y) {
  const plan = { x: -52, y, w: 12, d: 12, r: 1.5 };
  return S(k.slabOf({ x: -55, y: y - 3, w: 18, d: 18, r: 2 }, 0, 4, P, 4, 0.5), { tone: "mid" }) + S(k.slabOf(plan, 4, C.BARREL_Z - 4, P, 4, 0.5), { tone: "mid" }) + D([at([-46, y + 6, C.BARREL_Z - 8])], { size: 0.45 });
}

function pedestal(x) {
  const plan = { x, y: -24, w: 10, d: 48, r: 2 };
  const top = C.ZC + 26;
  const out = [S(k.slabOf({ x: x - 3, y: -30, w: 16, d: 60, r: 2 }, 0, 4, P, 4, 0.5), { tone: "mid" })];
  out.push(S(k.slabOf(plan, 4, top - 4, P, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, C.ZC, P, 4), { tone: "faint" }) }));
  out.push(D([[x + 5, -18], [x + 5, 18]].map(([px, py]) => at([px, py, top])), { size: 0.55 }));
  out.push(D([[x - 1, -26], [x + 11, -26], [x - 1, 26], [x + 11, 26]].map(([px, py]) => at([px, py, 4])), { size: 0.45 }));
  return out.join("");
}

function hatch(x, y0, y1, z0, z1, step = 5) {
  const segs = [];
  for (let c = y0 + z0 + step; c < y1 + z1; c += step) {
    const a = [Math.max(y0, c - z1), 0];
    a[1] = c - a[0];
    const b = [Math.min(y1, c - z0), 0];
    b[1] = c - b[0];
    if (b[0] - a[0] > 0.5) segs.push(k.segment([x, a[0], a[1]], [x, b[0], b[1]], P));
  }
  return segs.join("");
}

function barrelPiece(side) {
  const R = C.BORE_R;
  const arc = [];
  for (let i = 0; i <= 24; i++) {
    const a = side < 0 ? Math.PI * 1.5 - (Math.PI / 2) * (i / 24) : Math.PI / 2 + (Math.PI / 2) * (i / 24);
    arc.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  const ring = side < 0 ? [[0, -50], [-50, -50], [-50, 0], ...arc.reverse()] : [[-50, 0], [-50, 50], [0, 50], ...arc];
  const h = C.DECK - C.BARREL_Z;
  const y0 = side < 0 ? -50 : R, y1 = side < 0 ? -R : 50;
  const fins = [170, 205, 240].map((z) => k.ringSeam(ring, z, P)).join("");
  return S(k.extrude(ring, C.BARREL_Z, h, P, { convex: false }), { tone: "mid", inner: L(hatch(0, y0, y1, C.BARREL_Z, C.DECK), { tone: "faint" }) + L(fins, { tone: "faint" }) });
}

function headPiece(side) {
  const plan = { x: -50, y: side < 0 ? -50 : 0, w: 50, d: 50, r: 0 };
  const y0 = side < 0 ? -50 : 0, y1 = side < 0 ? 0 : 50;
  const out = [S(k.slabOf(plan, C.DECK, C.HEAD_TOP - C.DECK, P, 2, 0.5), { tone: "mid", inner: L(hatch(0, y0, y1, C.DECK, C.HEAD_TOP, 4), { tone: "faint" }) + L(k.sideSeam(plan, C.DECK + 2, P, 2), { tone: "faint" }) })];
  out.push(L(k.ring(-44, side * 44, 2.4, C.HEAD_TOP, P, 16) + k.ring(-44, side * 10, 2.4, C.HEAD_TOP, P, 16), { tone: "lo" }));
  out.push(D([at([-44, side * 44, C.HEAD_TOP]), at([-44, side * 10, C.HEAD_TOP])], { size: 0.55 }));
  return out.join("");
}

function journal(s0, s1, r = 20) {
  return S(G.disc(s0, s1, r, AXIS_X([0, 0, C.ZC]), P), { tone: "mid" });
}

function pulley() {
  const F = AXIS_X([0, 0, C.ZC]);
  const out = [S(G.disc(44, 50, 15, F, P), { tone: "mid" })];
  out.push(S(G.disc(50, 60, 26, F, P), { tone: "mid", inner: L([53, 57].map((s) => G.arcOf(F, s, 26, P)).join(""), { tone: "faint" }) }));
  out.push(L(G.circleOf(F, 60, 9, P), { tone: "lo" }));
  out.push(S(G.disc(60, 63, 7, F, P), { tone: "mid" }));
  out.push(D([at([63, 0, C.ZC])], { size: 0.6, tone: "lo" }));
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r1 = i % 6 === 0 ? 19 : 21.5;
    ticks.push(k.segment([60, r1 * Math.sin(a), C.ZC + r1 * Math.cos(a)], [60, 24 * Math.sin(a), C.ZC + 24 * Math.cos(a)], P));
  }
  out.push(L(ticks.join(""), { tone: "lo" }));
  return out.join("");
}

function pistonStatic() {
  const top = C.REST, low = C.REST - 56;
  const out = [S(k.cylinder(0, 0, 38.2, low, top - low, P, 72, 0.6), { tone: "hi", inner: L([top - 5, top - 9, top - 13].map((z) => k.sideArc(0, 0, 38.2, z, P, 48)).join(""), { tone: "lo" }) })];
  out.push(L(k.ring(0, 0, 33, top, P, 56), { tone: "faint" }));
  out.push(L(k.ring(-12, -24, 8, top, P, 24) + k.ring(-12, 24, 7.4, top, P, 24), { tone: "faint" }));
  out.push(L(k.sideRing([38.2, 0, top - C.CH], 7, "x", P, 24), { tone: "lo" }));
  out.push(D([at([38.2, 0, top - C.CH])], { size: 0.5, tone: "mid" }));
  return out.join("");
}

function valveLower(side) {
  const y = side * C.VY;
  const r = side < 0 ? 7.6 : 6.8;
  const F = G.frameOf([C.VX, y, C.DECK], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  return S(G.solidOf([[-6.5, 0], [-6.5, r], [-5, r], [-3.5, 3.4, 1], [-1.5, 2.6], [0.5, 2.6]], F, P), { tone: "hi" });
}

function valveUpperStatic(side) {
  const y = side * C.VY;
  const restTop = C.ZCAM - C.CAM_R;
  const out = [];
  out.push(S(k.cylinder(C.VX, y, 2.6, C.HEAD_TOP + 10, restTop - 12 - C.HEAD_TOP - 10, P, 16), { tone: "hi", crease: "none" }));
  return out.join("");
}

function valveGuide(side) {
  const y = side * C.VY;
  return S(k.cylinder(C.VX, y, 10, C.HEAD_TOP, 3, P, 32), { tone: "lo" }) + S(k.cylinder(C.VX, y, 4.6, C.HEAD_TOP + 3, 9, P, 20), { tone: "mid" });
}

function valveTop(side) {
  const y = side * C.VY;
  const restTop = C.ZCAM - C.CAM_R;
  return S(k.cylinder(C.VX, y, 6, restTop - 14, 2, P, 24), { tone: "mid" }) + S(k.cylinder(C.VX, y, 9, restTop - 12, 12, P, 36, 0.5), { tone: "hi", inner: L(k.sideArc(C.VX, y, 9, restTop - 3, P, 24), { tone: "faint" }) });
}

function camTower(side) {
  const y = side * C.VY;
  const plan = { x: -40, y: y - 10, w: 8, d: 20, r: 1 };
  return S(k.slabOf(plan, C.HEAD_TOP, C.ZCAM - C.HEAD_TOP + 10, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, C.ZCAM, P, 2), { tone: "faint" }) }) + D([at([-36, y - 6, C.ZCAM + 10]), at([-36, y + 6, C.ZCAM + 10])], { size: 0.5 });
}

function camShaft(side, s0, s1) {
  const F = AXIS_X([0, side * C.VY, C.ZCAM]);
  return S(G.disc(s0, s1, 6, F, P), { tone: "mid" });
}

function sparkPlug() {
  const out = [];
  const hex = Array.from({ length: 6 }, (_, i) => [7 * Math.cos((i * Math.PI) / 3 + Math.PI / 6), 7 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);
  out.push(S(k.cylinder(0, 0, 8.5, C.HEAD_TOP, 2, P, 32), { tone: "lo" }));
  out.push(S(k.extrude(hex, C.HEAD_TOP + 2, 9, P), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 4.6, C.HEAD_TOP + 11, 26, P, 24), { tone: "hi", inner: L([C.HEAD_TOP + 16, C.HEAD_TOP + 21, C.HEAD_TOP + 26, C.HEAD_TOP + 31].map((z) => k.sideArc(0, 0, 4.6, z, P, 16)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(0, 0, 2.4, C.HEAD_TOP + 37, 6, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 3.2, C.HEAD_TOP + 43, 2, P, 16), { tone: "mid" }));
  return out.join("");
}

// ---------- ensamblado ----------
const TH0 = 0;
const slot = (name, inner, transform = "") => `<g data-part="${name}"${transform ? ` transform="${transform}"` : ""}>${inner}</g>`;
const springs0 = [-1, 1].map((side) => springSvg(C, P, C.ZCAM - C.CAM_R - 14, side * C.VY));
const sparkAt = at([0, 0, C.DECK - 1.5]);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un cilindro de un motor de 1.4 litros y 16 válvulas, cortado por la mitad sobre una base. El cigüeñal gira sobre dos soportes, la biela empuja el pistón dentro de la camisa, y arriba dos árboles de levas abren una válvula de admisión y una de escape; la bujía salta en la explosión.",
  body: [
    base(),
    pillar(-50),
    pedestal(-44),
    journal(-34, -18),
    barrelPiece(-1),
    slot("crank", crankSvg(C, P, TH0)),
    journal(18, 34),
    slot("piston", pistonStatic()),
    barrelPiece(1),
    pillar(38),
    pedestal(34),
    pulley(),
    `<path data-part="mark" class="iso-line" data-tone="lit" d=""/>`,
    slot("valve-in-low", valveLower(-1)),
    slot("valve-ex-low", valveLower(1)),
    `<g data-part="spark" opacity="0"><circle cx="${sparkAt[0]}" cy="${sparkAt[1]}" r="7" class="iso-halo" style="filter:blur(3px)"/><path class="iso-line" data-tone="lit" d="${[0, 1, 2, 3, 4, 5].map((i) => { const a = (i * Math.PI) / 3; return `M${(sparkAt[0] + 2 * Math.cos(a)).toFixed(1)} ${(sparkAt[1] + 2 * Math.sin(a)).toFixed(1)}L${(sparkAt[0] + 5 * Math.cos(a)).toFixed(1)} ${(sparkAt[1] + 5 * Math.sin(a)).toFixed(1)}`; }).join("")}"/>${D([sparkAt], { size: 1.4, tone: "lit" })}</g>`,
    headPiece(-1),
    headPiece(1),
    ...[-1, 1].flatMap((side) => {
      const tag = side < 0 ? "in" : "ex";
      const parts = [
        camTower(side),
        slot(`spring-${tag}-back`, L(springs0[side < 0 ? 0 : 1].back, { tone: "lo" })),
        slot(`valve-${tag}-stem`, valveUpperStatic(side)),
        valveGuide(side),
        slot(`spring-${tag}-front`, L(springs0[side < 0 ? 0 : 1].front, { tone: "mid" })),
        slot(`valve-${tag}-top`, valveTop(side)),
        camShaft(side, -32, C.VX - 4),
        slot(`lobe-${tag}`, lobeSvg(C, P, TH0, side)),
        camShaft(side, C.VX + 4, 0),
        L(G.circleOf(AXIS_X([0, side * C.VY, C.ZCAM]), 0, 2, P), { tone: "faint" }),
      ];
      return side < 0 ? [...parts, sparkPlug()] : parts;
    }),
  ],
});

const latheSrc = readFileSync(LATHE, "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const live = `
const G = (() => { ${latheSrc}
return { prismOf, frameOf, hullOf }; })();
const k = { iso, pathOf, solidSvg, lineSvg, dotsSvg, translateAlong, segment };
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
${crownAt.toString()}
${liftAt.toString()}
${strokeOf.toString()}
${circlePts.toString()}
${crankSvg.toString()}
${lobeSvg.toString()}
${springSvg.toString()}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const crank = part("crank"), piston = part("piston"), mark = part("mark"), spark = part("spark");
const valves = { in: [part("valve-in-low"), part("valve-in-stem"), part("valve-in-top")], ex: [part("valve-ex-low"), part("valve-ex-stem"), part("valve-ex-top")] };
const springs = { in: [part("spring-in-back"), part("spring-in-front")], ex: [part("spring-ex-back"), part("spring-ex-front")] };
const lobes = { in: part("lobe-in"), ex: part("lobe-ex") };
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const PER_SECOND = 90;
let th = still.matches ? 360 : 0, target = th, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0;
function draw() {
  crank.innerHTML = crankSvg(C, P, th);
  piston.setAttribute("transform", k.translateAlong(P, [0, 0, crownAt(C, th) - C.REST]));
  for (const [tag, side, win] of [["in", -1, C.INTAKE], ["ex", 1, C.EXHAUST]]) {
    const lift = liftAt(C, th, win);
    const shift = k.translateAlong(P, [0, 0, -lift]);
    valves[tag].forEach((g) => g.setAttribute("transform", shift));
    const s = springSvg(C, P, C.ZCAM - C.CAM_R - 14 - lift, side * C.VY);
    springs[tag][0].innerHTML = k.lineSvg(s.back, { tone: "lo" });
    springs[tag][1].innerHTML = k.lineSvg(s.front, { tone: "mid" });
    lobes[tag].innerHTML = lobeSvg(C, P, th, side);
  }
  const a = (th * Math.PI) / 180;
  mark.setAttribute("d", k.segment([63.2, 15 * Math.sin(a), C.ZC + 15 * Math.cos(a)], [63.2, 24 * Math.sin(a), C.ZC + 24 * Math.cos(a)], P));
  const t = ((th % 720) + 720) % 720;
  const flash = Math.exp(-(((t - 355) / 14) ** 2));
  spark.setAttribute("opacity", flash.toFixed(3));
  const li = liftAt(C, th, C.INTAKE), le = liftAt(C, th, C.EXHAUST);
  const drop = C.REST - crownAt(C, th);
  const text = strokeOf(th) + " · " + Math.round(t) + "° · pistón −" + drop.toFixed(0) + " mm";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(t)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { th = (th + PER_SECOND * dt) % 720; target = th; }
  else th = still.matches ? target : th + (target - th) * (1 - Math.exp(-dt / 0.18));
  if (!touring && Math.abs(target - th) < 0.05) th = target;
  draw();
  const settled = !touring && th === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => {
  if (touring) { target = th; }
  touring = false;
  target = Math.max(0, Math.min(720, to));
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; run(); }, 3500);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.1) / 0.8));
  if (touring) th = th % 720;
  steer(share * 720);
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(720, Math.round(target / 30) * 30 + 30);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, Math.round(target / 30) * 30 - 30);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 720;
  if (to === null) return;
  event.preventDefault();
  if (touring) target = th % 720;
  steer(to);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Un cilindro, cuatro tiempos",
  hint: "Mueve el puntero para girar",
  readout: "Admisión · 0° · pistón −0 mm",
  keys: [
    { mark: "raised", label: "Piezas móviles: cigüeñal, biela, pistón, válvulas y levas" },
    { mark: "lit", label: "Chispa de la bujía y marca de giro de la polea" },
    { mark: "dim", label: "Bloque y culata cortados por la mitad (sección rayada)" },
  ],
  caption:
    "Un cilindro del 1.4 L (77.6 × 73.4 mm) en corte. Dos vueltas del cigüeñal (720°) son un ciclo: admisión, compresión, explosión y escape. Los árboles de levas giran a media velocidad; aquí se ve una de las dos válvulas de admisión y una de las dos de escape, las otras quedan en la mitad cortada. Medidas de biela y alzada aproximadas.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cilindro del motor: las flechas giran el cigüeñal de 30 en 30 grados" aria-valuemin="0" aria-valuemax="720" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "engine-cylinder-light.html" : "engine-cylinder.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Un cilindro, cuatro tiempos", theme, body, script: kitScript() + live }));
console.log("wrote", name);
