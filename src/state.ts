// The protocol's state in one read, and a wallet's positions in another. Each read also takes
// Solana's clock, so what is derived from it (buckets, vesting, windows) is what the program
// would compute at that slot.

import { PublicKey, type Commitment, type Connection } from "@solana/web3.js";
import { CLOCK_SYSVAR, COLLATERAL, TOKEN_PROGRAM, USDC_MINT, XSTOCKS, type XStock } from "./constants.js";
import { assetsFor, assetsForUp, bucketLevel, feeBps, hedgeLive, reportFresh, stakeState, supplyCap, vested, type StakeState } from "./math.js";
import { aequaStake, ata, collateralPda, collateralVault, PDA, usdqCooldown } from "./pda.js";
import { decodeAccount, type AequaPool, type AequaStake, type Collateral, type Config, type Reserve, type Twap, type UsdqCooldown, type UsdqVault } from "./program.js";
import { mintSupply, readMint, tokenAmount, type MintInfo } from "./token.js";

export type ListedCollateral = {
  symbol: XStock | undefined;
  mint: PublicKey;
  /** The listing: feed, bands, caps, buckets, index. */
  account: Collateral;
  /** xStock raw units in the vault. */
  vault: bigint;
  /** The mint as the program reads it at `now`. */
  mintInfo: MintInfo;
};

export type Protocol = {
  slot: number;
  /** Solana's clock at `slot`, unix seconds. */
  now: number;
  config: Config;
  reserve: Reserve;
  usdqVault: UsdqVault;
  aequaPool: AequaPool;
  /** AEQUA's price history, once `set_aequa` has run. */
  twap: Twap | null;
  usdqSupply: bigint;
  susdqSupply: bigint;
  /** The program's token accounts, raw units. */
  balances: { buffer: bigint; landing: bigint; reserveFund: bigint; protocol: bigint; susdqAssets: bigint; susdqSilo: bigint; aequaPoolVault: bigint; slashSale: bigint };
  /** The listed collateral, in `Config.collaterals` order. */
  collateral: ListedCollateral[];
  aequa: { mint: PublicKey; tokenProgram: PublicKey; decimals: number; supply: bigint } | null;
};

const SINGLETONS = [
  PDA.config,
  PDA.reserve,
  PDA.usdqVault,
  PDA.aequaPool,
  PDA.usdqMint,
  PDA.susdqMint,
  PDA.buffer,
  PDA.landing,
  PDA.reserveFund,
  PDA.protocol,
  PDA.susdqAssets,
  PDA.susdqSilo,
  PDA.aequaPoolVault,
  PDA.slashSale,
  PDA.twap,
  CLOCK_SYSVAR,
];
const collateralKeys = (mint: PublicKey) => [collateralPda(mint), mint, collateralVault(mint)];
const symbolOf = (mint: PublicKey) => XSTOCKS.find((x) => COLLATERAL[x].mint.equals(mint));

