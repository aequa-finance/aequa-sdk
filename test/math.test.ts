// The arithmetic against the program's own test vectors (math.rs, params.rs, state.rs, twap.rs).

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AequaError,
  aequaForUsd,
  aequaPriceUsd,
  afterFee,
  buybackMinOut,
  distributionSplit,
  fillPrice,
  slashSaleMinOut,
  usdAt,
  assetsFor,
  assetsForUp,
  bucketLevel,
  feeBps,
  inFlight,
  multiplierE12,
  mulDiv,
  poolPrice,
  priceE8,
  rawAmount,
  reportFresh,
  hedgeLive,
  sharesFor,
  spotShareBps,
  stakeState,
  supplyCap,
  twapAverage,
  uiAmount,
  usdToXstock,
  vested,
  xstockToUsd,
  xstockValue,
} from "../src/index.js";
import { launchParams } from "./helpers.js";

const refuses = (f: () => unknown, code: string) => assert.throws(f, (e) => e instanceof AequaError && e.code === code);

test("the fee rounds the amount out down", () => {
  assert.deepEqual(afterFee(1_000_000n, 10), { out: 999_000n, fee: 1_000n });
  assert.deepEqual(afterFee(1n, 10), { out: 0n, fee: 1n });
  assert.deepEqual(afterFee(9_999n, 10), { out: 9_989n, fee: 10n });
});

test("an xStock round trip never gains", () => {
  const m = multiplierE12(1.005714560286254)!;
  const p = 66_512_340_000n;
  const raw = 12_345_678_901n;
  const usd = xstockToUsd(raw, m, p, 5, 8);
  assert.ok(usdToXstock(usd, m, p, 5, 8) < raw);
  assert.equal(xstockValue(raw, 1_000_000_000_000n, p, 8), (raw * p) / 100_000_000n / 100n);
});

test("prices at 1e8", () => {
  assert.equal(priceE8(66_512_340n, -5), 66_512_340_000n);
  assert.equal(priceE8(6_651_234_000_000n, -10), 66_512_340_000n);
  refuses(() => priceE8(0n, -8), "InvalidPythPrice");
  refuses(() => priceE8(1n, -9), "InvalidPythPrice");
  refuses(() => priceE8(1n, 23), "InvalidPythPrice");
});

test("buckets refill linearly up to the cap", () => {
  assert.equal(bucketLevel(0n, 0, 1_000_000n, 1_800), 500_000n);
  assert.equal(bucketLevel(900_000n, 0, 1_000_000n, 3_600), 1_000_000n);
  assert.equal(bucketLevel(10n, 100, 1_000_000n, 50), 10n);
});

test("vesting is linear", () => {
  assert.equal(vested(800n, 100, 900, 500), 400n);
  assert.equal(vested(800n, 100, 900, 1_000), 800n);
  assert.equal(vested(800n, 100, 900, 50), 0n);
});

test("shares and assets", () => {
  assert.equal(sharesFor(500n, 0n, 0n), 500n);
  assert.equal(sharesFor(500n, 1_000n, 900n), 450n);
  assert.equal(assetsFor(450n, 1_000n, 900n), 500n);
  assert.equal(assetsFor(1n, 1_000n, 0n), 0n);
  assert.equal(assetsForUp(1n, 10n, 3n), 4n);
  assert.equal(mulDiv(10n, 3n, 4n), 7n);
  refuses(() => mulDiv(1n, 1n, 0n), "MathOverflow");
});

test("multipliers round like the program, and refuse what it refuses", () => {
  assert.equal(multiplierE12(1), 1_000_000_000_000n);
  assert.equal(multiplierE12(1.005714560286254), 1_005_714_560_286n);
  assert.equal(multiplierE12(0), null);
  assert.equal(multiplierE12(Number.NaN), null);
  assert.equal(multiplierE12(2e6), null);
  assert.equal(uiAmount(100n, 1_500_000_000_000n), 150n);
  assert.equal(rawAmount(150n, 1_500_000_000_000n), 100n);
});

test("the launch parameters' spot share and supply ceiling", () => {
  const params = launchParams();
  assert.equal(spotShareBps(params), 6_750n);
  assert.equal(supplyCap({ spotCapTotal: 27_000_000_000_000n, params }), 40_000_000_000_000n);
});

test("fee tiers count whole AEQUA at the token's decimals", () => {
  const config = { params: launchParams(), aequa: { decimals: 6 } } as Parameters<typeof feeBps>[0];
  assert.equal(feeBps(config, 0n), 10);
  assert.equal(feeBps(config, 99_999_999_999n), 10);
  assert.equal(feeBps(config, 100_000_000_000n), 5);
  assert.equal(feeBps(config, 1_000_000_000_000n), 2);
});

test("in flight and the hedge report's freshness", () => {
  const report = { creditedTotal: 90n, withdrawnTotal: 50n, hlTime: 1_000_000n, reportedAt: 1n, marketLive: 0b10 };
  const r = { bridgedOutTotal: 100n, landedTotal: 20n, report } as never;
  assert.equal(inFlight(r), 40n);
  assert.equal(reportFresh(r, 1_120, 120), true);
  assert.equal(reportFresh(r, 1_121, 120), false);
  assert.equal(hedgeLive(r, 1, 1_000, 120), true);
  assert.equal(hedgeLive(r, 0, 1_000, 120), false);
});

