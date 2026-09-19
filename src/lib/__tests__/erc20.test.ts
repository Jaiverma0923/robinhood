import { describe, expect, it } from "vitest";
import { encodeTransfer, encodeBalanceOf, decodeUint256, toBaseUnits, fromBaseUnits, isValidAddress } from "../erc20";

const ADDR = "0x1234567890123456789012345678901234567890";

describe("erc20 encoding", () => {
  it("validates addresses", () => {
    expect(isValidAddress(ADDR)).toBe(true);
    expect(isValidAddress("not-an-address")).toBe(false);
  });

  it("encodes transfer() with the correct selector and padding", () => {
    const data = encodeTransfer(ADDR, BigInt(1000));
    expect(data.startsWith("0xa9059cbb")).toBe(true);
    expect(data.length).toBe(10 + 64 + 64);
  });

  it("rejects an invalid recipient for transfer()", () => {
    expect(() => encodeTransfer("bad", BigInt(1))).toThrow();
  });

  it("encodes balanceOf() with the correct selector", () => {
    const data = encodeBalanceOf(ADDR);
    expect(data.startsWith("0x70a08231")).toBe(true);
  });

  it("round-trips base units at 18 decimals", () => {
    const base = toBaseUnits(5, 18);
    expect(base).toBe(BigInt("5000000000000000000"));
    expect(fromBaseUnits(base, 18)).toBe(5);
  });

  it("round-trips a fractional amount", () => {
    const base = toBaseUnits(1.23, 6);
    expect(base).toBe(BigInt(1230000));
    expect(fromBaseUnits(base, 6)).toBe(1.23);
  });

  it("decodes a uint256 eth_call result", () => {
    const hex = "0x" + BigInt(42).toString(16).padStart(64, "0");
    expect(decodeUint256(hex)).toBe(BigInt(42));
  });
});
