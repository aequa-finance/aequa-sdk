// The program's accounts, derived from its id and the seeds in constants.rs, and the
// associated token accounts its instructions name.

import { PublicKey } from "@solana/web3.js";
import { ATA_PROGRAM, PROGRAM_ID, TOKEN_PROGRAM, USDC_MINT } from "./constants.js";

const utf8 = (s: string) => new TextEncoder().encode(s);
const find = (program: PublicKey, ...seeds: (string | PublicKey | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(
    seeds.map((s) => (typeof s === "string" ? utf8(s) : "toBytes" in s ? s.toBytes() : s)),
    program,
  )[0];
const at = (...seeds: (string | PublicKey)[]) => find(PROGRAM_ID, ...seeds);

/** An associated token account; the owner may be a PDA. */
export const ata = (mint: PublicKey, owner: PublicKey, tokenProgram: PublicKey = TOKEN_PROGRAM) => find(ATA_PROGRAM, owner, tokenProgram, mint);

const landingAuthority = at("landing");

/** The program's singleton accounts. */
export const PDA = {
  config: at("config"),
  reserve: at("reserve"),
  /** sUSDq's state (`UsdqVault`). */
  usdqVault: at("usdq_vault"),
  /** stAEQUA's state (`AequaPool`). */
  aequaPool: at("aequa_pool"),
  usdqMint: at("usdq_mint"),
  susdqMint: at("susdq_mint"),
  /** USDC behind USDq, and the margin the bridge sends from. */
  buffer: at("buffer"),
  landingAuthority,
  /** Where USDC withdrawn from the hedge account arrives; `land_usdc` moves it into the buffer. */
  landing: ata(USDC_MINT, landingAuthority),
  /** USDq behind sUSDq, and USDq in its cooldown. */
  susdqAssets: at("susdq_assets"),
  susdqSilo: at("susdq_silo"),
  reserveFund: at("reserve_fund"),
  protocol: at("protocol"),
  aequaPoolVault: at("aequa_pool_vault"),
  slashSale: at("slash_sale"),
  twap: at("twap"),
} as const;

export const collateralPda = (mint: PublicKey) => at("collateral", mint);
export const collateralVault = (mint: PublicKey) => at("collateral_vault", mint);
export const usdqCooldown = (owner: PublicKey) => at("susdq_cooldown", owner);
export const aequaStake = (owner: PublicKey) => at("aequa_stake", owner);