test("a stAEQUA position cools, opens its window, then counts as active again", () => {
  const s = { shares: 5n, cooldownStart: 1_000n };
  assert.equal(stakeState({ shares: 0n, cooldownStart: 0n }, 0, 100), "empty");
  assert.equal(stakeState({ shares: 5n, cooldownStart: 0n }, 0, 100), "active");
  assert.equal(stakeState(s, 1_099, 100), "cooling");
  assert.equal(stakeState(s, 1_100, 100, 50), "window");
  assert.equal(stakeState(s, 1_150, 100, 50), "active");
});

test("the TWAP weighs each price by how long it stood", () => {
  // Observations every minute for 40 minutes at a price of 2.0, then 3.0 for the last ten.
  const at: bigint[] = Array(64).fill(0n);
  const cumulative: bigint[] = Array(64).fill(0n);
  let head = 0;
  let count = 0;
  let last = 0n;
  const record = (t: bigint, price: bigint) => {
    const i = (head + 63) % 64;
    cumulative[head] = count ? cumulative[i] + last * (t - at[i]) : 0n;
    at[head] = t;
    last = price;
    head = (head + 1) % 64;
    count = Math.min(64, count + 1);
  };
  for (let m = 0; m <= 40; m++) record(BigInt(m * 60), m < 30 ? 2_000_000_000_000n : 3_000_000_000_000n);
  const twap = { at, cumulative, lastPrice: last, head, count };
  // Over 40 min .. 10 min: 20 minutes at 2.0, then 10 at 3.0 (the price recorded at 30 min).
  assert.equal(twapAverage(twap, 2_400), (2_000_000_000_000n * 1_200n + 3_000_000_000_000n * 600n) / 1_800n);
  refuses(() => twapAverage(twap, 2_400 + 301), "TwapNotReady");
  refuses(() => twapAverage({ ...twap, count: 0 }, 2_400), "TwapNotReady");
  assert.equal(poolPrice(2_000_000n, 6, 3_000_000n, 6), 1_500_000_000_000n);
  refuses(() => poolPrice(0n, 6, 1n, 6), "TwapNotReady");
});

test("the AEQUA cranks' prices, against the program's vectors", () => {
  // 100M AEQUA (6 dp) at $0.00005: $5,000; $1,000 at that price is 20M AEQUA.
  assert.equal(usdAt(100_000_000_000_000n, 50_000_000n, 6), 5_000_000_000n);
  assert.equal(usdAt(1n, 50_000_000n, 6), 1n);
  assert.equal(fillPrice(5_000_000_000n, 100_000_000_000_000n, 6), 50_000_000n);
  assert.equal(aequaForUsd(1_000_000_000n, 50_000_000n, 6), 20_000_000_000_000n);
  assert.equal(aequaForUsd(1n, 3_000_000_000_000n, 6), 1n);
  refuses(() => fillPrice(1n, 0n, 6), "TwapBound");
  assert.equal(aequaPriceUsd(2_000_000_000_000n), 2_000_000_000_000n);
  assert.equal(aequaPriceUsd(2_000_000_000_000n, 150_000_000n), 3_000_000_000_000n);
});

test("the least a buyback or a slash sale must fill, at the bound exactly", () => {
  const price = 50_000_000n;
  for (const usd of [1n, 999_999n, 5_000_000_000n, 123_456_789_012n]) {
    const min = buybackMinOut(usd, price, 100, 6);
    const ceiling = (price * 10_100n) / 10_000n;
    assert.ok(fillPrice(usd, min, 6) <= ceiling, "the minimum passes");
    assert.ok(min === 1n || fillPrice(usd, min - 1n, 6) > ceiling, "one less fails");
  }
  for (const aequa of [1n, 7_777_777n, 100_000_000_000_000n]) {
    const min = slashSaleMinOut(aequa, price, 500, 6);
    const floor = (price * 9_500n) / 10_000n;
    assert.ok(fillPrice(min, aequa, 6) >= floor, "the minimum passes");
    assert.ok(min === 0n || fillPrice(min - 1n, aequa, 6) < floor, "one less fails");
  }
});

test("a distribution's split, against the program's vectors", () => {
  const MAX = (1n << 64n) - 1n;
  const split = (amount: bigint, fund: number, protocol: number, room: bigint, stakers: boolean) => Object.values(distributionSplit(amount, fund, protocol, room, stakers));
  assert.deepEqual(split(1_000_003n, 1_000, 1_000, MAX, true), [800_003n, 100_000n, 100_000n]);
  assert.deepEqual(split(1_000_000n, 1_000, 1_000, 40_000n, true), [800_000n, 40_000n, 160_000n]);
  assert.deepEqual(split(1_000_000n, 1_000, 1_000, MAX, false), [0n, 900_000n, 100_000n]);
  assert.deepEqual(split(1_000_000n, 1_000, 2_000, 0n, true), [700_000n, 0n, 300_000n]);
});

