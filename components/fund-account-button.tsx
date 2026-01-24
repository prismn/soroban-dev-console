"use client";

import { useState } from "react";
import { useWallet } from "@/store/useWallet";
import { useNetworkStore } from "@/store/useNetworkStore";
import { fundAccount } from "@/lib/friendbot";
import { Button } from "@/components/ui/button";
import { Loader2, Coins } from "lucide-react";
import { toast } from "sonner";

export function FundAccountButton() {
  const { address, isConnected } = useWallet();
  const { currentNetwork } = useNetworkStore();
  const [isLoading, setIsLoading] = useState(false);

  // Friendbot is only available on Testnet (and sometimes Futurenet)
  const isTestnet =
    currentNetwork === "testnet" || currentNetwork === "futurenet";

  if (!isConnected || !address || !isTestnet) {
    return null;
  }

  const handleFund = async () => {
    setIsLoading(true);
    const toastId = toast.loading("Requesting funds from Friendbot...");

    try {
      await fundAccount(address);
      toast.success("Account funded! You received 10,000 XLM.", {
        id: toastId,
      });

      // Optional: Refresh the page to update balances immediately
      // A better way is to trigger a refetch in your Dashboard component via a shared signal
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error(`Funding failed: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleFund}
      disabled={isLoading}
      className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Coins className="h-4 w-4" />
      )}
      {isLoading ? "Funding..." : "Get Testnet XLM"}
    </Button>
  );
}
