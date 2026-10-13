// The program's arithmetic in bigint, function for function (math.rs, state.rs, twap.rs), so a
// quote here is the amount the program will pay. Amounts are raw base units; every amount paid
// out rounds down; times are unix seconds.

import { BPS, LIMITS, MULT_ONE, PRICE_ONE } from "./constants.js";
import { AequaError, ERRORS, type ErrorName } from "./errors.js";
import type { AequaStake, Config, Params, Reserve, Twap } from "./program.js";

type Time = number | bigint;
const U64_MAX = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;
const USD_ONE = 1_000_000n;

/** The error the program fails with at the same point. */
export const fail = (name: ErrorName): never => {
  throw new AequaError(name, `${name}: ${ERRORS[name].message}`);
};
const u64 = (v: bigint) => (v > U64_MAX ? fail("MathOverflow") : v);
const pow10 = (n: number) => 10n ** BigInt(n);

/** `out = floor(amount × (10000 − feeBps) / 10000)`; the fee is the rest. */
export function afterFee(amount: bigint, feeBps: number) {
  const out = (amount * (BPS - BigInt(feeBps))) / BPS;
  return { out, fee: amount - out };
}

/** xStock raw units to dollars at `P × (1 − band)`, before the fee (the mint path). */
export function xstockToUsd(raw: bigint, multE12: bigint, priceE8: bigint, bandBps: number, decimals: number): bigint {
  const n = raw * multE12 * priceE8 * (BPS - BigInt(bandBps)) * USD_ONE;
  const d = pow10(decimals) * MULT_ONE * PRICE_ONE * BPS;
  return u64(n / d);
}

/** Dollars (after the fee) to xStock raw units at `P × (1 + band)` (the redeem path). */
export function usdToXstock(usd: bigint, multE12: bigint, priceE8: bigint, bandBps: number, decimals: number): bigint {
  const n = usd * pow10(decimals) * MULT_ONE * PRICE_ONE * BPS;
  const d = USD_ONE * multE12 * priceE8 * (BPS + BigInt(bandBps));
  if (d === 0n) fail("MathOverflow");
  return u64(n / d);
}

/** The mid value of xStock raw units in dollars: `raw × M × P` (the reserve's valuation). */
export const xstockValue = (raw: bigint, multE12: bigint, priceE8: bigint, decimals: number) => xstockToUsd(raw, multE12, priceE8, 0, decimals);

/** Raw units worth `usd` at the mid price. */
export const usdToXstockMid = (usd: bigint, multE12: bigint, priceE8: bigint, decimals: number) => usdToXstock(usd, multE12, priceE8, 0, decimals);

/** An hourly bucket's level at `now`: `min(cap, available + cap × elapsed / 3600)`. */
export function bucketLevel(available: bigint, updatedAt: Time, cap: bigint, now: Time): bigint {
  const elapsed = BigInt(now) - BigInt(updatedAt);
  const level = available + (cap * (elapsed > 0n ? elapsed : 0n)) / 3_600n;
  return level < cap ? level : cap;
}

/** Shares for assets: `floor(assets × shares / total)`, 1:1 for the first. */
export const sharesFor = (assets: bigint, total: bigint, shares: bigint) => (shares === 0n || total === 0n ? assets : (assets * shares) / total);

/** Assets for shares: `floor(shares × total / totalShares)`. */
export const assetsFor = (shares: bigint, total: bigint, totalShares: bigint) => (totalShares === 0n ? 0n : (shares * total) / totalShares);

/** Assets for shares rounded up (the fee tier's measure of a stake). */
export const assetsForUp = (shares: bigint, total: bigint, totalShares: bigint) => (totalShares === 0n ? 0n : (shares * total + totalShares - 1n) / totalShares);

/** Linear vesting of `amount` between `start` and `end`. */
export function vested(amount: bigint, start: Time, end: Time, now: Time): bigint {
  const [s, e, n] = [BigInt(start), BigInt(end), BigInt(now)];
  if (n >= e || e <= s) return amount;
  if (n <= s) return 0n;
  return (amount * (n - s)) / (e - s);
}

/** `x × num / den`, rounded down. */
export function mulDiv(x: bigint, num: bigint, den: bigint): bigint {
  if (den === 0n) fail("MathOverflow");
  return u64((x * num) / den);
}

/** A Pyth price `mantissa × 10^expo` at 1e8, rounded down. */
export function priceE8(mantissa: bigint, expo: number): bigint {
  if (mantissa <= 0n) fail("InvalidPythPrice");
  const shift = 8 + expo;
  let v: bigint;
  if (shift >= 0) {
    if (shift > 30) fail("InvalidPythPrice");
    v = mantissa * pow10(shift);
    if (v > U128_MAX) fail("MathOverflow");
  } else {
    if (shift < -30) fail("InvalidPythPrice");
    v = mantissa / pow10(-shift);
  }
  if (v === 0n || v > U64_MAX) fail("InvalidPythPrice");
  return v;
}

