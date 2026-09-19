import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getPortfolio());
}
