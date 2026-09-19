import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadFeeConfig } from "../config";

const ENV_KEYS = [
  "PLATFORM_FEE_BPS",
  "PLATFORM_FEE_TOKEN_ADDRESS",
  "PLATFORM_FEE_TOKEN_SYMBOL",
  "PLATFORM_FEE_TOKEN_DECIMALS",
  "PLATFORM_FEE_RECIPIENT_ADDRESS",
  "TESTNET_RPC_URL",
  "TESTNET_CHAIN_ID",
  "TESTNET_CHAIN_NAME",
  "TESTNET_BLOCK_EXPLORER_BASE",
] as const;

const ORIGINAL: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    ORIGINAL[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
});

const VALID_ADDRESS = "0x1234567890123456789012345678901234567890";
const VALID_RECIPIENT = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

describe("loadFeeConfig", () => {
  it("loads a valid testnet configuration", () => {
    process.env.PLATFORM_FEE_TOKEN_ADDRESS = VALID_ADDRESS;
    process.env.PLATFORM_FEE_RECIPIENT_ADDRESS = VALID_RECIPIENT;
    process.env.TESTNET_CHAIN_ID = "11155111"; // Sepolia

    const status = loadFeeConfig();
    expect(status.ok).toBe(true);
    expect(status.config?.chainName).toBe("Sepolia");
    expect(status.config?.feeBps).toBe(50); // default
  });

  it("refuses a known mainnet chain id", () => {
    process.env.PLATFORM_FEE_TOKEN_ADDRESS = VALID_ADDRESS;
    process.env.PLATFORM_FEE_RECIPIENT_ADDRESS = VALID_RECIPIENT;
    process.env.TESTNET_CHAIN_ID = "1"; // Ethereum mainnet

    const status = loadFeeConfig();
    expect(status.ok).toBe(false);
    expect(status.error).toMatch(/mainnet/i);
  });

  it("refuses Polygon mainnet too", () => {
    process.env.PLATFORM_FEE_TOKEN_ADDRESS = VALID_ADDRESS;
    process.env.PLATFORM_FEE_RECIPIENT_ADDRESS = VALID_RECIPIENT;
    process.env.TESTNET_CHAIN_ID = "137";

    const status = loadFeeConfig();
    expect(status.ok).toBe(false);
  });

  it("rejects a malformed token address", () => {
    process.env.PLATFORM_FEE_TOKEN_ADDRESS = "not-an-address";
    process.env.PLATFORM_FEE_RECIPIENT_ADDRESS = VALID_RECIPIENT;

    const status = loadFeeConfig();
    expect(status.ok).toBe(false);
    expect(status.error).toMatch(/token/i);
  });

  it("rejects a malformed recipient address", () => {
    process.env.PLATFORM_FEE_TOKEN_ADDRESS = VALID_ADDRESS;
    process.env.PLATFORM_FEE_RECIPIENT_ADDRESS = "0xshort";

    const status = loadFeeConfig();
    expect(status.ok).toBe(false);
    expect(status.error).toMatch(/recipient/i);
  });

  it("rejects an out-of-range fee bps", () => {
    process.env.PLATFORM_FEE_TOKEN_ADDRESS = VALID_ADDRESS;
    process.env.PLATFORM_FEE_RECIPIENT_ADDRESS = VALID_RECIPIENT;
    process.env.PLATFORM_FEE_BPS = "20000"; // 200%, invalid

    const status = loadFeeConfig();
    expect(status.ok).toBe(false);
  });
});
