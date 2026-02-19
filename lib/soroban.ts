// lib/soroban.ts
import { rpc as SorobanRpc, xdr, Address } from "@stellar/stellar-sdk";

// Default to Testnet for now
const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org:443";

export const server = new SorobanRpc.Server(TESTNET_RPC_URL);

export async function getContractInfo(contractId: string) {
  try {
    // Fetch the ledger entry for the contract code
    // Note: In a real app, you might need to look up the WASM hash from the Contract Instance first
    // For this Wave 1 MVP, we will try to get the basic ledger entry to prove it exists
    const account = await server.getLedgerEntry(
      xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract: new Address(contractId).toScAddress(),
          key: xdr.ScVal.scvLedgerKeyContractInstance(),
          durability: xdr.ContractDataDurability.persistent(),
        }),
      ),
    );

    return account;
  } catch (error) {
    console.error("Error fetching contract:", error);
    return null;
  }
}

export async function fetchContractSpec(contractId: string, rpcUrl: string) {
  const server = new SorobanRpc.Server(rpcUrl);

  try {
    // 1. Get the Contract Instance entry
    const instanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(contractId).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );

    const instanceEntry = await server.getLedgerEntry(instanceKey);
    if (
      !instanceEntry ||
      !instanceEntry.val.contractData().val().instance().executable().wasmHash()
    ) {
      throw new Error("No WASM hash found for this contract instance.");
    }

    // 2. Get the WASM hash to find the code entry
    const wasmHash = instanceEntry.val
      .contractData()
      .val()
      .instance()
      .executable()
      .wasmHash();

    // 3. Fetch the Contract Code entry which contains the interface spec
    const codeKey = xdr.LedgerKey.contractCode(
      new xdr.LedgerKeyContractCode({ hash: wasmHash }),
    );

    const codeEntry = await server.getLedgerEntry(codeKey);
    // Note: The spec is stored in the 'metadata' or 'body' depending on the Soroban version
    // For Protocol 20+, we look for the ScSpecEntry array
    return codeEntry;
  } catch (error) {
    console.error("Failed to fetch contract spec:", error);
    throw error;
  }
}
