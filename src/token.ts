// Token accounts and mints read from raw account data, as the program reads them
// (token2022.rs): an xStock mint's multiplier, the issuer's pause, the corporate-action window
// around a scheduled multiplier change, and the admission checks a collateral mint must pass.

import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { ATA_PROGRAM, MULT_ONE, SYSTEM_PROGRAM, TOKEN_PROGRAM } from "./constants.js";
import { multiplierE12 } from "./math.js";
import { ata } from "./pda.js";

const view = (d: Uint8Array) => new DataView(d.buffer, d.byteOffset, d.byteLength);

/** A token account's balance (SPL Token or Token-2022); 0 for a missing account. */
export const tokenAmount = (data: Uint8Array | null | undefined): bigint => (data && data.length >= 72 ? view(data).getBigUint64(64, true) : 0n);

/** A mint's supply. */
export const mintSupply = (data: Uint8Array): bigint => view(data).getBigUint64(36, true);

/** Token-2022 extensions the program reads, by their `ExtensionType` number. */
const EXT = { transferFee: 1, confidentialTransfer: 4, nonTransferable: 9, interestBearing: 10, transferHook: 14, scaledUiAmount: 25, pausable: 26 } as const;

export type MintInfo = {
  decimals: number;
  supply: bigint;
  /** The multiplier in force at the time read, at 1e12 (1e12 without a ScaledUiAmount extension). */
  multiplierE12: bigint;
  /** The ScaledUiAmount extension: the multiplier, and the next one from `effectiveAt` (unix seconds). */
  scaledUiAmount: { multiplier: number; next: number; effectiveAt: number } | null;
  /** The issuer has paused the mint (`IssuerPaused`). */
  paused: boolean;
  /** The corporate-action window the time read falls in, `[from, to)` in unix seconds (`CorporateActionWindow`). */
  window: { from: number; to: number } | null;
  /** Passes the admission checks (`CollateralNotAdmissible` otherwise). */
  admissible: boolean;
};

/**
 * Reads a mint at `now` (unix seconds). `windowSecs` is the corporate-action window around a
 * scheduled multiplier change (`Params.caWindowBeforeSecs` and `caWindowAfterSecs`).
 */
export function readMint(data: Uint8Array, now: number, windowSecs: { before: number; after: number } = { before: 0, after: 0 }): MintInfo {
  const v = view(data);
  const info: MintInfo = { decimals: data[44], supply: v.getBigUint64(36, true), multiplierE12: MULT_ONE, scaledUiAmount: null, paused: false, window: null, admissible: true };
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
      const m = multiplierE12(now >= effectiveAt ? next : multiplier);
      if (m === null) info.admissible = false;
      else info.multiplierE12 = m;
      // A scheduled change: the paths close from `before` ahead of it until `after` past it.
      const scheduled = Buffer.compare(Buffer.from(data.subarray(at + 32, at + 40)), Buffer.from(data.subarray(at + 48, at + 56))) !== 0;
      const [from, to] = [effectiveAt - windowSecs.before, effectiveAt + windowSecs.after];
      if (scheduled && now >= from && now < to) info.window = { from, to };
    } else if (type === EXT.pausable) info.paused = data[at + 32] !== 0;
    else if (type === EXT.transferFee) {
      if (v.getUint16(at + 88, true) !== 0 || v.getUint16(at + 106, true) !== 0) info.admissible = false;
    } else if (type === EXT.transferHook) {
      if (data.subarray(at + 32, at + 64).some((b) => b !== 0)) info.admissible = false;
    } else if (type === EXT.confidentialTransfer) {
      if (data[at + 32] !== 0) info.admissible = false;
    } else if (type === EXT.nonTransferable || type === EXT.interestBearing) info.admissible = false;
    i = at + len;
  }
  return info;
}

/** Creates `owner`'s associated token account for `mint` if it doesn't exist yet. */
export function createAtaIdempotent(payer: PublicKey, owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey = TOKEN_PROGRAM): TransactionInstruction {
  return new TransactionInstruction({
    programId: ATA_PROGRAM,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata(mint, owner, tokenProgram), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}
