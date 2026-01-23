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
