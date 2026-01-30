"use client";

import { useState, useEffect } from "react";
import {
  Contract,
  rpc as SorobanRpc,
  scValToNative,
  Address,
  xdr,
  TransactionBuilder,
  TimeoutInfinite,
} from "@stellar/stellar-sdk";
import { useNetworkStore } from "@/store/useNetworkStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Coins,
  Search,
  ArrowRightLeft,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TokenDashboardProps {
  contractId: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export function TokenDashboard({ contractId }: TokenDashboardProps) {
  const { getActiveNetworkConfig } = useNetworkStore();

  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isToken, setIsToken] = useState(false);

  // Balance Checker State
  const [checkAddress, setCheckAddress] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Helper to call a view function (read-only)
  const callView = async (method: string, args: any[] = []) => {
    const network = getActiveNetworkConfig();
    const server = new SorobanRpc.Server(network.rpcUrl);
    const contract = new Contract(contractId);

    // Build a simulation transaction
    // Use a dummy source for reading state
    const source = "GBAB...DUMMY";
    const tx = new TransactionBuilder(
      {
        accountId: () => source,
        sequenceNumber: () => "0",
        incrementSequenceNumber: () => {},
      },
      { fee: "100", networkPassphrase: network.networkPassphrase },
    )
      .addOperation(contract.call(method, ...args))
      .setTimeout(TimeoutInfinite)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return scValToNative(sim.result.retval);
    }
    throw new Error(`Failed to fetch ${method}`);
  };

  useEffect(() => {
    let isMounted = true;

    async function detectToken() {
      try {
        // Try to fetch symbol and decimals to verify if it's a token
        // We run these in parallel
        const [sym, dec, name] = await Promise.all([
          callView("symbol"),
          callView("decimals"),
          callView("name"),
        ]);

        if (isMounted) {
          setMetadata({
            symbol: sym?.toString() || "???",
            decimals: Number(dec),
            name: name?.toString() || "Unknown Token",
          });
          setIsToken(true);
        }
      } catch (e) {
        // If these calls fail, it's likely not a standard SAC token.
        // We just stay silent and don't render the component.
        console.log("Not a standard token contract or simulation failed.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    detectToken();

    return () => {
      isMounted = false;
    };
  }, [contractId, getActiveNetworkConfig]);

  const handleCheckBalance = async () => {
    if (!checkAddress) return;
    setChecking(true);
    setBalance(null);

    try {
      // SAC balance function expects an Address ScVal
      const addressArg = new Address(checkAddress).toScVal();

      const rawBalance = await callView("balance", [addressArg]);

      // Format based on decimals
      const divisor = Math.pow(10, metadata?.decimals || 7);
      const fmt = (Number(rawBalance) / divisor).toLocaleString(undefined, {
        maximumFractionDigits: metadata?.decimals,
      });

      setBalance(`${fmt} ${metadata?.symbol}`);
    } catch (e: any) {
      toast.error("Failed to fetch balance. Check the address.");
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  if (loading)
    return <div className="h-24 w-full bg-muted/20 animate-pulse rounded-xl" />;

  if (!isToken || !metadata) return null;

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Coins className="h-5 w-5" />
              Token Detected: {metadata.name}
            </CardTitle>
            <CardDescription>
              This contract implements the Stellar Asset Contract (SAC)
              interface.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">
              {metadata.symbol}
            </div>
            <div className="text-xs text-muted-foreground">
              {metadata.decimals} Decimals
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Balance Checker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Quick Balance Check
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste User Address (G...)"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                className="bg-background font-mono text-xs"
              />
              <Button
                size="icon"
                onClick={handleCheckBalance}
                disabled={checking || !checkAddress}
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {balance && (
              <div className="mt-2 p-3 bg-background border rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="font-mono font-bold text-sm">{balance}</span>
              </div>
            )}
          </div>

          {/* Quick Actions / Info */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Standard Actions
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 cursor-not-allowed opacity-70"
              >
                <ArrowRightLeft className="h-4 w-4" /> Transfer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 cursor-not-allowed opacity-70"
              >
                <Coins className="h-4 w-4" /> Mint
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              * Use the "Interact" form below to execute these transfers.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
