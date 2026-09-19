/**
 * Minimal, dependency-free ERC-20 call encoding.
 *
 * We deliberately don't pull in ethers/viem: the only on-chain interactions
 * this app performs are three read-only `eth_call`s (decimals, symbol,
 * balanceOf) and one `eth_sendTransaction` (transfer), all against the
 * user's own connected wallet provider (`window.ethereum`). Hand-rolled
 * encoding for that small surface is easy to audit and keeps the dependency
 * footprint at zero.
 */

// First 4 bytes of keccak256("transfer(address,uint256)") /
// keccak256("balanceOf(address)") / keccak256("decimals()") /
// keccak256("symbol()") — these are fixed, well-known ERC-20 selectors.
export const SELECTORS = {
  transfer: "0xa9059cbb",
  balanceOf: "0x70a08231",
  decimals: "0x313ce567",
  symbol: "0x95d89b41",
} as const;

function stripHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function padLeft32(hex: string): string {
  return stripHexPrefix(hex).padStart(64, "0");
}

export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/** Encodes `transfer(address to, uint256 amount)` calldata. */
export function encodeTransfer(to: string, amount: bigint): string {
  if (!isValidAddress(to)) throw new Error(`Invalid recipient address: ${to}`);
  if (amount < BigInt(0)) throw new Error("Transfer amount cannot be negative.");
  return SELECTORS.transfer + padLeft32(to) + padLeft32(amount.toString(16));
}

/** Encodes `balanceOf(address owner)` calldata. */
export function encodeBalanceOf(owner: string): string {
  if (!isValidAddress(owner)) throw new Error(`Invalid owner address: ${owner}`);
  return SELECTORS.balanceOf + padLeft32(owner);
}

/** Decodes a single uint256 returned from an `eth_call`. */
export function decodeUint256(hexResult: string): bigint {
  const clean = stripHexPrefix(hexResult);
  if (!clean) return BigInt(0);
  return BigInt("0x" + clean);
}

/** Converts a human-readable decimal amount (e.g. "5.00") into base units. */
export function toBaseUnits(amount: number, decimals: number): bigint {
  // Work in fixed-point on strings to avoid floating point error creeping
  // into an on-chain amount.
  const [whole, frac = ""] = amount.toFixed(decimals).split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "");
  return BigInt(combined || "0");
}

/** Converts base units back into a human-readable decimal number. */
export function fromBaseUnits(amount: bigint, decimals: number): number {
  const s = amount.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals) || "0";
  const frac = s.slice(s.length - decimals);
  return Number(`${whole}.${frac}`);
}
