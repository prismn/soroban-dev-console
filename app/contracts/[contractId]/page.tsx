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
import { ContractCallForm } from "@/components/contract-call-form";

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

        try {
          Address.fromString(contractId);
        } catch {
          throw new Error("Invalid Contract ID format.");
        }

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
          setData({
            exists: true,
            lastModified: entry.lastModifiedLedgerSeq,
            ledgerSeq: entry.lastModifiedLedgerSeq,
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
              <Badge className="bg-green-600 hover:bg-green-700">
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Contract</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-blue-500" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-4 w-full" />
            ) : data?.exists ? (
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4" /> Storage
                  </span>
                  <span className="text-sm">Persistent</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" /> Last Modified
                  </span>
                  <span className="font-mono text-sm">{data.lastModified}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Contract not found on the network.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contract Interaction Form */}
        <div className="md:col-span-1">
          <ContractCallForm contractId={contractId} />
        </div>
      </div>
    </div>
  );
}
