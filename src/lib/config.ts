/**
 * Server-side configuration for the platform fee / testnet fee-collection
 * feature. Everything here is read from environment variables so nothing is
 * hardcoded — see `.env.example` for the full list.
 *
 * IMPORTANT: this module only ever holds *public* configuration (a token
 * address, a recipient address, a chain id, a fee in basis points). It never
 * reads or exposes a private key, signing secret, or RPC API credential to
 * the client — the fee transaction itself is signed by the user's own
 * connected wallet, not by this server.
 */

// Chain ids of well-known mainnets. If TESTNET_CHAIN_ID resolves to one of
// these, the app refuses to quote or accept a fee transaction — this is the
// server-side guard against ever accidentally running against a real network.
const KNOWN_MAINNET_CHAIN_IDS = new Set<number>([
  1, // Ethereum mainnet
  10, // Optimism
  56, // BNB Smart Chain
  100, // Gnosis Chain
  137, // Polygon
  250, // Fantom
  8453, // Base
  42161, // Arbitrum One
  43114, // Avalanche C-Chain
  59144, // Linea
  81457, // Blast
  534352, // Scroll
]);

const KNOWN_TESTNETS: Record<number, { name: string; explorer: string }> = {
  11155111: { name: "Sepolia", explorer: "https://sepolia.etherscan.io" },
  80002: { name: "Polygon Amoy", explorer: "https://amoy.polygonscan.com" },
  84532: { name: "Base Sepolia", explorer: "https://sepolia.basescan.org" },
  421614: { name: "Arbitrum Sepolia", explorer: "https://sepolia.arbiscan.io" },
  11155420: { name: "OP Sepolia", explorer: "https://sepolia-optimism.etherscan.io" },
};

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : fallback;
}

export interface FeeConfig {
  feeBps: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  recipientAddress: string;
  rpcUrl: string;
  chainId: number;
  chainName: string;
  blockExplorerBase: string | null;
}

export interface FeeConfigStatus {
  ok: boolean;
  /** Populated when ok is false — the exact reason nothing was returned. */
  error?: string;
  config?: FeeConfig;
}

/**
 * Reads and validates the fee/testnet configuration. This is the single
 * choke point every route funnels through before it will quote a fee or
 * accept a fee transaction — if it returns ok: false, callers MUST refuse to
 * proceed rather than fall back to a default.
 */
export function loadFeeConfig(): FeeConfigStatus {
  const chainId = toInt(process.env.TESTNET_CHAIN_ID, 11155111);

  // Hard safety guard: never let a mainnet chain id through, regardless of
  // what else is configured.
  if (KNOWN_MAINNET_CHAIN_IDS.has(chainId)) {
    return {
      ok: false,
      error:
        `TESTNET_CHAIN_ID (${chainId}) resolves to a known mainnet chain. ` +
        `Refusing to configure the platform-fee flow against a mainnet. ` +
        `Set TESTNET_CHAIN_ID to a testnet chain id (e.g. 11155111 for Sepolia).`,
    };
  }

  const knownTestnet = KNOWN_TESTNETS[chainId];
  const chainName = process.env.TESTNET_CHAIN_NAME?.trim() || knownTestnet?.name || `Chain ${chainId}`;
  const blockExplorerBase =
    process.env.TESTNET_BLOCK_EXPLORER_BASE?.trim() || knownTestnet?.explorer || null;

  const feeBps = toInt(process.env.PLATFORM_FEE_BPS, 50);
  if (feeBps < 0 || feeBps > 10_000) {
    return { ok: false, error: `PLATFORM_FEE_BPS (${feeBps}) must be between 0 and 10000.` };
  }

  const tokenAddress = process.env.PLATFORM_FEE_TOKEN_ADDRESS?.trim() ?? "";
  const recipientAddress = process.env.PLATFORM_FEE_RECIPIENT_ADDRESS?.trim() ?? "";
  const rpcUrl = process.env.TESTNET_RPC_URL?.trim() ?? "";

  if (!isAddressLike(tokenAddress)) {
    return {
      ok: false,
      error: "PLATFORM_FEE_TOKEN_ADDRESS is not set to a valid-looking testnet ERC-20 address.",
    };
  }
  if (!isAddressLike(recipientAddress)) {
    return {
      ok: false,
      error: "PLATFORM_FEE_RECIPIENT_ADDRESS is not set to a valid-looking address.",
    };
  }

  return {
    ok: true,
    config: {
      feeBps,
      tokenAddress,
      tokenSymbol: process.env.PLATFORM_FEE_TOKEN_SYMBOL?.trim() || "TEST",
      tokenDecimals: toInt(process.env.PLATFORM_FEE_TOKEN_DECIMALS, 18),
      recipientAddress,
      rpcUrl,
      chainId,
      chainName,
      blockExplorerBase,
    },
  };
}

function isAddressLike(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}
