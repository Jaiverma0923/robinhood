"use client";

/**
 * Client-side wallet abstraction. Everything here talks to the user's own
 * injected wallet provider (e.g. MetaMask, `window.ethereum`) via standard
 * EIP-1193 JSON-RPC requests. The server never sees, holds, or signs a
 * private key — the wallet the user already controls signs the platform-fee
 * transfer, and only that.
 *
 * This is the one wallet/blockchain abstraction in the app; anything that
 * needs to read a balance or send the fee transfer should import from here
 * rather than talking to `window.ethereum` directly.
 */

import { decodeUint256, encodeBalanceOf, encodeTransfer } from "./erc20";

export class WalletError extends Error {
  code:
    | "no_wallet"
    | "user_rejected"
    | "wrong_chain"
    | "rpc_error"
    | "tx_failed";
  constructor(code: WalletError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "WalletError";
  }
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getProvider(): Eip1193Provider {
  const eth = (globalThis as { ethereum?: Eip1193Provider }).ethereum;
  if (!eth) {
    throw new WalletError(
      "no_wallet",
      "No browser wallet found. Install a wallet extension like MetaMask to pay the testnet platform fee."
    );
  }
  return eth;
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && Boolean((window as { ethereum?: unknown }).ethereum);
}

/** Requests account access and returns the connected address. */
export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  try {
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts?.[0]) throw new WalletError("user_rejected", "No account was returned by the wallet.");
    return accounts[0];
  } catch (err) {
    throw normalizeProviderError(err, "Connection to the wallet was rejected.");
  }
}

/** Returns the wallet's currently connected chain id, as a decimal number. */
export async function getChainId(): Promise<number> {
  const provider = getProvider();
  const hex = (await provider.request({ method: "eth_chainId" })) as string;
  return parseInt(hex, 16);
}

/**
 * Asks the wallet to switch to the given testnet chain. If the wallet
 * doesn't know the chain, this only *asks* to switch (never silently adds a
 * network) so the user always sees exactly what they're approving.
 */
export async function ensureChain(chainIdDecimal: number): Promise<void> {
  const provider = getProvider();
  const chainIdHex = "0x" + chainIdDecimal.toString(16);
  const current = await getChainId();
  if (current === chainIdDecimal) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (err) {
    throw normalizeProviderError(
      err,
      `Please switch your wallet to the configured testnet (chain id ${chainIdDecimal}) to continue.`
    );
  }
}

/** Reads an ERC-20 balance for `owner`, in base units. */
export async function getErc20Balance(tokenAddress: string, owner: string): Promise<bigint> {
  const provider = getProvider();
  try {
    const result = (await provider.request({
      method: "eth_call",
      params: [{ to: tokenAddress, data: encodeBalanceOf(owner) }, "latest"],
    })) as string;
    return decodeUint256(result);
  } catch (err) {
    throw normalizeProviderError(err, "Couldn't read the fee-token balance from your wallet's network.");
  }
}

/**
 * Sends the platform-fee ERC-20 transfer from the connected wallet. Returns
 * the transaction hash immediately after the user approves it in their
 * wallet — call `waitForReceipt` to know whether it actually confirmed.
 */
export async function sendErc20Transfer(
  tokenAddress: string,
  from: string,
  to: string,
  amountBaseUnits: bigint
): Promise<string> {
  const provider = getProvider();
  try {
    const txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: tokenAddress,
          data: encodeTransfer(to, amountBaseUnits),
        },
      ],
    })) as string;
    return txHash;
  } catch (err) {
    throw normalizeProviderError(err, "The fee transaction was rejected in your wallet.");
  }
}

export interface TxReceiptOutcome {
  status: "success" | "reverted";
  blockNumber: string | null;
}

/** Polls the wallet's provider for a transaction receipt until it lands. */
export async function waitForReceipt(
  txHash: string,
  { timeoutMs = 120_000, intervalMs = 2500 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<TxReceiptOutcome> {
  const provider = getProvider();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as { status?: string; blockNumber?: string } | null;
    if (receipt) {
      return {
        status: receipt.status === "0x1" ? "success" : "reverted",
        blockNumber: receipt.blockNumber ?? null,
      };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new WalletError("rpc_error", "Timed out waiting for the fee transaction to confirm.");
}

function normalizeProviderError(err: unknown, fallback: string): WalletError {
  if (err instanceof WalletError) return err;
  const code = (err as { code?: number })?.code;
  // EIP-1193 user-rejected-request code.
  if (code === 4001) {
    return new WalletError("user_rejected", "You rejected the request in your wallet.");
  }
  const message = err instanceof Error ? err.message : fallback;
  return new WalletError("rpc_error", message || fallback);
}
