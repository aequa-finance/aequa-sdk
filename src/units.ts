// Amounts between the decimal strings people type and read and the raw base units the program
// counts in, exactly: no floating point on the way.

const AMOUNT = /^(\d*)(?:\.(\d*))?$/;

/** A decimal string ("1250.5") as raw units at `decimals`; throws past the token's precision. */
export function parseUnits(text: string, decimals: number): bigint {
  const m = text.trim().match(AMOUNT);
  if (!m || !(m[1] || m[2])) throw new Error(`not an amount: ${JSON.stringify(text)}`);
  const [, whole, fraction = ""] = m;
  if (/[1-9]/.test(fraction.slice(decimals))) throw new Error(`${text.trim()} has more than ${decimals} decimals`);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fraction.slice(0, decimals).padEnd(decimals, "0") || "0");
}

/** Raw units at `decimals` as a decimal string, every digit kept and trailing zeros dropped ("1250.5"). */
export function formatUnits(raw: bigint, decimals: number): string {
  const sign = raw < 0n ? "-" : "";
  const v = raw < 0n ? -raw : raw;
  const one = 10n ** BigInt(decimals);
  const fraction = (v % one).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${v / one}${fraction ? `.${fraction}` : ""}`;
}
