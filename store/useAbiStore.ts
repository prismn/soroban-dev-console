import { create } from "zustand";
import { persist } from "zustand/middleware";
import { xdr } from "@stellar/stellar-sdk";

interface ContractSpec {
  functions: string[];
  rawSpec: string;
}

interface AbiState {
  specs: Record<string, ContractSpec>;
  setSpec: (contractId: string, spec: ContractSpec) => void;
  getSpec: (contractId: string) => ContractSpec | undefined;
}

export const useAbiStore = create<AbiState>()(
  persist(
    (set, get) => ({
      specs: {},
      setSpec: (contractId, spec) =>
        set((state) => ({
          specs: { ...state.specs, [contractId]: spec },
        })),
      getSpec: (contractId) => get().specs[contractId],
    }),
    { name: "soroban-abi-storage" },
  ),
);
