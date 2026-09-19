import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPolicy, setPolicy } from "@/lib/store";

const policySchema = z.object({
  dailySpendCap: z.coerce.number().positive(),
  maxSingleTrade: z.coerce.number().positive(),
  maxPositionValue: z.coerce.number().positive(),
  maxConcentration: z.coerce.number().min(0.01).max(1),
  dailyLossLimit: z.coerce.number().positive(),
});

export async function GET() {
  return NextResponse.json(getPolicy());
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = policySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid policy." },
      { status: 400 }
    );
  }

  if (parsed.data.maxSingleTrade > parsed.data.dailySpendCap) {
    return NextResponse.json(
      {
        error:
          "Maximum single trade can't be greater than the daily spend cap.",
      },
      { status: 400 }
    );
  }
  if (parsed.data.maxPositionValue > parsed.data.dailySpendCap * 10) {
    return NextResponse.json(
      { error: "Maximum position looks unreasonably high relative to daily spend." },
      { status: 400 }
    );
  }

  setPolicy(parsed.data);
  return NextResponse.json(getPolicy());
}
