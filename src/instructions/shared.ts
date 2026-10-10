// Pieces every builder shares.

import type { AccountMeta, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Buffer } from "buffer";
import { INSTRUCTIONS_SYSVAR, PYTH, SYSTEM_PROGRAM } from "../constants.js";

export const bn = (v: bigint | number) => new BN(v.toString());
export const bytes = (b: Uint8Array) => Buffer.from(b.buffer, b.byteOffset, b.byteLength);

/** The Pyth Pro accounts every priced instruction carries. */
export const pythAccounts = () => ({
  pythProgram: PYTH.program,
  pythStorage: PYTH.storage,
  pythTreasury: PYTH.treasury,
  instructions: INSTRUCTIONS_SYSVAR,
  systemProgram: SYSTEM_PROGRAM,
});

/** A signed Pyth Pro update, and the index of the ed25519 instruction that checks it (`withPrice`). */
export type Priced = { message: Uint8Array; ed25519Index: number };

/** A Jupiter route between the swap authority's transit accounts (`jupiterRoute`). */
export type Route = { data: Uint8Array; accounts: AccountMeta[] };

/** The AEQUA token, as `Config.aequa` names it. */
export type AequaToken = { mint: PublicKey; tokenProgram: PublicKey };
