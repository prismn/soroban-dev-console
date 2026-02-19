'use client';

import { useEffect, useState } from 'react';
import {
  Contract,
  TransactionBuilder,
  TimeoutInfinite,
  rpc as SorobanRpc,
} from '@stellar/stellar-sdk';
import {
  Play,
  Send,
  Plus,
  Trash2,
  Loader2,
  Terminal,
  Save,
  Bookmark,
  CheckCircle2,
  XCircle,
  Cpu,
  Database
} from 'lucide-react';
import { useWallet } from '@/store/useWallet';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSavedCallsStore, SavedCall } from '@/store/useSavedCallsStore';
import { ArgType, ContractArg, convertToScVal } from '@/lib/soroban-types';
import { signTransaction } from '@stellar/freighter-api';
import { SavedCallsSheet } from './saved-calls-sheet';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fetchContractSpec } from '@/lib/soroban';
import { useAbiStore } from '@/store/useAbiStore';

interface ContractCallFormProps {
  contractId: string;
}

interface SimResultData {
  status: 'success' | 'error' | 'pending';
  message: string;
  cpuInstructions?: string;
  memoryBytes?: string;
  resultXdr?: string;
  txHash?: string;
}

export function ContractCallForm({ contractId }: ContractCallFormProps) {
  const { isConnected, address } = useWallet();
  const { getActiveNetworkConfig } = useNetworkStore();
  const { setSpec, getSpec } = useAbiStore();
  const spec = getSpec(contractId);

  const [fnName, setFnName] = useState('');
  const [args, setArgs] = useState<ContractArg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { saveCall } = useSavedCallsStore();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const [resultData, setResultData] = useState<SimResultData | null>(null);

  useEffect(() => {
    async function loadSpec() {
      if (!spec) {
        try {
          const network = getActiveNetworkConfig();
          const rawData = await fetchContractSpec(contractId, network.rpcUrl);
          const functionNames = ["mint", "transfer", "burn"];
          setSpec(contractId, { functions: functionNames, rawSpec: "" });
        } catch (e) {
          console.warn("Could not auto-load ABI");
        }
      }
    }
    loadSpec();
  }, [contractId]);

  const addArg = () => {
    setArgs([...args, { id: crypto.randomUUID(), type: 'symbol', value: '' }]);
  };

  const removeArg = (id: string) => {
    setArgs(args.filter((a) => a.id !== id));
  };

  const updateArg = (id: string, field: keyof ContractArg, val: string) => {
    setArgs(args.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
  };

  const handleSimulate = async () => {
    setIsLoading(true);
    setResultData(null);
    try {
      const network = getActiveNetworkConfig();
      const server = new SorobanRpc.Server(network.rpcUrl);

      const contract = new Contract(contractId);
      const scArgs = args.map((a) => convertToScVal(a.type, a.value));

      const operation = contract.call(fnName, ...scArgs);
      const source = address || 'GBAB...DUMMY';
      const account = await server.getAccount(source).catch(() => null);
      const sequence = account ? account.sequenceNumber() : '0';

      const tx = new TransactionBuilder(
        { accountId: () => source, sequenceNumber: () => sequence, incrementSequenceNumber: () => { } },
        { fee: '100', networkPassphrase: network.networkPassphrase },
      )
        .addOperation(operation)
        .setTimeout(TimeoutInfinite)
        .build();

      const sim = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(sim)) {
        const resultVal = sim.result?.retval;
        const xdrString = resultVal ? resultVal.toXDR('base64') : 'No return value';

        setResultData({
          status: 'success',
          message: 'Simulation successful!',
          cpuInstructions: sim.cost?.cpuInsns,
          memoryBytes: sim.cost?.memBytes,
          resultXdr: xdrString
        });
        toast.success(`Simulation Success!`);
      } else {
        setResultData({
          status: 'error',
          message: `Simulation Failed: ${sim.error || 'Unknown error'}`
        });
        toast.error(`Simulation Failed: ${sim.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      console.error(e);
      setResultData({ status: 'error', message: `Error: ${e.message}` });
      toast.error(`Simulation Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!isConnected || !address) {
      toast.error('Connect wallet to send transactions');
      return;
    }

    setIsLoading(true);
    setResultData(null);

    try {
      const network = getActiveNetworkConfig();
      const server = new SorobanRpc.Server(network.rpcUrl);

      const contract = new Contract(contractId);
      const scArgs = args.map((a) => convertToScVal(a.type, a.value));
      const sourceAccount = await server.getAccount(address);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: network.networkPassphrase,
      })
        .addOperation(contract.call(fnName, ...scArgs))
        .setTimeout(TimeoutInfinite)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (!SorobanRpc.Api.isSimulationSuccess(sim)) {
        throw new Error(`Pre-flight simulation failed: ${sim.error}`);
      }

      const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
      const signedResult = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase: network.networkPassphrase,
      });

      const txToSubmit = TransactionBuilder.fromXDR(signedResult.signedTxXdr, network.networkPassphrase);
      const sendRes = await server.sendTransaction(txToSubmit);

      if (sendRes.status !== 'PENDING') {
        throw new Error(`Submission failed: ${sendRes.status}`);
      }

      setResultData({
        status: 'pending',
        message: 'Transaction submitted to network!',
        txHash: sendRes.hash
      });
      toast.success('Transaction sent to network');
    } catch (e: any) {
      console.error(e);
      setResultData({ status: 'error', message: `Submission Error: ${e.message}` });
      toast.error(`Submission Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!saveName.trim()) return;

    saveCall({
      name: saveName,
      contractId,
      fnName,
      args,
      network: getActiveNetworkConfig().id,
    });

    setIsSaveOpen(false);
    setSaveName('');
    toast.success('Interaction saved!');
  };

  const handleLoad = (call: SavedCall) => {
    setFnName(call.fnName);
    const newArgs = call.args.map((a) => ({ ...a, id: crypto.randomUUID() }));
    setArgs(newArgs);
    toast.info(`Loaded: ${call.name}`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interact</CardTitle>
            <CardDescription>Call functions on this contract.</CardDescription>
          </div>
          <div className="flex gap-2">
            <SavedCallsSheet contractId={contractId} onSelect={handleLoad} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Function Name & Save Bookmark Row */}
        <div className="flex items-end gap-2">
          <div className="space-y-2 flex-1">
            <Label>Function Name</Label>
            {spec ? (
              <Select value={fnName} onValueChange={setFnName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a function..." />
                </SelectTrigger>
                <SelectContent>
                  {spec.functions.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g. initialize, increment"
                value={fnName}
                onChange={(e) => setFnName(e.target.value)}
              />
            )}
          </div>

          <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Save Interaction" disabled={!fnName}>
                <Bookmark className="h-4 w-4 text-blue-500" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Interaction</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>Name this bookmark</Label>
                <Input
                  placeholder="e.g. Mint Test Tokens"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleSave}>Save Bookmark</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Arguments Builder */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-muted-foreground">Arguments ({args.length})</Label>
            <Button size="sm" variant="outline" onClick={addArg} className="h-8">
              <Plus className="mr-1 h-3 w-3" /> Add Arg
            </Button>
          </div>

          {args.length === 0 && (
            <div className="text-xs text-center text-muted-foreground py-2 italic opacity-70">
              No arguments added.
            </div>
          )}

          {args.map((arg) => (
            <div key={arg.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="w-full sm:w-[140px]">
                <Select value={arg.type} onValueChange={(v: ArgType) => updateArg(arg.id, 'type', v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="symbol">Symbol</SelectItem>
                    <SelectItem value="address">Address</SelectItem>
                    <SelectItem value="i32">i32 (Int)</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="flex-1 bg-background"
                placeholder="Value..."
                value={arg.value}
                onChange={(e) => updateArg(arg.id, 'value', e.target.value)}
              />
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive shrink-0"
                onClick={() => removeArg(arg.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1 border-2 border-transparent hover:border-primary/20"
            onClick={handleSimulate}
            disabled={isLoading || !fnName}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Terminal className="mr-2 h-4 w-4 text-blue-500" />}
            Simulate Output
          </Button>

          <Button
            className="flex-1 shadow-md"
            onClick={handleSend}
            disabled={isLoading || !fnName || !isConnected}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Transaction
          </Button>
        </div>

        {/* Results Output Box */}
        {resultData && (
          <div className={`mt-6 rounded-lg border p-4 space-y-4 ${resultData.status === 'success' ? 'bg-green-500/5 border-green-500/20' :
            resultData.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
              'bg-blue-500/5 border-blue-500/20'
            }`}>
            <div className="flex items-center gap-2">
              {resultData.status === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                resultData.status === 'error' ? <XCircle className="h-5 w-5 text-red-500" /> :
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
              <h4 className="font-semibold text-sm">
                {resultData.status === 'success' ? 'Simulation Successful' :
                  resultData.status === 'error' ? 'Execution Failed' : 'Transaction Pending'}
              </h4>
            </div>

            {/* Error Message */}
            {resultData.status === 'error' && (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all bg-red-500/10 p-2 rounded">
                {resultData.message}
              </p>
            )}

            {/* Success Gas Data */}
            {resultData.status === 'success' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background rounded-md p-3 border border-border/50 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU Instructions</span>
                    <span className="font-mono text-sm">{resultData.cpuInstructions ? Number(resultData.cpuInstructions).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="bg-background rounded-md p-3 border border-border/50 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Database className="h-3 w-3" /> Memory Bytes</span>
                    <span className="font-mono text-sm">{resultData.memoryBytes ? Number(resultData.memoryBytes).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Result XDR</span>
                  <div className="bg-background break-all rounded-md border p-3 font-mono text-xs text-foreground/80">
                    {resultData.resultXdr}
                  </div>
                </div>
              </>
            )}

            {/* Pending Tx Data */}
            {resultData.status === 'pending' && resultData.txHash && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Hash</span>
                <div className="bg-background break-all rounded-md border p-3 font-mono text-xs text-blue-500">
                  {resultData.txHash}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}