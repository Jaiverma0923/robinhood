/**
 * Minimal server-side JSON-RPC client, used for exactly one thing: after the
 * client reports it sent the platform-fee ERC-20 transfer, the server
 * independently checks the transaction against the configured testnet RPC
 * before crediting the trade as executed. This means a compromised or buggy
 * client can't just claim success — the server verifies the transfer really
 * happened, really paid the configured recipient, and really used the
 * configured fee token.
 *
 * This module never sends a transaction and never touches a private key —
 * it only ever calls read-only RPC methods.
 */

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

interface JsonRpcReceipt {
  status?: string;
  to?: string;
  logs?: { address: string; topics: string[]; data: string }[];
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC request failed with status ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC call returned an error.");
  return json.result as T;
}

export interface FeeVerificationParams {
  rpcUrl: string;
  txHash: string;
  tokenAddress: string;
  recipientAddress: string;
  /** Minimum fee amount required, in base units. */
  minAmountBaseUnits: bigint;
}

export interface FeeVerificationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Verifies, against the RPC directly, that `txHash` is a confirmed ERC-20
 * Transfer of at least `minAmountBaseUnits` of `tokenAddress` to
 * `recipientAddress`.
 */
export async function verifyFeeTransfer(params: FeeVerificationParams): Promise<FeeVerificationResult> {
  const { rpcUrl, txHash, tokenAddress, recipientAddress, minAmountBaseUnits } = params;
  if (!rpcUrl) {
    // No server RPC configured — we can't independently verify. Callers
    // decide how strict to be; the fee flow still required the user's own
    // wallet to confirm the transaction and the client to observe a
    // successful receipt via the wallet's provider.
    return { ok: false, reason: "no_server_rpc_configured" };
  }

  let receipt: JsonRpcReceipt | null;
  try {
    receipt = await rpcCall<JsonRpcReceipt | null>(rpcUrl, "eth_getTransactionReceipt", [txHash]);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "rpc_error" };
  }

  if (!receipt) return { ok: false, reason: "Transaction not found (not yet mined?)." };
  if (receipt.status !== "0x1") return { ok: false, reason: "Transaction reverted." };

  const matchingLog = (receipt.logs ?? []).find((log) => {
    if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) return false;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) return false;
    const toTopic = log.topics[2];
    if (!toTopic) return false;
    const toAddress = "0x" + toTopic.slice(-40);
    return toAddress.toLowerCase() === recipientAddress.toLowerCase();
  });

  if (!matchingLog) {
    return { ok: false, reason: "No matching ERC-20 transfer to the fee recipient was found in this transaction." };
  }

  const transferredAmount = BigInt(matchingLog.data);
  if (transferredAmount < minAmountBaseUnits) {
    return { ok: false, reason: "Transferred amount is less than the required fee." };
  }

  return { ok: true };
}
