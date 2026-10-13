// Values the tests share.

import type { Params } from "../src/index.js";

/** The program's launch parameters (params.rs `Params::launch`). */
export const launchParams = (): Params => ({
  leverageBps: [20_000, 30_000, 40_000],
  bufferBps: [500, 1_000, 1_500],
  deltaToleranceBps: 50,
  usdcHourlyCap: 1_000_000_000_000n,
  baseFeeBps: 10,
  tierStake: [100_000n, 1_000_000n],
  tierFeeBps: [5, 2],
  keeperSlippageBps: 50,
  pythFreshnessSecs: 10,
  reportFreshnessSecs: 120,
  distributionIntervalSecs: 8 * 3_600,
  susdqVestingSecs: 8 * 3_600,
  cushionBps: 25,
  yieldCapBpsPerDay: 5,
  reserveFundShareBps: 1_000,
  protocolShareBps: 1_000,
  reserveFundTargetBps: 200,
  susdqCooldownSecs: 7 * 86_400,
  buybackMaxChunk: 5_000_000_000n,
  buybackTwapBoundBps: 100,
  buybackBurnBps: 5_000,
  aequaStreamSecs: 7 * 86_400,
  aequaCooldownSecs: 10 * 86_400,
  slashCapBps: 3_000,
  deficitHold: 3,
  slashTwapBoundBps: 500,
  caWindowBeforeSecs: 24 * 3_600,
  caWindowAfterSecs: 3_600,
});

/** A Pyth Pro payload: each feed with a price, exponent −5, a feed update time and a session. */
export function payload(timestampUs: bigint, channel: number, feeds: { id: number; price: bigint; session: number; updatedUs: bigint }[]): Uint8Array {
  const out: number[] = [];
  const v = new DataView(new ArrayBuffer(8));
  const push = (bytes: number) => out.push(...new Uint8Array(v.buffer, 0, bytes));
  v.setUint32(0, 2_479_346_549, true), push(4);
  v.setBigUint64(0, timestampUs, true), push(8);
  out.push(channel, feeds.length);
  for (const f of feeds) {
    v.setUint32(0, f.id, true), push(4);
    out.push(5);
    out.push(0), v.setBigInt64(0, f.price, true), push(8);
    out.push(4), v.setInt16(0, -5, true), push(2);
    out.push(5), v.setBigInt64(0, 123n, true), push(8);
    out.push(12, 1), v.setBigUint64(0, f.updatedUs, true), push(8);
    out.push(9), v.setInt16(0, f.session, true), push(2);
  }
  return Uint8Array.from(out);
}

/** A "solana" envelope around a payload, with a signature and signer (real or not). */
export function envelope(body: Uint8Array, signature: Uint8Array = new Uint8Array(64).fill(7), signer: Uint8Array = new Uint8Array(32).fill(9)): Uint8Array {
  const e = new Uint8Array(102 + body.length);
  const v = new DataView(e.buffer);
  v.setUint32(0, 2_182_742_457, true);
  e.set(signature, 4);
  e.set(signer, 68);
  v.setUint16(100, body.length, true);
  e.set(body, 102);
  return e;
}
