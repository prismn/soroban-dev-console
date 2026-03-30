import { Horizon } from "@stellar/stellar-sdk";

export interface NormalizedTx {
  id: string;
  hash: string;
  successful: boolean;
  createdAt: string;
  operationCount: number;
  operationSummary: string;
  sourceAccount: string;
  feePaid: number;
}

function summarizeOpType(opType: string): string {
  const map: Record<string, string> = {
    payment: "Payment",
    create_account: "Create Account",
    invoke_host_function: "Contract Call",
    change_trust: "Change Trust",
    manage_sell_offer: "Sell Offer",
    manage_buy_offer: "Buy Offer",
    path_payment_strict_send: "Path Payment",
    path_payment_strict_receive: "Path Payment",
    set_options: "Set Options",
    account_merge: "Account Merge",
    manage_data: "Manage Data",
    bump_sequence: "Bump Sequence",
    create_claimable_balance: "Claimable Balance",
    claim_claimable_balance: "Claim Balance",
    begin_sponsoring_future_reserves: "Begin Sponsoring",
    end_sponsoring_future_reserves: "End Sponsoring",
    revoke_sponsorship: "Revoke Sponsorship",
    clawback: "Clawback",
    set_trust_line_flags: "Set Trust Flags",
    liquidity_pool_deposit: "LP Deposit",
    liquidity_pool_withdraw: "LP Withdraw",
    extend_footprint_ttl: "Extend TTL",
    restore_footprint: "Restore Footprint",
  };
  return map[opType] ?? opType;
}

export function normalizeTx(record: any): NormalizedTx {
  const opType = record.type ?? record.operation_type ?? "unknown";
  return {
    id: record.transaction_hash ?? record.id,
    hash: record.transaction_hash ?? record.id,
    successful: record.transaction_successful ?? record.successful ?? true,
    createdAt: record.created_at,
    operationCount: record.operation_count ?? 1,
    operationSummary: summarizeOpType(opType),
    sourceAccount: record.source_account ?? record.from ?? "",
    feePaid: Number(record.fee_charged ?? 0),
  };
}

export async function fetchRecentTransactions(
  address: string,
  horizonUrl: string,
  cursor?: string,
): Promise<{ records: NormalizedTx[]; nextCursor: string | null }> {
  const server = new Horizon.Server(horizonUrl);

  const builder = server.payments().forAccount(address).limit(20).order("desc");
  if (cursor) builder.cursor(cursor);

  const response = await builder.call();
  const records = response.records.map(normalizeTx);

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = records.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const nextCursor =
    unique.length > 0 ? unique[unique.length - 1].id : null;

  return { records: unique, nextCursor };
}
