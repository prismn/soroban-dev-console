"use client";

import { useEffect, useState } from "react";
import { rpc as SorobanRpc, Address, xdr, StrKey } from "@stellar/stellar-sdk";
import {
  ArrowLeft,
  Box,
  Database,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

import { ContractStorage } from "@/components/contract-storage";
import { ContractCallForm } from "@/components/contract-call-form";
import { ContractEvents } from "@/components/contract-events";
import { TokenDashboard } from "@/components/token-dashboard";
import { ContractUpgradeModal } from "@/components/contract-upgrade-modal";
import { useNetworkStore } from "@/store/useNetworkStore";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "next/navigation";

interface ContractData {
  exists: boolean;
  wasmHash?: string;
  lastModified?: number;
  ledgerSeq?: number;
}

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const { getActiveNetworkConfig } = useNetworkStore();

  const [data, setData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchContract() {
      if (!contractId) return;

      try {
        const network = getActiveNetworkConfig();
        const server = new SorobanRpc.Server(network.rpcUrl);
        const cleanId = decodeURIComponent(contractId).trim();
        if (!StrKey.isValidContract(cleanId)) {
          throw new Error("Invalid Contract ID format. Must be a 56-character string starting with C.");
        }

        const ledgerKey = xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: new Address(cleanId).toScAddress(),
            key: xdr.ScVal.scvLedgerKeyContractInstance(),
            durability: xdr.ContractDataDurability.persistent(),
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
        console.error("Contract Fetch Error:", err);
        setError(err.message || "Failed to fetch contract data");
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId, getActiveNetworkConfig]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          <ContractUpgradeModal contractId={contractId as string} />

          <Button variant="outline" asChild>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Explorer
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Contract</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview & Interaction</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="code" disabled>
            Code (Coming Soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Token Dashboard - appears only for SAC contracts */}
          <TokenDashboard contractId={contractId} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Contract Overview Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Contract Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </>
                ) : data?.exists ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">Active</span>
                    </div>
                    {data.ledgerSeq && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-muted-foreground">Last Modified:</span>
                        <span className="font-mono text-xs">
                          Ledger #{data.ledgerSeq}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Contract not found on network
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Interaction Form */}
            <div className="md:col-span-2">
              <ContractCallForm contractId={contractId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="storage">
          <ContractStorage contractId={contractId} />
        </TabsContent>

        <TabsContent value="events">
          <ContractEvents contractId={contractId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}