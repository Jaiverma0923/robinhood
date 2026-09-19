import type { ExecutionResult } from "./types";

/**
 * Mock execution layer standing in for Robinhood's Trading MCP / execution
 * API. In production this is the only function that would be replaced —
 * everything upstream (guardrail evaluation, logging) stays the same.
 */
export function mockExecute(): ExecutionResult {
  const orderId = `RH-MOCK-${Math.floor(10000 + Math.random() * 89999)}`;
  return { status: "executed", orderId };
}
