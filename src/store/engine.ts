import { create } from "zustand";

type EngineState = {
  theta: number;
  playing: boolean;
  speed: number;
  view: string;
  housing: boolean;
  explode: boolean;
  /** Id of the part whose sheet is open and that the camera frames, if any. */
  selected: string | null;
  setTheta: (theta: number) => void;
  advance: (seconds: number) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  setView: (view: string) => void;
  toggleHousing: () => void;
  toggleExplode: () => void;
  select: (id: string | null) => void;
};

/** Crank degrees per second at speed 1: one full 4-stroke cycle every 8 s. */
const DEG_PER_SECOND = 90;

export const useEngine = create<EngineState>((set) => ({
  theta: 0,
  playing: true,
  speed: 1,
  view: "",
  housing: true,
  explode: false,
  selected: null,
  setTheta: (theta) => set({ theta, playing: false }),
  advance: (seconds) => set((s) => ({ theta: (s.theta + seconds * DEG_PER_SECOND * s.speed) % 720 })),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view, selected: null }),
  toggleHousing: () => set((s) => ({ housing: !s.housing })),
  toggleExplode: () => set((s) => ({ explode: !s.explode })),
  select: (selected) => set({ selected }),
}));
