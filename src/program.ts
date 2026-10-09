// The program's IDL, an Anchor client for it, and its accounts decoded with plain bigints:
// every u64, i64 and u128 the program stores arrives as a `bigint`, every key as a `PublicKey`.

import { Program, type IdlAccounts, type IdlEvents, type IdlTypes } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Buffer } from "buffer";
import idl from "./idl/idl.js";
import type { Aequa } from "./idl/aequa.js";

export type { Aequa };
/** The program's IDL as `anchor idl build` writes it. */
export const IDL = idl as Aequa;

/** A value with Anchor's `BN`s as bigints, recursively. */
export type Plain<T> = T extends BN
  ? bigint
  : T extends PublicKey | Uint8Array
    ? T
    : T extends readonly (infer U)[]
      ? Plain<U>[]
      : T extends object
        ? { [K in keyof T]: Plain<T[K]> }
        : T;

const isKey = (v: object): v is PublicKey => v instanceof PublicKey || typeof (v as { toBase58?: unknown }).toBase58 === "function";

export function plain<T>(v: T): Plain<T> {
  if (BN.isBN(v)) return BigInt((v as BN).toString()) as Plain<T>;
  if (v === null || typeof v !== "object" || v instanceof Uint8Array || isKey(v)) return v as Plain<T>;
  if (Array.isArray(v)) return v.map(plain) as Plain<T>;
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) as Plain<T>;
}

type A = IdlAccounts<Aequa>;
type T = IdlTypes<Aequa>;
export type AccountName = keyof A;
export type Config = Plain<A["config"]>;
export type Reserve = Plain<A["reserve"]>;
export type Collateral = Plain<A["collateral"]>;
export type UsdqVault = Plain<A["usdqVault"]>;
export type UsdqCooldown = Plain<A["usdqCooldown"]>;
export type AequaPool = Plain<A["aequaPool"]>;
export type AequaStake = Plain<A["aequaStake"]>;
export type Twap = Plain<A["twap"]>;
export type Params = Plain<T["params"]>;
export type Bucket = Plain<T["bucket"]>;
export type Vesting = Plain<T["vesting"]>;
export type HedgeReport = Plain<T["hedgeReport"]>;
export type EventName = keyof IdlEvents<Aequa>;
export type EventData<N extends EventName> = Plain<IdlEvents<Aequa>[N]>;

export type AequaProgram = Program<Aequa>;

/** An Anchor client for the program; `connection` is only needed for Anchor's own fetches. */
export function aequaProgram(connection?: Connection): AequaProgram {
  return new Program<Aequa>(IDL, { connection: connection ?? new Connection("http://127.0.0.1:8899") });
}

let shared: AequaProgram | undefined;
/** The client the decoders share. It never calls an RPC. */
export const program = () => (shared ??= aequaProgram());

/** Decodes one of the program's accounts; throws on another account's discriminator. */
export function decodeAccount<N extends AccountName>(name: N, data: Uint8Array): Plain<A[N]> {
  return plain(program().coder.accounts.decode<A[N]>(name, Buffer.from(data.buffer, data.byteOffset, data.byteLength)));
}