/** A ScaledUiAmount multiplier at 1e12, `floor(m × 1e12 + 0.5)`; null where the program refuses it. */
export function multiplierE12(m: number): bigint | null {
  if (!Number.isFinite(m) || m <= 0 || m > 1e6) return null;
  const r = BigInt(Math.floor(m * 1e12 + 0.5));
  return r === 0n ? null : r;
}

/** What a wallet shows for raw xStock units under a multiplier, at the mint's decimals. */
export const uiAmount = (raw: bigint, multE12: bigint) => (raw * multE12) / MULT_ONE;
/** Raw xStock units for an amount as a wallet shows it. */
export const rawAmount = (ui: bigint, multE12: bigint) => (ui * MULT_ONE) / multE12;

/** The spot share of supply at the targets: `(1 − buffer) × L / (L + 1)`, in bps. */
export function spotShareBps(params: Pick<Params, "leverageBps" | "bufferBps">): bigint {
  const l = BigInt(params.leverageBps[1]);
  const b = BigInt(params.bufferBps[1]);
  return ((BPS - b) * l) / (l + BPS);
}

/** The USDq supply ceiling: the collateral's spot caps over the spot share. */
export function supplyCap(config: Pick<Config, "spotCapTotal" | "params">): bigint {
  const share = spotShareBps(config.params);
  if (share === 0n) return 0n;
  const cap = (config.spotCapTotal * BPS) / share;
  return cap > U64_MAX ? U64_MAX : cap;
}

/** The mint and redeem fee for a holder with `active` stAEQUA (base units). Tiers are whole AEQUA. */
export function feeBps(config: Pick<Config, "params" | "aequa">, active: bigint): number {
  const p = config.params;
  const unit = pow10(config.aequa.decimals);
  let fee = p.baseFeeBps;
  for (let i = 0; i < 2; i++) {
    if (p.tierStake[i] > 0n && active >= p.tierStake[i] * unit) fee = Math.min(fee, p.tierFeeBps[i]);
  }
  return fee;
}

/** The Reserve Fund's target for a supply; fees go to it until it holds this. */
export const reserveFundTarget = (config: Pick<Config, "params">, supply: bigint) => (supply * BigInt(config.params.reserveFundTargetBps)) / BPS;

/** USDC between the chains: `(bridged out − credited) + (withdrawn − landed)`. */
export const inFlight = (r: Pick<Reserve, "bridgedOutTotal" | "landedTotal" | "report">) =>
  r.bridgedOutTotal - r.report.creditedTotal + (r.report.withdrawnTotal - r.landedTotal);

/** Whether the hedge report counts at `now`: its HyperCore time within `freshnessSecs`. */
export const reportFresh = (r: Pick<Reserve, "report">, now: Time, freshnessSecs: number) =>
  r.report.reportedAt > 0n && BigInt(now) * 1000n - r.report.hlTime <= BigInt(freshnessSecs) * 1000n;

/** Whether a collateral's hedge is live: a counting report with its market flag set. */
export const hedgeLive = (r: Pick<Reserve, "report">, index: number, now: Time, freshnessSecs: number) =>
  reportFresh(r, now, freshnessSecs) && (r.report.marketLive & (1 << index)) !== 0;

export type StakeState = "empty" | "active" | "cooling" | "window";

/** Where a stAEQUA position is: cooling for `cooldownSecs`, then a withdraw window, then active again. */
export function stakeState(stake: Pick<AequaStake, "shares" | "cooldownStart">, now: Time, cooldownSecs: number, windowSecs: number = LIMITS.aequaWindowSecs): StakeState {
  if (stake.shares === 0n) return "empty";
  if (stake.cooldownStart === 0n) return "active";
  const opens = stake.cooldownStart + BigInt(cooldownSecs);
  const n = BigInt(now);
  if (n < opens) return "cooling";
  if (n < opens + BigInt(windowSecs)) return "window";
  return "active";
}

/** A constant-product pool's price, quote per AEQUA in whole tokens at 1e12 (what `observe_pool` records). */
export function poolPrice(aequaAmount: bigint, aequaDecimals: number, quoteAmount: bigint, quoteDecimals: number): bigint {
  if (aequaAmount === 0n || quoteAmount === 0n) fail("TwapNotReady");
  return (quoteAmount * pow10(aequaDecimals) * MULT_ONE) / (aequaAmount * pow10(quoteDecimals));
}

/**
 * The TWAP over the last `windowSecs` (twap.rs `average`): needs an observation at or before the
 * window's start, one from the last five minutes and ten inside the window.
 */
