// What each user path pays, computed the way the instruction computes it. A quote is exact for
// the state it reads; the sUSDq and stAEQUA rates move with vesting, second by second.

import { afterFee, assetsFor, sharesFor, usdToXstock, xstockToUsd } from "./math.js";
import { aequaPoolAssets, susdqAssets, type ListedCollateral, type Protocol } from "./state.js";

/** A signed price as the program takes it (`feedPrice`). */
export type Price = { priceE8: bigint; session: number };

/** USDC in, USDq out. */
export const mintWithUsdc = (amount: bigint, feeBps: number) => afterFee(amount, feeBps);

/** USDq in, USDC out. */
export const redeemForUsdc = (amount: bigint, feeBps: number) => afterFee(amount, feeBps);

/** xStock raw units in: their value at the price less the session's band, then USDq out after the fee. */
export function mintWithCollateral(c: ListedCollateral, amount: bigint, price: Price, feeBps: number) {
  const value = xstockToUsd(amount, c.mintInfo.multiplierE12, price.priceE8, c.account.bandsBps[price.session], c.mintInfo.decimals);
  return { value, ...afterFee(value, feeBps) };
}

/** USDq in: the fee, then xStock raw units out at the price plus the session's band. */
export function redeemForCollateral(c: ListedCollateral, amount: bigint, price: Price, feeBps: number) {
  const { out: net, fee } = afterFee(amount, feeBps);
  return { net, fee, out: usdToXstock(net, c.mintInfo.multiplierE12, price.priceE8, c.account.bandsBps[price.session], c.mintInfo.decimals) };
}

/** USDq in, sUSDq out. */
export const stakeUsdq = (p: Protocol, amount: bigint, now = p.now) => sharesFor(amount, susdqAssets(p, now), p.susdqSupply);

/** sUSDq in, the USDq its cooldown locks. */
export const unstakeUsdq = (p: Protocol, shares: bigint, now = p.now) => assetsFor(shares, susdqAssets(p, now), p.susdqSupply);

/** AEQUA in, stAEQUA shares out. */
export const stakeAequa = (p: Protocol, amount: bigint, now = p.now) => sharesFor(amount, aequaPoolAssets(p, now), p.aequaPool.totalShares);

/** A position's shares, the AEQUA they withdraw. */
export const withdrawAequa = (p: Protocol, shares: bigint, now = p.now) => assetsFor(shares, aequaPoolAssets(p, now), p.aequaPool.totalShares);
