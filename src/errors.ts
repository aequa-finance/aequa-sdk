// The program's errors by name, and the error the SDK throws where the program would refuse.

import type { Aequa } from "./idl/aequa.js";
import { IDL } from "./program.js";

/** The program's error names, as its logs print them ("Error Code: StalePrice."). */
export type ErrorName = Capitalize<Aequa["errors"][number]["name"]>;

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Every program error: its number and the message the program carries. */
export const ERRORS = Object.fromEntries(IDL.errors.map((e) => [capital(e.name), { code: e.code, message: e.msg }])) as Record<ErrorName, { code: number; message: string }>;

const byCode = new Map<number, ErrorName>(Object.entries(ERRORS).map(([name, e]) => [e.code, name as ErrorName]));

/** The program's error for a custom number. */
export const errorName = (code: number): ErrorName | undefined => byCode.get(code);

/** A refusal. `code` names one of the program's errors (`ErrorName`), or one the SDK raises. */
export class AequaError extends Error {
  constructor(
    readonly code: ErrorName | (string & {}) | undefined,
    message: string,
    readonly logs: string[] = [],
  ) {
    super(message);
    this.name = "AequaError";
  }
}
