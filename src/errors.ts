// The program's errors by name, and reading a refusal back out of whatever it arrives as:
// simulation or transaction logs, a transaction error, or web3.js's SendTransactionError. A
// name is the program's own only when the logs show this program raised it: Pyth Lazer, Jupiter
// and CCTP, which it calls, number their errors from 6000 too.

import { SendTransactionError, type TransactionError } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants.js";
import type { Aequa } from "./idl/aequa.js";
import { IDL } from "./program.js";

/** The program's error names, as its logs print them ("Error Code: StalePrice."). */
export type ErrorName = Capitalize<Aequa["errors"][number]["name"]>;

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Every program error: its number and the message the program carries. */
export const ERRORS = Object.fromEntries(IDL.errors.map((e) => [capital(e.name), { code: e.code, message: e.msg }])) as Record<ErrorName, { code: number; message: string }>;

const byCode = new Map<number, ErrorName>(Object.entries(ERRORS).map(([name, e]) => [e.code, name as ErrorName]));

/** This program's error for a custom number. Only meaningful when this program raised it. */
export const errorName = (code: number): ErrorName | undefined => byCode.get(code);

/**
 * A refusal. `code` names it: one of this program's errors (`ErrorName`), another program's
 * Anchor error, `Custom<n>` for a custom number whose program isn't known to be this one, a
 * runtime error ("BlockhashNotFound", "InsufficientFundsForFee", …), or one the SDK raises:
 * "Expired" (the blockhash ran out before the transaction landed), "TooLarge", "NotListed",
 * "NoPriceSource". `program` is the program that raised it, when the logs say.
 */
export class AequaError extends Error {
  constructor(
    readonly code: ErrorName | (string & {}) | undefined,
    message: string,
    readonly logs: string[] = [],
    readonly program?: string,
  ) {
    super(message);
    this.name = "AequaError";
  }

  /** Whether this is the program refusing with `name`. */
  is(name: ErrorName) {
    return this.code === name && (this.program === undefined || this.program === PROGRAM_ID.toBase58());
  }
}

/**
 * The error that stopped a transaction, from its logs: an Anchor error's name with the program
 * that printed it, or else the custom number of the first program that failed.
 */
export function failureFromLogs(logs: readonly string[] | null | undefined): { code: string; program: string } | undefined {
  const running: string[] = [];
  for (const l of logs ?? []) {
    const invoke = l.match(/^Program (\w+) invoke \[\d+\]$/);
    if (invoke) {
      running.push(invoke[1]);
      continue;
    }
    const named = l.match(/Error Code: (\w+)\./);
    if (named && running.length) return { code: named[1], program: running[running.length - 1] };
    const custom = l.match(/^Program (\w+) failed: custom program error: 0x([0-9a-f]+)$/i);
    if (custom) {
      const n = parseInt(custom[2], 16);
      return { code: (custom[1] === PROGRAM_ID.toBase58() && errorName(n)) || `Custom${n}`, program: custom[1] };
    }
    if (/^Program \w+ (success|failed)/.test(l)) running.pop();
  }
  return undefined;
}

/** The name of the error that stopped a transaction, from its logs. */
export const codeFromLogs = (logs: readonly string[] | null | undefined) => failureFromLogs(logs)?.code;

/** A transaction error's name: the runtime's, or `Custom<n>` for a program's custom number. */
export function codeFromTransactionError(err: TransactionError | string | null | undefined): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  const ix = (err as { InstructionError?: [number, unknown] }).InstructionError;
  if (ix) {
    const inner = ix[1];
    if (typeof inner === "string") return inner;
    const custom = (inner as { Custom?: number }).Custom;
    if (typeof custom === "number") return `Custom${custom}`;
    return Object.keys(inner as object)[0];
  }
  return Object.keys(err)[0];
}

/** An `AequaError` from a failed simulation or transaction. */
export function refusal(err: TransactionError | string | null | undefined, logs: readonly string[] | null | undefined, what = "transaction"): AequaError {
  const f = failureFromLogs(logs);
  const code = f?.code ?? codeFromTransactionError(err);
  const ours = f?.program === PROGRAM_ID.toBase58();
  const why = ours && code && code in ERRORS ? ` (${ERRORS[code as ErrorName].message})` : f && !ours ? ` (in ${f.program})` : "";
  return new AequaError(code, `${what} refused${code ? `: ${code}` : ""}${why}`, [...(logs ?? [])], f?.program);
}

/** Any thrown value as an `AequaError`, keeping the logs a SendTransactionError carries. */
export function toAequaError(e: unknown): AequaError {
  if (e instanceof AequaError) return e;
  if (e instanceof SendTransactionError) {
    const logs = e.logs ?? [];
    const f = failureFromLogs(logs);
    const custom = e.message.match(/custom program error: 0x([0-9a-f]+)/i);
    const code = f?.code ?? (custom ? `Custom${parseInt(custom[1], 16)}` : runtimeCode(e.message));
    return new AequaError(code, e.message, logs, f?.program);
  }
  const message = e instanceof Error ? e.message : String(e);
  return new AequaError(runtimeCode(message), message);
}

/** The runtime's errors as an RPC words them. */
const RUNTIME: [RegExp, string][] = [
  [/blockhash not found/i, "BlockhashNotFound"],
  [/insufficient funds for fee/i, "InsufficientFundsForFee"],
  [/insufficient funds for rent/i, "InsufficientFundsForRent"],
  [/no record of a prior credit/i, "AccountNotFound"],
  [/already been processed/i, "AlreadyProcessed"],
  [/computational budget exceeded|exceeded CUs meter/i, "ComputationalBudgetExceeded"],
];

function runtimeCode(text: string): string | undefined {
  return RUNTIME.find(([pattern]) => pattern.test(text))?.[1];
}
