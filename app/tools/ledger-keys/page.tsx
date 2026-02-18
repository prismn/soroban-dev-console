"use client";

import { useState, useEffect } from "react";
import { xdr, Address, StrKey } from "@stellar/stellar-sdk";
import { useNetworkStore } from "@/store/useNetworkStore";
import {
  Copy,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function LedgerKeyCalculatorPage() {
  const { currentNetwork } = useNetworkStore();

  const [contractId, setContractId] = useState("");
  const [keyType, setKeyType] = useState<
    "symbol" | "string" | "address" | "i32"
  >("symbol");
  const [keyValue, setKeyValue] = useState("");

  // Outputs
  const [xdrBase64, setXdrBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate when inputs change
  useEffect(() => {
    calculateKey();
  }, [contractId, keyType, keyValue]);

  const calculateKey = () => {
    setError(null);
    setXdrBase64(null);

    if (!contractId || !keyValue) return;

    try {
      if (!StrKey.isValidContract(contractId)) {
        throw new Error("Invalid Contract ID format");
      }

      let scVal: xdr.ScVal;
      switch (keyType) {
        case "symbol":
          scVal = xdr.ScVal.scvSymbol(keyValue);
          break;
        case "string":
          scVal = xdr.ScVal.scvString(keyValue);
          break;
        case "i32":
          if (isNaN(Number(keyValue)))
            throw new Error("Value must be a number");
          scVal = xdr.ScVal.scvI32(Number(keyValue));
          break;
        case "address":
          scVal = new Address(keyValue).toScVal();
          break;
        default:
          throw new Error("Unsupported key type");
      }


      const ledgerKey = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract: new Address(contractId).toScAddress(),
          key: scVal,
          durability: xdr.ContractDataDurability.persistent(),
        }),
      );

      setXdrBase64(ledgerKey.toXDR("base64"));
    } catch (e: any) {
      if (contractId && keyValue) {
        setError(e.message);
      }
    }
  };

  const copyToClipboard = () => {
    if (xdrBase64) {
      navigator.clipboard.writeText(xdrBase64);
      toast.success("XDR Key copied to clipboard");
    }
  };

  return (
    <div className="container  p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Ledger Key Calculator
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate the exact <code>LedgerKey</code> XDR needed to query contract
          storage or verifying state proofs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contract ID</Label>
                <Input
                  placeholder="C..."
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value.trim())}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-2">
                  <Label>Key Type</Label>
                  <Select
                    value={keyType}
                    onValueChange={(v: any) => setKeyType(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="symbol">Symbol</SelectItem>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="address">Address</SelectItem>
                      <SelectItem value="i32">i32 (Int)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Key Value</Label>
                  <Input
                    placeholder="e.g. Counter, Admin..."
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Note: This tool assumes <code>Persistent</code> storage durability
              by default, which is standard for most contract data.
            </AlertDescription>
          </Alert>
        </div>

        {/* Result Column */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Calculated Key</CardTitle>
              <CardDescription>Base64 XDR Representation</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {error ? (
                <div className="flex-1 flex items-center justify-center text-red-500 text-sm text-center p-4 border rounded-md border-red-200 bg-red-50 dark:bg-red-900/10">
                  {error}
                </div>
              ) : !xdrBase64 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md bg-muted/20">
                  Enter details to calculate...
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  {/* Result Box */}
                  <div className="relative">
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs break-all min-h-[100px] flex items-center">
                      {xdrBase64}
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-semibold">
                      External Tools
                    </Label>

                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      asChild
                    >
                      <a
                        href={`https://stellar.expert/explorer/${currentNetwork}/contract/${contractId}/storage`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          View Storage on Stellar.Expert
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-50" />
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      asChild
                    >
                      <a href="/tools/xdr" target="_blank">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Verify in XDR Decoder
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-50" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