/** The program's whole state. Throws if the program isn't initialized at this RPC. */
export async function fetchProtocol(connection: Connection, commitment: Commitment = "confirmed"): Promise<Protocol> {
  // The launch listings ride along in the first read; anything listed later takes a second.
  const known = XSTOCKS.map((x) => COLLATERAL[x].mint);
  const keys = [...SINGLETONS, ...known.flatMap(collateralKeys)];
  const first = await connection.getMultipleAccountsInfoAndContext(keys, commitment);
  const found = new Map(keys.map((k, i) => [k.toBase58(), first.value[i]?.data ?? null]));
  const data = (k: PublicKey) => found.get(k.toBase58()) ?? null;
  const must = (k: PublicKey, what: string) => data(k) ?? missing(what, k);

  const config = decodeAccount("config", must(PDA.config, "the program's config"));
  const clock = must(CLOCK_SYSVAR, "the clock");
  const now = Number(new DataView(clock.buffer, clock.byteOffset).getBigInt64(32, true));
  const listed = config.collaterals.slice(0, config.collateralCount);
  const aequaSet = !config.aequa.mint.equals(PublicKey.default);
  const more = [...listed.filter((m) => !known.some((k) => k.equals(m))).flatMap(collateralKeys), ...(aequaSet ? [config.aequa.mint] : [])];
  if (more.length) {
    const second = await connection.getMultipleAccountsInfo(more, commitment);
    more.forEach((k, i) => found.set(k.toBase58(), second[i]?.data ?? null));
  }

  const twapData = data(PDA.twap);
  const aequaMint = aequaSet ? data(config.aequa.mint) : null;
  return {
    slot: first.context.slot,
    now,
    config,
    reserve: decodeAccount("reserve", must(PDA.reserve, "the reserve")),
    usdqVault: decodeAccount("usdqVault", must(PDA.usdqVault, "the sUSDq vault")),
    aequaPool: decodeAccount("aequaPool", must(PDA.aequaPool, "the stAEQUA pool")),
    twap: twapData ? decodeAccount("twap", twapData) : null,
    usdqSupply: mintSupply(must(PDA.usdqMint, "the USDq mint")),
    susdqSupply: mintSupply(must(PDA.susdqMint, "the sUSDq mint")),
    balances: {
      buffer: tokenAmount(data(PDA.buffer)),
      landing: tokenAmount(data(PDA.landing)),
      reserveFund: tokenAmount(data(PDA.reserveFund)),
      protocol: tokenAmount(data(PDA.protocol)),
      susdqAssets: tokenAmount(data(PDA.susdqAssets)),
      susdqSilo: tokenAmount(data(PDA.susdqSilo)),
      aequaPoolVault: tokenAmount(data(PDA.aequaPoolVault)),
      slashSale: tokenAmount(data(PDA.slashSale)),
    },
    collateral: listed.map((mint) => ({
      symbol: symbolOf(mint),
      mint,
      account: decodeAccount("collateral", must(collateralPda(mint), "a collateral listing")),
      vault: tokenAmount(data(collateralVault(mint))),
      mintInfo: readMint(must(mint, "a collateral mint"), now),
    })),
    aequa: aequaSet ? { mint: config.aequa.mint, tokenProgram: config.aequa.tokenProgram, decimals: config.aequa.decimals, supply: aequaMint ? mintSupply(aequaMint) : 0n } : null,
  };
}

function missing(what: string, key: PublicKey): never {
  throw new Error(`${what} (${key.toBase58()}) doesn't exist at this RPC: the program isn't set up there`);
}

/** A token account and its balance; `exists` false means an instruction paying into it creates it first. */
export type Balance = { address: PublicKey; amount: bigint; exists: boolean };

export type Position = {
  owner: PublicKey;
  lamports: bigint;
  usdc: Balance;
  usdq: Balance;
  susdq: Balance;
  /** Each listed xStock, in `Protocol.collateral` order. */
  xstocks: (Balance & { mint: PublicKey; symbol: XStock | undefined; tokenProgram: PublicKey })[];
  aequa: Balance | null;
  usdqCooldown: UsdqCooldown | null;
  aequaStake: AequaStake | null;
};

/** A wallet's balances and positions, in one read. */
export async function fetchPosition(connection: Connection, protocol: Protocol, owner: PublicKey, commitment: Commitment = "confirmed"): Promise<Position> {
  const xs = protocol.collateral.map((c) => ({ mint: c.mint, symbol: c.symbol, tokenProgram: c.account.tokenProgram }));
  const tokens: [PublicKey, PublicKey][] = [
    [USDC_MINT, TOKEN_PROGRAM],
    [PDA.usdqMint, TOKEN_PROGRAM],
    [PDA.susdqMint, TOKEN_PROGRAM],
    ...xs.map((x): [PublicKey, PublicKey] => [x.mint, x.tokenProgram]),
    ...(protocol.aequa ? [[protocol.aequa.mint, protocol.aequa.tokenProgram] as [PublicKey, PublicKey]] : []),
  ];
  const addresses = tokens.map(([mint, program]) => ata(mint, owner, program));
  const keys = [owner, usdqCooldown(owner), aequaStake(owner), ...addresses];
  const infos = await connection.getMultipleAccountsInfo(keys, commitment);
  const balance = (i: number): Balance => ({ address: addresses[i], amount: tokenAmount(infos[3 + i]?.data), exists: !!infos[3 + i] });
  const n = xs.length;
  return {
    owner,
    lamports: BigInt(infos[0]?.lamports ?? 0),
    usdc: balance(0),
    usdq: balance(1),
    susdq: balance(2),
    xstocks: xs.map((x, k) => ({ ...x, ...balance(3 + k) })),
    aequa: protocol.aequa ? balance(3 + n) : null,
    usdqCooldown: infos[1] ? decodeAccount("usdqCooldown", infos[1].data) : null,
    aequaStake: infos[2] ? decodeAccount("aequaStake", infos[2].data) : null,
  };
}

