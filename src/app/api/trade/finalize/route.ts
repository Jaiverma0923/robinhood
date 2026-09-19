import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mockExecute } from "@/lib/execution";
import { loadFeeConfig } from "@/lib/config";
import { computeFee } from "@/lib/fees";
import { toBaseUnits } from "@/lib/erc20";
import { verifyFeeTransfer } from "@/lib/rpc";
import { finalizeTrade, getActivityEntry } from "@/lib/store";

const finalizeSchema = z.object({
  activityId: z.string().min(1),
  feeTxHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "feeTxHash must be a transaction hash")
    .optional(),
});

/**
 * Finalizes a trade that was previously recorded as pending by
 * `POST /api/trade` with `deferExecution: true`. Called by the simulator
 * once the wallet has confirmed the platform-fee transfer. Only ever
 * executes the trade — applying the same mock execution layer everything
 * else uses — after independently checking the fee transaction against the
 * configured testnet RPC when one is configured.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = finalizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid finalize request." },
      { status: 400 }
    );
  }

  const { activityId, feeTxHash } = parsed.data;
  const entry = getActivityEntry(activityId);

  if (!entry) {
    return NextResponse.json({ error: "No pending trade found for this activity id." }, { status: 404 });
  }
  if (entry.decision !== "APPROVED") {
    return NextResponse.json({ error: "Only an approved trade can be finalized." }, { status: 400 });
  }
  if (entry.execution.status === "executed") {
    return NextResponse.json({ error: "This trade has already been executed." }, { status: 409 });
  }

  const status = loadFeeConfig();
  if (!status.ok || !status.config) {
    return NextResponse.json(
      { error: status.error ?? "Platform-fee configuration is invalid; refusing to finalize." },
      { status: 503 }
    );
  }
  const config = status.config;
  const quote = computeFee(entry.tradeValue, config.feeBps);

  if (feeTxHash) {
    const verification = await verifyFeeTransfer({
      rpcUrl: config.rpcUrl,
      txHash: feeTxHash,
      tokenAddress: config.tokenAddress,
      recipientAddress: config.recipientAddress,
      minAmountBaseUnits: toBaseUnits(quote.feeAmount, config.tokenDecimals),
    });
    // Only hard-fail when the server actually has an RPC configured and used
    // it to check — if no server RPC is configured we fall back to trusting
    // the client's report that its own wallet provider confirmed the
    // transaction, since that's still the user's own wallet attesting to it.
    if (!verification.ok && verification.reason !== "no_server_rpc_configured") {
      return NextResponse.json(
        { error: `Fee verification failed: ${verification.reason}` },
        { status: 402 }
      );
    }
  }

  const execution = mockExecute();
  const updated = finalizeTrade(activityId, {
    execution,
    fee: {
      bps: config.feeBps,
      amount: quote.feeAmount,
      token: config.tokenAddress,
      recipient: config.recipientAddress,
      txHash: feeTxHash ?? null,
    },
  });

  if (!updated) {
    return NextResponse.json({ error: "Could not finalize this trade." }, { status: 500 });
  }

  return NextResponse.json({ activity: updated, execution });
}
