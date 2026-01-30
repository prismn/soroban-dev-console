"use client";

import { useState, useEffect } from "react";
import {
  rpc as SorobanRpc,
  xdr,
  Address,
  scValToNative,
  SCVal,
} from "@stellar/stellar-sdk";
import { useNetworkStore } from "@/store/useNetworkStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Trash2, RefreshCw, Database, Search } from "lucide-react";
import { toast } from "sonner";

interface ContractStorageProps {
  contractId: string;
}

interface StorageEntry {
  id: string; // unique internal id
  keyType: "symbol" | "address" | "i32" | "string";
  keyValue: string;
  decodedValue?: string;
  lastModified?: number;
  found: boolean;
}

export function ContractStorage({ contractId }: ContractStorageProps) {
  const { getActiveNetworkConfig } = useNetworkStore();

  // Local state for the "Add Key" form
  const [newKeyType, setNewKeyType] = useState<
    "symbol" | "address" | "i32" | "string"
  >("symbol");
  const [newKeyValue, setNewKeyValue] = useState("");

  // The list of keys we are watching
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper: Convert User Input -> XDR Ledger Key
  const getLedgerKey = (type: string, value: string) => {
    let scValKey: xdr.ScVal;

    try {
      switch (type) {
        case "symbol":
          scValKey = xdr.ScVal.scvSymbol(value);
          break;
        case "string":
          scValKey = xdr.ScVal.scvString(value);
          break;
        case "i32":
          scValKey = xdr.ScVal.scvI32(Number(value));
          break;
        case "address":
          scValKey = new Address(value).toScVal();
          break;
        default:
          throw new Error("Unknown type");
      }

      return xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract: new Address(contractId).toScAddress(),
          key: scValKey,
          durability: xdr.ContractDataDurability.persistent(),
        }),
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const fetchData = async () => {
    if (entries.length === 0) return;
    setLoading(true);

    try {
      const network = getActiveNetworkConfig();
      const server = new SorobanRpc.Server(network.rpcUrl);

      // 1. Prepare Keys
      const validEntries = entries.filter((e) =>
        getLedgerKey(e.keyType, e.keyValue),
      );
      const ledgerKeys = validEntries.map(
        (e) => getLedgerKey(e.keyType, e.keyValue)!,
      );

      if (ledgerKeys.length === 0) return;

      // 2. Fetch from RPC
      const response = await server.getLedgerEntries(...ledgerKeys);

      // 3. Map results back to our entries
      const updatedEntries = entries.map((entry) => {
        // Re-generate the key to find it in the response (base64 match)
        const lKey = getLedgerKey(entry.keyType, entry.keyValue);
        const lKeyB64 = lKey?.toXDR("base64");

        const match = response.entries.find(
          (r) => r.key.toXDR("base64") === lKeyB64,
        );

        if (match) {
          // Decode the value
          const val = match.val; // This is xdr.LedgerEntryData
          // We need to drill down: LedgerEntryData -> ContractData -> val -> scValToNative
          const contractData = val.contractData();
          const rawVal = contractData.val();
          const decoded = JSON.stringify(scValToNative(rawVal), null, 2);

          return {
            ...entry,
            found: true,
            decodedValue: decoded,
            lastModified: match.lastModifiedLedgerSeq,
          };
        } else {
          return { ...entry, found: false, decodedValue: undefined };
        }
      });

      setEntries(updatedEntries);
      toast.success("Storage updated");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch storage");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = () => {
    if (!newKeyValue) return;

    // Add to list (optimistic)
    const newEntry: StorageEntry = {
      id: crypto.randomUUID(),
      keyType: newKeyType,
      keyValue: newKeyValue,
      found: false,
    };

    setEntries([...entries, newEntry]);
    setNewKeyValue("");
    // Trigger fetch immediately would be nice, but effect deps handle it or user clicks refresh
  };

  const handleRemove = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Add Key Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Watch Storage Key</CardTitle>
          <CardDescription>
            Since the RPC cannot list all keys, add specific keys you want to
            inspect (e.g. "Counter", "Admin").
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="w-[140px]">
              <Select
                value={newKeyType}
                onValueChange={(v: any) => setNewKeyType(v)}
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
            <Input
              placeholder="Key Name (e.g. Admin)"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
            />
            <Button onClick={handleAddKey} disabled={!newKeyValue}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Current State</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading || entries.length === 0}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Key Type</TableHead>
                <TableHead className="w-[200px]">Key</TableHead>
                <TableHead>Value (Native)</TableHead>
                <TableHead className="w-[100px] text-right">Modified</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No keys being watched. Add one above to inspect storage.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.keyType}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-xs break-all">
                      {entry.keyValue}
                    </TableCell>
                    <TableCell>
                      {entry.found ? (
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all block max-w-[300px] overflow-hidden text-ellipsis">
                          {entry.decodedValue}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          Not Found / Null
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {entry.lastModified || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => handleRemove(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}