import { create } from "zustand";

export type View = "front" | "valves" | "side" | "iso";
export type BlockMode = "ghost" | "hidden";

type EngineState = {
  theta: number;
  playing: boolean;
  speed: number;
  view: View;
  block: BlockMode;
  setTheta: (theta: number) => void;
  advance: (seconds: number) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  setView: (view: View) => void;
  setBlock: (block: BlockMode) => void;
};

/** Crank degrees per second at speed 1: one full 4-stroke cycle every 8 s. */
const DEG_PER_SECOND = 90;

export const useEngine = create<EngineState>((set) => ({
  theta: 0,
  playing: true,
  speed: 1,
  view: "front",
  block: "ghost",
  setTheta: (theta) => set({ theta, playing: false }),
  advance: (seconds) => set((s) => ({ theta: (s.theta + seconds * DEG_PER_SECOND * s.speed) % 720 })),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view }),
  setBlock: (block) => set({ block }),
}));
