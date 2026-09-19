import { describe, expect, it } from "vitest";
import { computeFee, formatBps } from "../fees";

describe("computeFee", () => {
  it("computes a 0.50% fee correctly", () => {
    const quote = computeFee(1000, 50);
    expect(quote.feeAmount).toBe(5);
    expect(quote.total).toBe(1005);
    expect(quote.netProceeds).toBe(995);
  });

  it("rounds to the nearest cent", () => {
    const quote = computeFee(33.33, 75); // 0.75%
    expect(quote.feeAmount).toBe(0.25);
  });

  it("handles a zero fee", () => {
    const quote = computeFee(500, 0);
    expect(quote.feeAmount).toBe(0);
    expect(quote.total).toBe(500);
  });

  it("formats basis points as a percentage", () => {
    expect(formatBps(50)).toBe("0.50%");
    expect(formatBps(500)).toBe("5.00%");
  });
});
