// The bridge route to the hedge account: the forwarding hook `set_bridge_route` stores, and the
// fee a `bridge_out` burn should allow, from Circle's Iris API (no key needed).

import { CCTP } from "./constants.js";
import type { BridgeArgs } from "./program.js";

/** An EVM address's 20 bytes. */
export function evmAddress(address: string): number[] {
  const hex = address.replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{40}$/.test(hex)) throw new Error(`not an EVM address: ${address}`);
  return Array.from({ length: 20 }, (_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16));
}

/** `set_bridge_route`'s arguments for a HyperCore account, with the fee cap `amount × bps / 10,000 + flat`. */
export const bridgeArgs = (hyperAccount: string, maxFeeBps: number, maxFeeFlat: bigint): BridgeArgs => ({ recipient: evmAddress(hyperAccount), maxFeeBps, maxFeeFlat });

/** The 56-byte forwarding hook that credits a burn to a HyperCore account (what `BridgeRoute.hookData` holds). */
export function hyperCoreHook(hyperAccount: string): Uint8Array {
  const hook = new Uint8Array(56);
  hook.set(new TextEncoder().encode("cctp-forward"), 0);
  new DataView(hook.buffer).setUint32(28, 24, false);
  hook.set(evmAddress(hyperAccount), 32);
  return hook;
}

/** Circle's fees for a Solana burn it forwards into HyperCore: bps by finality, and its forwarding fee in USDC base units. */
export type CircleFees = { fastBps: number; standardBps: number; forwardFee: { low: number; med: number; high: number } };

/** Circle's current fees for `bridge_out`'s route. */
export async function circleFees(iris = "https://iris-api.circle.com"): Promise<CircleFees> {
  const res = await fetch(`${iris}/v2/burn/USDC/fees/${CCTP.solanaDomain}/${CCTP.hyperEvmDomain}?forward=true&hyperCoreDeposit=true`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Circle's fee quote answered ${res.status}`);
  const rows = (await res.json()) as { finalityThreshold: number; minimumFee: number; forwardFee?: { low: number; med?: number; medium?: number; high: number } }[];
  const fast = rows.find((r) => r.finalityThreshold === 1000);
  const standard = rows.find((r) => r.finalityThreshold === 2000);
  const fwd = (fast ?? standard)?.forwardFee;
  if (!fwd) throw new Error("Circle's fee quote has no forwarding fee");
  return { fastBps: fast?.minimumFee ?? 1, standardBps: standard?.minimumFee ?? 0, forwardFee: { low: fwd.low, med: fwd.med ?? fwd.medium ?? fwd.high, high: fwd.high } };
}

/** The `maxFee` a burn of `amount` should allow: Circle keeps up to it, the bps part plus its forwarding fee. */
export function circleMaxFee(amount: bigint, fees: CircleFees, fast: boolean): bigint {
  // The bps may carry decimals: work in hundredths of a basis point, rounding up.
  const centiBps = BigInt(Math.ceil((fast ? fees.fastBps : fees.standardBps) * 100));
  return (amount * centiBps + 999_999n) / 1_000_000n + BigInt(Math.ceil(fees.forwardFee.med));
}

/** Whether a fee fits a route's cap (`Config.bridge`): `amount × maxFeeBps / 10,000 + maxFeeFlat`. */
export const feeFits = (amount: bigint, fee: bigint, route: { maxFeeBps: number; maxFeeFlat: bigint }) => fee <= (amount * BigInt(route.maxFeeBps)) / 10_000n + route.maxFeeFlat;
