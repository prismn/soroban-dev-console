"use client";

import { useState } from "react";
import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  TimeoutInfinite,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { useWallet } from "@/store/useWallet";
import { useNetworkStore } from "@/store/useNetworkStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface ContractUpgradeModalProps {
  contractId: string;
}

export function ContractUpgradeModal({
  contractId,
}: ContractUpgradeModalProps) {
  const { isConnected, address } = useWallet();
  const { getActiveNetworkConfig } = useNetworkStore();

  const [isOpen, setIsOpen] = useState(false);
  const [funcName, setFuncName] = useState("upgrade");
  const [wasmHash, setWasmHash] = useState("");

  const [status, setStatus] = useState<
    "idle" | "simulating" | "ready" | "submitting"
  >("idle");
  const [error, setError] = useState("");
  const [simDetails, setSimDetails] = useState<{
    auth: string[];
    cpu: string;
  } | null>(null);

  const resetState = () => {
    setStatus("idle");
    setError("");
    setSimDetails(null);
  };

  const handleSimulate = async () => {
    if (!wasmHash || !funcName) return;
    setStatus("simulating");
    setError("");

    try {
      const network = getActiveNetworkConfig();
      const server = new SorobanRpc.Server(network.rpcUrl);
      const contract = new Contract(contractId);

      // Convert Hex Hash to Buffer/Bytes
      const wasmBuffer = Buffer.from(wasmHash, "hex");
      if (wasmBuffer.length !== 32)
        throw new Error("Invalid WASM Hash (must be 32 bytes hex)");

      // Prepare Transaction
      const source = address || "GBAB...DUMMY";
      const tx = new TransactionBuilder(
        {
          accountId: () => source,
          sequenceNumber: () => "0",
          incrementSequenceNumber: () => {},
        },
        { fee: "100", networkPassphrase: network.networkPassphrase },
      )
        .addOperation(contract.call(funcName, xdr.ScVal.scvBytes(wasmBuffer)))
        .setTimeout(TimeoutInfinite)
        .build();

      const sim = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(sim)) {
        setSimDetails({
          auth: sim.result?.auth.map((a) => "Authorized") || [], // Simplified auth display
          cpu: sim.cost?.cpuInsns || "0",
        });
        setStatus("ready");
      } else {
        throw new Error(sim.error || "Simulation failed (Unauthorized?)");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setStatus("idle");
    }
  };

  const handleUpgrade = async () => {
    if (!isConnected || status !== "ready") return;
    setStatus("submitting");

    try {
      const network = getActiveNetworkConfig();
      const server = new SorobanRpc.Server(network.rpcUrl);
      const contract = new Contract(contractId);
      const wasmBuffer = Buffer.from(wasmHash, "hex");
      const sourceAccount = await server.getAccount(address!);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: "10000", // Higher fee for upgrade
        networkPassphrase: network.networkPassphrase,
      })
        .addOperation(contract.call(funcName, xdr.ScVal.scvBytes(wasmBuffer)))
        .setTimeout(TimeoutInfinite)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase: network.networkPassphrase,
      });

      const res = await server.sendTransaction(
        new TransactionBuilder.fromXDR(
          signedXdr.signedTxXdr,
          network.networkPassphrase,
        ),
      );

      if (res.status !== "PENDING")
        throw new Error(`Submission failed: ${res.status}`);

      toast.success("Upgrade transaction sent!");
      setIsOpen(false);
      resetState();
    } catch (e: any) {
      console.error(e);
      toast.error(`Upgrade Failed: ${e.message}`);
      setStatus("ready");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-orange-200 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
        >
          <Upload className="h-4 w-4" />
          Upgrade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            Upgrade Contract
          </DialogTitle>
          <DialogDescription>
            Replace the code of this contract instance with a new WASM file.
            <strong> This action is irreversible.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New WASM Hash</Label>
            <Input
              placeholder="e.g. a1b2... (64 hex chars)"
              value={wasmHash}
              onChange={(e) => {
                setWasmHash(e.target.value.trim());
                resetState();
              }}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Upgrade Function Name</Label>
            <Input
              value={funcName}
              onChange={(e) => {
                setFuncName(e.target.value);
                resetState();
              }}
              placeholder="upgrade"
            />
            <p className="text-[10px] text-muted-foreground">
              The function in your contract that calls{" "}
              <code>env.update_current_contract_wasm</code>.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Simulation Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "ready" && simDetails && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-sm mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Ready to Upgrade
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  CPU Cost: {parseInt(simDetails.cpu).toLocaleString()}{" "}
                  instructions
                </p>
                <p>
                  Auth Required:{" "}
                  {simDetails.auth.length > 0 ? "Yes (Admin)" : "None detected"}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "idle" || status === "simulating" ? (
            <Button
              onClick={handleSimulate}
              disabled={!wasmHash || status === "simulating"}
              className="w-full"
            >
              {status === "simulating" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simulate Upgrade
            </Button>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={status === "submitting" || !isConnected}
              variant="destructive"
              className="w-full"
            >
              {status === "submitting" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Upgrade
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
