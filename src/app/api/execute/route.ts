import { NextResponse } from "next/server";
import { mockExecute } from "@/lib/execution";

/**
 * Stands in for Robinhood's Trading MCP / execution API. In this MVP the
 * guardrail proxy (/api/trade) is the only caller — it invokes execution
 * directly after a request clears every risk check. This route is exposed
 * separately so the architecture (proxy -> execution) is visible and
 * testable on its own, exactly where a real Robinhood integration would
 * be wired in.
 */
export async function POST() {
  const result = mockExecute();
  return NextResponse.json(result);
}
