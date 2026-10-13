// The user paths end to end: read the state, quote, build the transaction with any token account
// it pays into, carry a fresh signed price on the xStock paths, and simulate. The wallet signs
// what comes back; `send` lands it.

import type { AddressLookupTableAccount, Commitment, Connection, PublicKey, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { COLLATERAL, TOKEN_PROGRAM, USDC_MINT, type XStock } from "./constants.js";
import { AequaError } from "./errors.js";
import * as ix from "./instructions/index.js";
import { PDA } from "./pda.js";
import { feedPrice, parseEnvelope, requireFresh, type PriceSource, type Update } from "./pyth.js";
import * as quote from "./quote.js";
import { feeFor, fetchPosition, fetchProtocol, positionState, type ListedCollateral, type Position, type Protocol } from "./state.js";
import { createAtaIdempotent } from "./token.js";
import { lookupTable, prepare, sendAndConfirm, withPrice, type Simulation } from "./transaction.js";

export type ClientOptions = {
  connection: Connection;
  /** Signed Pyth Pro updates, for the xStock paths (`pythPro`). */
  prices?: PriceSource;
  /** The program's address lookup table, which keeps the xStock paths' transactions small. */
  lookupTable?: PublicKey;
  /** Micro-lamports per compute unit. */
  priorityFee?: number;
  commitment?: Commitment;
};

/** A transaction ready for the user's signature, and what its simulation did. */
export type Built = {
  transaction: VersionedTransaction;
  simulation: Simulation;
  /** What the action pays out, in raw units of what it pays (USDq, USDC, the xStock, sUSDq, AEQUA). */
  out: bigint;
  /** The fee taken, in USDq or USDC raw units (0 where there is none). */
  fee: bigint;
  /** When the signed price inside stops counting (unix ms), on the xStock paths. */
  expiresAt: number | null;
  lastValidBlockHeight: number;
};

/** "USDC", an xStock's symbol, or a listed mint. */
export type Asset = "USDC" | XStock | PublicKey;

export class AequaClient {
  readonly connection: Connection;
  private readonly prices?: PriceSource;
  private readonly tableAddress?: PublicKey;
  private table?: AddressLookupTableAccount;
  private readonly priorityFee: number;
  private readonly commitment: Commitment;

  constructor(o: ClientOptions) {
    this.connection = o.connection;
    this.prices = o.prices;
    this.tableAddress = o.lookupTable;
    this.priorityFee = o.priorityFee ?? 0;
    this.commitment = o.commitment ?? "confirmed";
  }

  /** The protocol's state, read in one go. */
  protocol(): Promise<Protocol> {
    return fetchProtocol(this.connection, this.commitment);
  }

  /** A wallet's balances and positions. */
  async position(owner: PublicKey, protocol?: Protocol): Promise<Position> {
    return fetchPosition(this.connection, protocol ?? (await this.protocol()), owner, this.commitment);
  }

  /** A signed update for `feeds`, parsed. */
  async price(feeds: number[]): Promise<{ envelope: Uint8Array; update: Update }> {
    if (!this.prices) throw new AequaError("NoPriceSource", "the xStock paths need a price source (ClientOptions.prices)");
    const envelope = await this.prices.signed(feeds);
    return { envelope, update: parseEnvelope(envelope) };
  }

  /** Mints USDq with USDC or a listed xStock. `minOut` defaults to the quote. */
  mint(o: { user: PublicKey; asset: Asset; amount: bigint; minOut?: bigint }): Promise<Built> {
    return this.convert("mint", o);
  }

  /** Redeems USDq for USDC or a listed xStock. `minOut` defaults to the quote. */
  redeem(o: { user: PublicKey; asset: Asset; amount: bigint; minOut?: bigint }): Promise<Built> {
    return this.convert("redeem", o);
  }

  /** Stakes USDq for sUSDq. `minShares` defaults to the quote less `slippageBps` (10). */
  async stake(o: { user: PublicKey; amount: bigint; minShares?: bigint; slippageBps?: number }): Promise<Built> {
    const p = await this.protocol();
    const w = await this.position(o.user, p);
    const out = quote.stakeUsdq(p, o.amount);
    const pre = this.create(o.user, [[w.susdq.exists, PDA.susdqMint]]);
    const stake = await ix.stakeUsdq({ user: o.user, amount: o.amount, minShares: o.minShares ?? less(out, o.slippageBps) });
    return this.finish(o.user, [...pre, stake], { out, fee: 0n }, "stake_usdq");
  }

  /**
   * Starts a cooldown for `shares` sUSDq; `out` is the USDq it locks. A cooldown that has ended
   * is claimed first, in the same transaction.
   */
  async unstake(o: { user: PublicKey; shares: bigint }): Promise<Built> {
    const p = await this.protocol();
    const w = await this.position(o.user, p);
    const body: TransactionInstruction[] = [];
    const c = w.usdqCooldown;
    if (c && c.amount > 0n && BigInt(p.now) >= c.unlockAt) body.push(...this.create(o.user, [[w.usdq.exists, PDA.usdqMint]]), await ix.claimUsdq({ user: o.user }));
    body.push(await ix.startUsdqCooldown({ user: o.user, shares: o.shares }));
    return this.finish(o.user, body, { out: quote.unstakeUsdq(p, o.shares), fee: 0n }, "start_usdq_cooldown");
  }

  /** Claims the USDq of a cooldown that has ended. */
  async claim(o: { user: PublicKey }): Promise<Built> {
    const p = await this.protocol();
    const w = await this.position(o.user, p);
    if (!w.usdqCooldown || w.usdqCooldown.amount === 0n) throw new AequaError("NothingToClaim", "no USDq is cooling down for this wallet");
    const body = [...this.create(o.user, [[w.usdq.exists, PDA.usdqMint]]), await ix.claimUsdq({ user: o.user })];
    return this.finish(o.user, body, { out: w.usdqCooldown.amount, fee: 0n }, "claim_usdq");
  }

  /** Stakes AEQUA for stAEQUA. `minShares` defaults to the quote less `slippageBps` (10). */
  async stakeAequa(o: { user: PublicKey; amount: bigint; minShares?: bigint; slippageBps?: number }): Promise<Built> {
    const p = await this.protocol();
    const aequa = p.aequa ?? notSet();
    const out = quote.stakeAequa(p, o.amount);
    const stake = await ix.stakeAequa({ user: o.user, aequa, amount: o.amount, minShares: o.minShares ?? less(out, o.slippageBps) });
    return this.finish(o.user, [stake], { out, fee: 0n }, "stake_aequa");
  }

  /** Starts the cooldown for the whole stAEQUA position. */
  async unstakeAequa(o: { user: PublicKey }): Promise<Built> {
    const p = await this.protocol();
    const w = await this.position(o.user, p);
    if (!w.aequaStake) throw new AequaError("NothingStaked", "this wallet has no stAEQUA position");
    return this.finish(o.user, [await ix.startAequaUnstake({ user: o.user })], { out: 0n, fee: 0n }, "start_aequa_unstake");
  }

  /** Withdraws the position's AEQUA during its window. */
  async withdrawAequa(o: { user: PublicKey }): Promise<Built> {
    const p = await this.protocol();
    const aequa = p.aequa ?? notSet();
    const w = await this.position(o.user, p);
    if (!w.aequaStake) throw new AequaError("NothingStaked", "this wallet has no stAEQUA position");
    if (positionState(p, w.aequaStake) !== "window") throw new AequaError("WindowNotOpen", "the position's withdraw window isn't open");
    const body = [...this.create(o.user, [[!!w.aequa?.exists, aequa.mint, aequa.tokenProgram]]), await ix.withdrawAequa({ user: o.user, aequa })];
    return this.finish(o.user, body, { out: quote.withdrawAequa(p, w.aequaStake.shares), fee: 0n }, "withdraw_aequa");
  }

  /** Sends a signed transaction and waits for it to land; refusals come back as `AequaError`s. */
  send(signed: VersionedTransaction, built?: Pick<Built, "lastValidBlockHeight">): Promise<string> {
    return sendAndConfirm(this.connection, signed, { lastValidBlockHeight: built?.lastValidBlockHeight, commitment: this.commitment });
  }

  private async convert(kind: "mint" | "redeem", o: { user: PublicKey; asset: Asset; amount: bigint; minOut?: bigint }): Promise<Built> {
    const p = await this.protocol();
    const w = await this.position(o.user, p);
    const fee = feeFor(p, w.aequaStake);
    const withStake = !!w.aequaStake;
    if (o.asset === "USDC") {
      const q = kind === "mint" ? quote.mintWithUsdc(o.amount, fee) : quote.redeemForUsdc(o.amount, fee);
      const a = { user: o.user, amount: o.amount, minOut: o.minOut ?? q.out, withStake };
      const body =
        kind === "mint"
          ? [...this.create(o.user, [[w.usdq.exists, PDA.usdqMint]]), await ix.mintWithUsdc(a)]
          : [...this.create(o.user, [[w.usdc.exists, USDC_MINT]]), await ix.redeemForUsdc(a)];
      return this.finish(o.user, body, q, kind === "mint" ? "mint_with_usdc" : "redeem_for_usdc");
    }

    const c = listing(p, o.asset);
    const held = w.xstocks.find((x) => x.mint.equals(c.mint))!;
    const pre = kind === "mint" ? this.create(o.user, [[w.usdq.exists, PDA.usdqMint]]) : this.create(o.user, [[held.exists, c.mint, c.account.tokenProgram]]);
    const { envelope, update } = await this.price([c.account.feed]);
    const freshness = p.config.params.pythFreshnessSecs;
    requireFresh(update, p.now, freshness);
    const price = feedPrice(update, c.account.feed, freshness);
    const q = kind === "mint" ? quote.mintWithCollateral(c, o.amount, price, fee) : quote.redeemForCollateral(c, o.amount, price, fee);
    const a = { user: o.user, mint: c.mint, amount: o.amount, minOut: o.minOut ?? q.out, withStake, xstockTokenProgram: c.account.tokenProgram };
    const body = await withPrice(envelope, (ed25519Index) => (kind === "mint" ? ix.mintWithCollateral : ix.redeemForCollateral)({ ...a, message: envelope, ed25519Index }), pre);
    const built = await this.finish(o.user, body, q, kind === "mint" ? "mint_with_collateral" : "redeem_for_collateral");
    return { ...built, expiresAt: Number(update.timestampUs / 1000n) + freshness * 1000 };
  }

  /** Idempotent creations of the user's token accounts the action pays into, where missing. */
  private create(user: PublicKey, accounts: [exists: boolean, mint: PublicKey, tokenProgram?: PublicKey][]): TransactionInstruction[] {
    return accounts.filter(([exists]) => !exists).map(([, mint, program]) => createAtaIdempotent(user, user, mint, program ?? TOKEN_PROGRAM));
  }

  private async finish(user: PublicKey, instructions: TransactionInstruction[], q: { out: bigint; fee: bigint }, label: string): Promise<Built> {
    if (this.tableAddress && !this.table) this.table = await lookupTable(this.connection, this.tableAddress);
    const { transaction, simulation, blockhash } = await prepare(this.connection, {
      payer: user,
      instructions,
      lookupTables: this.table ? [this.table] : [],
      priorityFee: this.priorityFee,
      label,
    });
    return { transaction, simulation, out: q.out, fee: q.fee, expiresAt: null, lastValidBlockHeight: blockhash.lastValidBlockHeight };
  }
}

const less = (v: bigint, bps = 10) => (v * BigInt(10_000 - bps)) / 10_000n;

const notSet = (): never => {
  throw new AequaError("AequaNotSet", "AEQUA isn't set on the program yet");
};

/** The listing for "SPYx", "QQQx" or a mint; throws if it isn't listed. */
export function listing(p: Protocol, asset: XStock | PublicKey): ListedCollateral {
  const mint = typeof asset === "string" ? COLLATERAL[asset]?.mint : asset;
  const c = mint && p.collateral.find((x) => x.mint.equals(mint));
  if (!c) throw new AequaError("NotListed", `${typeof asset === "string" ? asset : asset.toBase58()} isn't listed`);
  return c;
}