export function twapAverage(twap: Pick<Twap, "at" | "cumulative" | "lastPrice" | "head" | "count">, now: Time, windowSecs: number = LIMITS.twapWindowSecs): bigint {
  const ring = twap.at.length;
  const n = BigInt(now);
  if (twap.count === 0) fail("TwapNotReady");
  const nth = (k: number) => (twap.head + ring - 1 - k) % ring;
  const latest = nth(0);
  if (n - twap.at[latest] > BigInt(LIMITS.twapMaxAgeSecs)) fail("TwapNotReady");
  const from = n - BigInt(windowSecs);
  let inside = 0;
  let start = -1;
  for (let k = 0; k < twap.count; k++) {
    const t = twap.at[nth(k)];
    if (t > from) inside++;
    else if (start < 0) start = nth(k);
  }
  if (inside < LIMITS.twapMinSamples || start < 0) fail("TwapNotReady");
  const elapsed = n - twap.at[start] > 1n ? n - twap.at[start] : 1n;
  const gap = n - twap.at[latest];
  const end = twap.cumulative[latest] + twap.lastPrice * (gap > 0n ? gap : 0n);
  return (end - twap.cumulative[start]) / elapsed;
}

/** Dollars per whole AEQUA at 1e12 for a fill of `usd` (6 decimals) against `aequa` base units (buyback.rs `fill_price`). */
export function fillPrice(usd: bigint, aequa: bigint, decimals: number): bigint {
  if (aequa === 0n) fail("TwapBound");
  const v = (usd * pow10(decimals) * MULT_ONE) / (aequa * USD_ONE);
  if (v > U128_MAX) fail("MathOverflow");
  return v;
}

/** Dollars (6 decimals) of `aequa` base units at `priceE12` per whole AEQUA, rounded up (buyback.rs `usd_at`). */
export function usdAt(aequa: bigint, priceE12: bigint, decimals: number): bigint {
  const d = pow10(decimals) * MULT_ONE;
  return u64((aequa * priceE12 * USD_ONE + d - 1n) / d);
}

/** AEQUA base units worth `usd` at `priceE12`, rounded up (deficit.rs `aequa_for_usd`). */
export function aequaForUsd(usd: bigint, priceE12: bigint, decimals: number): bigint {
  if (priceE12 === 0n) fail("TwapNotReady");
  const d = priceE12 * USD_ONE;
  return u64((usd * pow10(decimals) * MULT_ONE + d - 1n) / d);
}

/**
 * AEQUA's dollar price at 1e12 per whole token, as `buyback`, `cover_deficit` and `sell_slashed`
 * take it: the pool's TWAP (`twapAverage`), through the quote asset's Pyth price at 1e8 unless
 * the quote is a dollar (`Config.aequa.quoteFeed` 0).
 */
export const aequaPriceUsd = (twapE12: bigint, quoteE8?: bigint) => (quoteE8 === undefined ? twapE12 : (twapE12 * quoteE8) / PRICE_ONE);

/** The least AEQUA a buyback spending `usd` must bring back: its fill may be at most `boundBps` over the price. */
export function buybackMinOut(usd: bigint, priceE12: bigint, boundBps: number, decimals: number): bigint {
  const ceiling = (priceE12 * (BPS + BigInt(boundBps))) / BPS;
  return (usd * pow10(decimals) * MULT_ONE) / ((ceiling + 1n) * USD_ONE) + 1n;
}

/** The least USDC a slash sale of `aequa` must raise: its fill may be at most `boundBps` under the price. */
export function slashSaleMinOut(aequa: bigint, priceE12: bigint, boundBps: number, decimals: number): bigint {
  const floor = (priceE12 * (BPS - BigInt(boundBps))) / BPS;
  const d = pow10(decimals) * MULT_ONE;
  return (floor * aequa * USD_ONE + d - 1n) / d;
}

/**
 * A distribution's split (distribute.rs `split`): the Reserve Fund's and the protocol's parts
 * round down and sUSDq keeps the rest; with no sUSDq outstanding its part joins the fund's, and
 * what the fund can't take under its target goes to the protocol vault.
 */
export function distributionSplit(amount: bigint, fundShareBps: number, protocolShareBps: number, fundRoom: bigint, stakers: boolean) {
  const fund = (amount * BigInt(fundShareBps)) / BPS;
  const protocol = (amount * BigInt(protocolShareBps)) / BPS;
  const rest = amount - fund - protocol;
  const [toSusdq, wanted] = stakers ? [rest, fund] : [0n, fund + rest];
  const toReserveFund = wanted < fundRoom ? wanted : fundRoom;
  return { toSusdq, toReserveFund, toProtocol: protocol + (wanted - toReserveFund) };
}

