// What a protocol read says: fees, capacity, rates and the next distribution, on a state built
// here, so each figure can be worked out by hand.

import assert from "node:assert/strict";
import { test } from "node:test";
import { PublicKey } from "@solana/web3.js";
import { COLLATERAL, distributionPreview, feeFor, positionState, susdqRate, usdcMintRoom, xstockMintRoom, type AequaStake, type ListedCollateral, type Protocol } from "../src/index.js";
import { launchParams } from "./helpers.js";

const USD = 1_000_000n;
const NOW = 1_800_000_000;

function protocol(o: { supply?: bigint; buffer?: bigint; reserveFund?: bigint; susdq?: bigint; vault?: bigint } = {}): Protocol {
  const params = launchParams();
  const bucket = (available: bigint) => ({ available, updatedAt: BigInt(NOW) });
  const collateral = {
    symbol: "SPYx",
    mint: COLLATERAL.SPYx.mint,
    account: { index: 0, spotCap: 15_000_000n * USD, hourlyCap: 500_000n * USD, mintBucket: bucket(500_000n * USD), redeemBucket: bucket(500_000n * USD), bandsBps: [5, 15, 15, 25], feed: 1398 },
    vault: o.vault ?? 0n,
    mintInfo: { decimals: 8, supply: 0n, multiplierE12: 1_000_000_000_000n, scaledUiAmount: null, paused: false, window: null, admissible: true },
  } as unknown as ListedCollateral;
  return {
    slot: 1,
    now: NOW,
    config: {
      params,
      paused: 0,
      spotCapTotal: 27_000_000n * USD,
      usdcBucket: bucket(1_000_000n * USD),
      aequa: { decimals: 6 },
    },
    reserve: {
      lastDistribution: BigInt(NOW - 8 * 3_600),
      bridgedOutTotal: 0n,
      landedTotal: 0n,
      report: { accountValue: 0n, creditedTotal: 0n, withdrawnTotal: 0n, hlTime: BigInt(NOW) * 1000n, reportedAt: BigInt(NOW), marketLive: 1 },
    },
    usdqVault: { base: 1_050n * USD, vesting: { amount: 100n * USD, start: BigInt(NOW - 3_600), end: BigInt(NOW + 3_600) } },
    aequaPool: { base: 100_000n * USD, stream: { amount: 0n, start: 0n, end: 0n }, totalShares: 100_000n * USD },
    twap: null,
    usdqSupply: o.supply ?? 1_000_000n * USD,
    susdqSupply: o.susdq ?? 1_000n * USD,
    balances: { buffer: o.buffer ?? 0n, landing: 0n, reserveFund: o.reserveFund ?? 0n, protocol: 0n, susdqAssets: 0n, susdqSilo: 0n, aequaPoolVault: 0n, slashSale: 0n },
    collateral: [collateral],
    aequa: null,
  } as unknown as Protocol;
}

const stake = (cooldownStart = 0n): AequaStake => ({ owner: PublicKey.default, shares: 100_000n * USD, cooldownStart, bump: 0 });

test("the fee tier follows an active stake, and nothing else", () => {
  const p = protocol();
  assert.equal(feeFor(p, null), 10);
  assert.equal(feeFor(p, stake()), 5, "100,000 AEQUA reaches the first tier");
  assert.equal(positionState(p, stake(BigInt(NOW - 3_600))), "cooling");
  assert.equal(feeFor(p, stake(BigInt(NOW - 3_600))), 10, "a cooling position has no tier");
});

test("sUSDq's rate counts what has vested", () => {
  // 1,050 USDq plus half of 100 vesting, over 1,000 sUSDq.
  assert.equal(susdqRate(protocol()), 1_100_000n);
});

test("capacity: the hourly bucket, the spot cap at a price, the supply ceiling", () => {
  // 27M of spot caps over a 67.5% spot share: a 40M ceiling.
  assert.equal(usdcMintRoom(protocol()), 1_000_000n * USD, "the bucket is the smaller");
  assert.equal(usdcMintRoom(protocol({ supply: 39_500_000n * USD })), 500_000n * USD, "the ceiling is the smaller");
  const p = protocol({ vault: 2_200_000_000_000n }); // 22,000 SPYx at $680: $14.96M of the $15M cap
  assert.equal(xstockMintRoom(p, p.collateral[0], 68_000_000_000n), 40_000n * USD);
  assert.equal(xstockMintRoom(protocol(), protocol().collateral[0], 68_000_000_000n), 500_000n * USD);
  assert.equal(xstockMintRoom(protocol({ supply: 40_100_000n * USD }), protocol().collateral[0], 68_000_000_000n), 0n);
});

test("the next distribution: the surplus over the cushion, capped by the time since the last", () => {
  // NAV 1.01M over a 1M supply: 1,002,500 floor, 7,500 surplus; 8 hours at 5 bps a day caps it at 166.666666.
  const d = distributionPreview(protocol({ buffer: 1_010_000n * USD }), [68_000_000_000n]);
  assert.equal(d.surplus, 7_500n * USD);
  assert.equal(d.amount, 166_666_666n);
  assert.deepEqual([d.toSusdq, d.toReserveFund, d.toProtocol], [133_333_334n, 16_666_666n, 16_666_666n]);
  assert.equal(d.toSusdq + d.toReserveFund + d.toProtocol, d.amount);
});

test("a shortfall burns the Reserve Fund and carries the rest", () => {
  const d = distributionPreview(protocol({ buffer: 990_000n * USD, reserveFund: 3_000n * USD }), [68_000_000_000n]);
  assert.deepEqual([d.amount, d.burned, d.deficit], [0n, 3_000n * USD, 7_000n * USD]);
  const between = distributionPreview(protocol({ buffer: 1_001_000n * USD }), [68_000_000_000n]);
  assert.deepEqual([between.amount, between.burned, between.deficit], [0n, 0n, 0n], "inside the cushion nothing moves");
});
