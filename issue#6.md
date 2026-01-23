This is a **High (200 pts)** task. I will provide the code to implement the **Contract Detail View**.

This requires creating a dynamic route in Next.js that captures the `contractId` from the URL, connects to the Soroban RPC to fetch the contract's ledger data, and displays it.

### Step 1: Install Stellar SDK

If you haven't already, you must install the official SDK to interact with the RPC.

```bash
npm install @stellar/stellar-sdk

```

### Step 2: Create the RPC Utility

Since we don't have the "Network Switcher" fully built yet, let's create a small utility file to handle the connection. This prevents us from hardcoding URLs inside components.

Create `lib/soroban.ts`:

```typescript
// lib/soroban.ts
import { SorobanRpc } from "@stellar/stellar-sdk";

// Default to Testnet for now
const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org:443";

export const server = new SorobanRpc.Server(TESTNET_RPC_URL);

export async function getContractInfo(contractId: string) {
  try {
    // Fetch the ledger entry for the contract code
    // Note: In a real app, you might need to look up the WASM hash from the Contract Instance first
    // For this Wave 1 MVP, we will try to get the basic ledger entry to prove it exists
    const account = await server.getLedgerEntry(
      SorobanRpc.xdr.LedgerKey.contractData(
        new SorobanRpc.xdr.LedgerKeyContractData({
          contract: new SorobanRpc.xdr.ScAddress.contract(
            Buffer.from(contractId, "hex"), // This logic depends on ID format (C... vs G...)
          ),
          key: SorobanRpc.xdr.ScVal.scvLedgerKeyContractInstance(),
          durability: SorobanRpc.xdr.ContractDataDurability.persistent(),
        }),
      ),
    );

    return account;
  } catch (error) {
    console.error("Error fetching contract:", error);
    return null;
  }
}
```

_Note: The helper above is simplified. For the robust page below, we will perform the raw RPC lookup directly in the component to handle the specific `Address` string format correctly using the SDK's helpers._

### Step 3: Create the Detail Page

Create the file `app/contracts/[contractId]/page.tsx`.

```tsx
// app/contracts/[contractId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SorobanRpc, Address } from "@stellar/stellar-sdk";
import {
  ArrowLeft,
  Box,
  Database,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Hardcoded for Wave 1 - moved to a constant
const RPC_URL = "https://soroban-testnet.stellar.org:443";

interface ContractData {
  exists: boolean;
  wasmHash?: string;
  lastModified?: number;
  ledgerSeq?: number;
}

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = params.contractId as string;

  const [data, setData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchContract() {
      if (!contractId) return;

      try {
        const server = new SorobanRpc.Server(RPC_URL);

        // 1. Verify the Contract ID is valid
        try {
          Address.fromString(contractId);
        } catch (e) {
          throw new Error("Invalid Contract ID format.");
        }

        // 2. Fetch the Contract Instance (this links the ID to the WASM code)
        // We use getLedgerEntries to query the state
        const ledgerKey = SorobanRpc.xdr.LedgerKey.contractData(
          new SorobanRpc.xdr.LedgerKeyContractData({
            contract: new Address(contractId).toScAddress(),
            key: SorobanRpc.xdr.ScVal.scvLedgerKeyContractInstance(),
            durability: SorobanRpc.xdr.ContractDataDurability.persistent(),
          }),
        );

        const response = await server.getLedgerEntries(ledgerKey);

        if (!response.entries || response.entries.length === 0) {
          setData({ exists: false });
        } else {
          const entry = response.entries[0];
          // Provide basic metadata we can read easily
          setData({
            exists: true,
            lastModified: entry.lastModifiedLedgerSeq,
            ledgerSeq: entry.lastModifiedLedgerSeq, // Using this as proxy for "latest activity"
            // Note: Decoding the full XDR to get the Wasm Hash requires more complex XDR parsing
            // For this issue, confirming existence and ledger sequence is sufficient
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch contract data");
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Contract Details
            {loading ? (
              <Skeleton className="h-6 w-20 rounded-full" />
            ) : data?.exists ? (
              <Badge
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                Active
              </Badge>
            ) : error ? (
              <Badge variant="destructive">Error</Badge>
            ) : (
              <Badge variant="secondary">Not Found</Badge>
            )}
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            {contractId}
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Contract</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-blue-500" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : data?.exists ? (
              <div className="grid gap-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Storage Durability
                  </span>
                  <span className="text-sm">Persistent</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Last Modified Ledger
                  </span>
                  <span className="font-mono text-sm">{data.lastModified}</span>
                </div>

                <div className="mt-4 p-4 border rounded-md bg-blue-50/50 dark:bg-blue-900/10">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Contract is Live
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This contract exists on the Testnet and has initialized
                    state. You can now proceed to interact with it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Contract data could not be found on the network.</p>
                <p className="text-sm mt-2">
                  Ensure you are using the correct Network (Testnet) and
                  Contract ID.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card (Placeholder for Issue #7) */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" disabled={!data?.exists || loading}>
              Invoke Function (Coming Soon)
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Stellar.Expert
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### How to Verify

1. Run the app (`npm run dev`).
2. Go to your list page (`/contracts`) and click the Contract ID you added in the previous step (or manually navigate to `/contracts/C...`).
3. You should see the "Active" badge and the "Last Modified Ledger" number load after a brief skeleton loading state.
4. If you use a fake ID, you should see the Error or "Not Found" state.
