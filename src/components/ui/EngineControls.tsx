"use client";

import { type Stroke, strokeOf, wrap720 } from "@/lib/engine/kinematics";
import { type View, useEngine } from "@/store/engine";

const STROKE_LABEL: Record<Stroke, { name: string; hint: string; color: string }> = {
  intake: { name: "Admisión", hint: "El pistón baja y entra mezcla por las válvulas de admisión", color: "#5aa9ff" },
  compression: { name: "Compresión", hint: "Válvulas cerradas, el pistón sube y comprime la mezcla", color: "#9fb4d0" },
  power: { name: "Explosión", hint: "La bujía enciende la mezcla y empuja el pistón hacia abajo", color: "#ff8a4c" },
  exhaust: { name: "Escape", hint: "El pistón sube y saca los gases por las válvulas de escape", color: "#b5b7bc" },
};

const VIEW_LABEL: [View, string][] = [
  ["front", "Frente"],
  ["valves", "Válvulas"],
  ["side", "Lado"],
  ["iso", "3/4"],
];

const SPEEDS = [0.25, 0.5, 1];

const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-xs transition-colors ${active ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`;

export function EngineControls({ title }: { title: string }) {
  const theta = useEngine((s) => s.theta);
  const playing = useEngine((s) => s.playing);
  const speed = useEngine((s) => s.speed);
  const view = useEngine((s) => s.view);
  const block = useEngine((s) => s.block);
  const { setTheta, togglePlaying, setSpeed, setView, setBlock } = useEngine.getState();
  const stroke = STROKE_LABEL[strokeOf(theta)];

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 p-4 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">{title}</p>
        <p className="mt-2 text-2xl font-semibold sm:text-3xl" style={{ color: stroke.color }}>
          {stroke.name}
        </p>
        <p className="mt-1 max-w-xs text-sm text-white/60">{stroke.hint}</p>
        <p className="mt-2 font-mono text-xs text-white/40">{Math.round(wrap720(theta))}° de 720°</p>
      </header>

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-2xl bg-black/60 p-4 backdrop-blur">
          <input
            type="range"
            min={0}
            max={719}
            step={1}
            value={Math.round(wrap720(theta))}
            onChange={(e) => setTheta(Number(e.target.value))}
            aria-label="Ángulo del cigüeñal"
            className="w-full accent-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={togglePlaying} className={chip(false)}>
              {playing ? "Pausa" : "Reproducir"}
            </button>
            {SPEEDS.map((s) => (
              <button key={s} type="button" onClick={() => setSpeed(s)} className={chip(speed === s)}>
                {s}×
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-white/20" />
            {VIEW_LABEL.map(([v, label]) => (
              <button key={v} type="button" onClick={() => setView(v)} className={chip(view === v)}>
                {label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-white/20" />
            <button type="button" onClick={() => setBlock(block === "ghost" ? "hidden" : "ghost")} className={chip(block === "ghost")}>
              Bloque
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
