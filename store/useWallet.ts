import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as freighter from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletType: "freighter" | "albedo" | null;
  connectFreighter: () => Promise<void>;
  connectAlbedo: () => Promise<void>;
  disconnect: () => void;
}

export const useWallet = create<WalletState>()(
  persist(
    (set) => ({
      isConnected: false,
      address: null,
      walletType: null,

      connectFreighter: async () => {
        try {
          // 1. Check if the extension is installed
          if (freighter.isConnected) {
            const installed = await freighter.isConnected();
            if (!installed) {
              throw new Error(
                "Freighter is not installed. Please install the browser extension.",
              );
            }
          }

          // 2. Request connection access
          if (freighter.isAllowed) {
            const allowedRes = await freighter.isAllowed();
            const hasAccess =
              typeof allowedRes === "object"
                ? (allowedRes as any).isAllowed
                : allowedRes;
            if (!hasAccess && freighter.setAllowed) {
              await freighter.setAllowed();
            }
          }

          // 3. Retrieve the address (Handling different API version signatures safely)
          let finalAddress = "";

          if (freighter.getAddress) {
            const addrRes = await freighter.getAddress();
            finalAddress =
              typeof addrRes === "object" ? (addrRes as any).address : addrRes;
          }

          // Fallback for some versions of Freighter
          if (!finalAddress && freighter.getPublicKey) {
            const pubKeyRes = await freighter.getPublicKey();
            finalAddress =
              typeof pubKeyRes === "object"
                ? (pubKeyRes as any).publicKey
                : pubKeyRes;
          }

          if (!finalAddress) {
            throw new Error(
              "Could not retrieve address. Make sure your Freighter wallet is unlocked.",
            );
          }

          set({
            isConnected: true,
            address: finalAddress,
            walletType: "freighter",
          });
        } catch (e: any) {
          console.error("Freighter connection failed", e);
          throw e;
        }
      },

      connectAlbedo: async () => {
        try {
          const result = await albedo.publicKey({});
          set({
            isConnected: true,
            address: result.pubkey,
            walletType: "albedo",
          });
        } catch (e) {
          console.error("Albedo connection failed", e);
          throw e;
        }
      },

      disconnect: () => {
        set({ isConnected: false, address: null, walletType: null });
      },
    }),
    {
      name: "soroban-wallet-storage",
    },
  ),
);
