"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Stroke, strokeOf, wrap720 } from "@/lib/engine/kinematics";
import type { PartInfo } from "@/lib/parts";
import { useEngine } from "@/store/engine";

const STROKE_LABEL: Record<Stroke, { name: string; hint: string; color: string }> = {
  intake: { name: "Admisión", hint: "El pistón baja y entra mezcla por las válvulas de admisión", color: "#5aa9ff" },
  compression: { name: "Compresión", hint: "Válvulas cerradas, el pistón sube y comprime la mezcla", color: "#9fb4d0" },
  power: { name: "Explosión", hint: "La bujía enciende la mezcla y empuja el pistón hacia abajo", color: "#ff8a4c" },
  exhaust: { name: "Escape", hint: "El pistón sube y saca los gases por las válvulas de escape", color: "#b5b7bc" },
};

const ROUTES = [
  { href: "/", label: "Cilindro" },
  { href: "/motor", label: "Motor" },
  { href: "/piston", label: "Pistón" },
  { href: "/escape", label: "Escape" },
];

export type Toggle = "housing" | "explode";

const TOGGLE_LABEL: Record<Toggle, string> = { housing: "Carcasa", explode: "Despiece" };

const SPEEDS = [0.25, 0.5, 1];

const chip = (active: boolean) =>
  `shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${active ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`;

type Props = {
  title: string;
  views: { id: string; label: string }[];
  subject?: string;
  description?: string;
  timeline: boolean;
  toggles: Toggle[];
  parts?: PartInfo[];
};

function PartSheet({ parts }: { parts: PartInfo[] }) {
  const selected = useEngine((s) => s.selected);
  const select = useEngine((s) => s.select);
  const part = parts.find((p) => p.id === selected);
  return (
    <>
      {part && (
        <div className="max-h-[38dvh] overflow-y-auto rounded-xl bg-white/[0.06] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-semibold text-[#ffd84a]">{part.name}</p>
            <button type="button" onClick={() => select(null)} className="text-xs text-white/50 hover:text-white" aria-label="Cerrar ficha">
              Cerrar
            </button>
          </div>
          <p className="mt-1 text-sm text-white/85">{part.role}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/60">
            {part.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {parts.map((p) => (
          <button key={p.id} type="button" onClick={() => select(selected === p.id ? null : p.id)} className={chip(selected === p.id)}>
            {p.name}
          </button>
        ))}
      </div>
    </>
  );
}

export function EngineControls({ title, views, subject, description, timeline, toggles, parts }: Props) {
  const theta = useEngine((s) => s.theta);
  const playing = useEngine((s) => s.playing);
  const speed = useEngine((s) => s.speed);
  const view = useEngine((s) => s.view);
  const housing = useEngine((s) => s.housing);
  const explode = useEngine((s) => s.explode);
  const { setTheta, togglePlaying, setSpeed, setView, toggleHousing, toggleExplode } = useEngine.getState();
  const pathname = usePathname();
  const stroke = STROKE_LABEL[strokeOf(theta)];
  const toggleState: Record<Toggle, [boolean, () => void]> = { housing: [housing, toggleHousing], explode: [explode, toggleExplode] };

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 p-4 sm:p-6">
        <nav className="pointer-events-auto mb-3 flex gap-2 overflow-x-auto">
          {ROUTES.map((r) => (
            <Link key={r.href} href={r.href} className={chip(pathname === r.href)}>
              {r.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">{title}</p>
        {description ? (
          <p className="mt-2 max-w-md text-sm text-white/60">{description}</p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-semibold sm:text-3xl" style={{ color: stroke.color }}>
              {subject && <span className="mr-2 text-white/50">{subject}</span>}
              {stroke.name}
            </p>
            <p className="mt-1 max-w-xs text-sm text-white/60">{stroke.hint}</p>
            <p className="mt-2 font-mono text-xs text-white/40">{Math.round(wrap720(theta))}° de 720°</p>
          </>
        )}
      </header>

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-2xl bg-black/60 p-4 backdrop-blur">
          {parts && <PartSheet parts={parts} />}
          {timeline && (
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
          )}
          <div className="flex flex-wrap items-center gap-2">
            {timeline && (
              <>
                <button type="button" onClick={togglePlaying} className={chip(false)}>
                  {playing ? "Pausa" : "Reproducir"}
                </button>
                {SPEEDS.map((s) => (
                  <button key={s} type="button" onClick={() => setSpeed(s)} className={chip(speed === s)}>
                    {s}×
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-white/20" />
              </>
            )}
            {views.map((v) => (
              <button key={v.id} type="button" onClick={() => setView(v.id)} className={chip(view === v.id)}>
                {v.label}
              </button>
            ))}
            {toggles.length > 0 && <span className="mx-1 h-4 w-px bg-white/20" />}
            {toggles.map((t) => (
              <button key={t} type="button" onClick={toggleState[t][1]} className={chip(toggleState[t][0])}>
                {TOGGLE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
