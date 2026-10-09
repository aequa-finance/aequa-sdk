// Token accounts and mints read from raw account data, as the program reads them
// (token2022.rs): an xStock mint's multiplier and the issuer's pause.

import { MULT_ONE } from "./constants.js";

const view = (d: Uint8Array) => new DataView(d.buffer, d.byteOffset, d.byteLength);

/** A token account's balance (SPL Token or Token-2022); 0 for a missing account. */
export const tokenAmount = (data: Uint8Array | null | undefined): bigint => (data && data.length >= 72 ? view(data).getBigUint64(64, true) : 0n);

/** A mint's supply. */
export const mintSupply = (data: Uint8Array): bigint => view(data).getBigUint64(36, true);

/** Token-2022 extensions the program reads, by their `ExtensionType` number. */
const EXT = { scaledUiAmount: 25, pausable: 26 } as const;

export type MintInfo = {
  decimals: number;
  supply: bigint;
  /** The multiplier in force at the time read, at 1e12 (1e12 without a ScaledUiAmount extension). */
  multiplierE12: bigint;
  /** The ScaledUiAmount extension: the multiplier, and the next one from `effectiveAt` (unix seconds). */
  scaledUiAmount: { multiplier: number; next: number; effectiveAt: number } | null;
  /** The issuer has paused the mint (`IssuerPaused`). */
  paused: boolean;
};

/** Reads a mint at `now` (unix seconds). */
export function readMint(data: Uint8Array, now: number): MintInfo {
  const v = view(data);
  const info: MintInfo = { decimals: data[44], supply: v.getBigUint64(36, true), multiplierE12: MULT_ONE, scaledUiAmount: null, paused: false };
  // Token-2022 extensions follow the account-type byte at 165, as type, length, value.
  for (let i = 166; data.length > 165 && i + 4 <= data.length; ) {
    const type = v.getUint16(i, true);
    const len = v.getUint16(i + 2, true);
    const at = i + 4;
    if (type === 0) break;
    if (type === EXT.scaledUiAmount) {
      const multiplier = v.getFloat64(at + 32, true);
      const effectiveAt = Number(v.getBigInt64(at + 40, true));
      const next = v.getFloat64(at + 48, true);
      info.scaledUiAmount = { multiplier, next, effectiveAt };
      // TODO round and range-check like math.rs multiplier_e12
      info.multiplierE12 = BigInt(Math.round((now >= effectiveAt ? next : multiplier) * 1e12));
    } else if (type === EXT.pausable) info.paused = data[at + 32] !== 0;
    i = at + len;
  }
  return info;
}
