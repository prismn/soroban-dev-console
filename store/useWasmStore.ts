import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WasmEntry {
  hash: string;
  name: string;
  network: string; // 'testnet', etc.
  installedAt: number;
}

interface WasmState {
  wasms: WasmEntry[];
  addWasm: (entry: WasmEntry) => void;
  removeWasm: (hash: string) => void;
}

export const useWasmStore = create<WasmState>()(
  persist(
    (set) => ({
      wasms: [],
      addWasm: (entry) =>
        set((state) => {
          // Avoid duplicates
          if (state.wasms.find((w) => w.hash === entry.hash)) return state;
          return { wasms: [entry, ...state.wasms] };
        }),
      removeWasm: (hash) =>
        set((state) => ({
          wasms: state.wasms.filter((w) => w.hash !== hash),
        })),
    }),
    {
      name: "soroban-wasm-storage",
    },
  ),
);