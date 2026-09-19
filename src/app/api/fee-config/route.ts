import { NextResponse } from "next/server";
import { loadFeeConfig } from "@/lib/config";
import type { PublicFeeConfig } from "@/lib/types";

/**
 * Returns the public (non-secret) platform-fee/testnet configuration the
 * client needs to quote and collect the fee: token address, recipient
 * address, fee bps, and which testnet chain to use. Never returns
 * TESTNET_RPC_URL or anything else that could carry a provider API key —
 * the client sends its fee transaction through the user's own wallet
 * provider, not through our RPC.
 *
 * If the server-side config fails its safety checks (see `lib/config.ts`),
 * this returns 503 and the client must refuse to proceed with any fee
 * transaction.
 */
export async function GET() {
  const status = loadFeeConfig();
  if (!status.ok || !status.config) {
    return NextResponse.json(
      { error: status.error ?? "Platform-fee configuration is invalid." },
      { status: 503 }
    );
  }

  const c = status.config;
  const publicConfig: PublicFeeConfig = {
    feeBps: c.feeBps,
    tokenAddress: c.tokenAddress,
    tokenSymbol: c.tokenSymbol,
    tokenDecimals: c.tokenDecimals,
    recipientAddress: c.recipientAddress,
    chainIdHex: "0x" + c.chainId.toString(16),
    chainIdDecimal: c.chainId,
    chainName: c.chainName,
    blockExplorerBase: c.blockExplorerBase,
    isTestnet: true,
  };

  return NextResponse.json(publicConfig);
}