/* ── What the state says ─────────────────────────────────────── */

/** USDq behind sUSDq at `now`: the vault's base and what has vested. */
export const susdqAssets = (p: Protocol, now = p.now) => p.usdqVault.base + vested(p.usdqVault.vesting.amount, p.usdqVault.vesting.start, p.usdqVault.vesting.end, now);

/** AEQUA behind stAEQUA at `now`. */
export const aequaPoolAssets = (p: Protocol, now = p.now) => p.aequaPool.base + vested(p.aequaPool.stream.amount, p.aequaPool.stream.start, p.aequaPool.stream.end, now);

/** A stAEQUA position's state: active, cooling, in its withdraw window, or empty. */
export const positionState = (p: Protocol, stake: AequaStake, now = p.now): StakeState => stakeState(stake, now, p.config.params.aequaCooldownSecs);

/** The mint and redeem fee for a holder of `stake`: lower tiers for active stAEQUA. */
export function feeFor(p: Protocol, stake: AequaStake | null, now = p.now): number {
  if (!stake || positionState(p, stake, now) !== "active") return p.config.params.baseFeeBps;
  return feeBps(p.config, assetsForUp(stake.shares, aequaPoolAssets(p, now), p.aequaPool.totalShares));
}

/** The USDq supply ceiling the spot caps set. */
export const usdqSupplyCap = (p: Protocol) => supplyCap(p.config);

/** Whether a path is open (bits of `Config.paused`). */
export const pathOpen = (p: Protocol, bits: number) => (p.config.paused & bits) === 0;

/** The USDC mint capacity left at `now`: the hourly bucket, and the room under the supply ceiling. */
export function usdcMintRoom(p: Protocol, now = p.now): bigint {
  const bucket = bucketLevel(p.config.usdcBucket.available, p.config.usdcBucket.updatedAt, p.config.params.usdcHourlyCap, now);
  const room = usdqSupplyCap(p) - p.usdqSupply;
  return room < bucket ? (room > 0n ? room : 0n) : bucket;
}

/** A listing's hourly capacity left at `now`, in dollars: for its mint path and its redeem path. */
export function collateralRoom(c: ListedCollateral, now: number) {
  const cap = c.account.hourlyCap;
  return {
    mint: bucketLevel(c.account.mintBucket.available, c.account.mintBucket.updatedAt, cap, now),
    redeem: bucketLevel(c.account.redeemBucket.available, c.account.redeemBucket.updatedAt, cap, now),
  };
}

/** Whether the hedge report counts at `now`, and whether a listing's hedge is live (its xStock paths need both). */
export const hedgeReportFresh = (p: Protocol, now = p.now) => reportFresh(p.reserve, now, p.config.params.reportFreshnessSecs);
export const collateralHedgeLive = (p: Protocol, c: ListedCollateral, now = p.now) => hedgeLive(p.reserve, c.account.index, now, p.config.params.reportFreshnessSecs);

/** sUSDq's rate: USDq per sUSDq at 1e6, at `now`. */
export const susdqRate = (p: Protocol, now = p.now) => (p.susdqSupply === 0n ? 1_000_000n : assetsFor(1_000_000n, susdqAssets(p, now), p.susdqSupply));

/** When the next `distribute` is due, unix seconds. */
export const nextDistribution = (p: Protocol) => Number(p.reserve.lastDistribution) + p.config.params.distributionIntervalSecs;
