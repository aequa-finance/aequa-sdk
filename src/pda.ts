// The program's accounts, derived from its id and the seeds in constants.rs, and the other
// derived addresses its instructions name: associated token accounts, Metaplex metadata, the
// program's data account and CCTP's accounts for a burn.

import { PublicKey } from "@solana/web3.js";
import { ATA_PROGRAM, BPF_LOADER_UPGRADEABLE, CCTP, PROGRAM_ID, TOKEN_2022_PROGRAM, TOKEN_METADATA_PROGRAM, TOKEN_PROGRAM, USDC_MINT } from "./constants.js";

const utf8 = (s: string) => new TextEncoder().encode(s);
const find = (program: PublicKey, ...seeds: (string | PublicKey | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(
    seeds.map((s) => (typeof s === "string" ? utf8(s) : "toBytes" in s ? s.toBytes() : s)),
    program,
  )[0];
const at = (...seeds: (string | PublicKey)[]) => find(PROGRAM_ID, ...seeds);

/** An associated token account; the owner may be a PDA. */
export const ata = (mint: PublicKey, owner: PublicKey, tokenProgram: PublicKey = TOKEN_PROGRAM) => find(ATA_PROGRAM, owner, tokenProgram, mint);

const swapAuthority = at("swap_authority");
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
  /** The protocol vault: fees past the Reserve Fund's target and its share of each surplus. */
  protocol: at("protocol"),
  aequaPoolVault: at("aequa_pool_vault"),
  slashSale: at("slash_sale"),
  twap: at("twap"),
  /** Signs every Jupiter swap, through its own associated token accounts (the transit accounts). */
  swapAuthority,
  transitUsdc: ata(USDC_MINT, swapAuthority),
} as const;

export const collateralPda = (mint: PublicKey) => at("collateral", mint);
export const collateralVault = (mint: PublicKey) => at("collateral_vault", mint);
/** The swap authority's transit account for a mint. */
export const transit = (mint: PublicKey, tokenProgram: PublicKey = TOKEN_2022_PROGRAM) => ata(mint, swapAuthority, tokenProgram);
export const usdqCooldown = (owner: PublicKey) => at("susdq_cooldown", owner);
export const aequaStake = (owner: PublicKey) => at("aequa_stake", owner);

/** A mint's Metaplex metadata account. */
export const metadata = (mint: PublicKey) => find(TOKEN_METADATA_PROGRAM, "metadata", TOKEN_METADATA_PROGRAM, mint);
/** The program's data account under the upgradeable loader (`initialize` reads its authority). */
export const programData = () => find(BPF_LOADER_UPGRADEABLE, PROGRAM_ID);

/** CCTP V2's accounts for a USDC burn by `owner` towards HyperEVM (`bridge_out`: the buffer). */
export function cctpBurnAccounts(owner: PublicKey = PDA.buffer) {
  const tmm = CCTP.tokenMessengerMinter;
  return {
    senderAuthority: find(tmm, "sender_authority"),
    denylist: find(tmm, "denylist_account", owner),
    messageTransmitter: find(CCTP.messageTransmitter, "message_transmitter"),
    tokenMessenger: find(tmm, "token_messenger"),
    remoteTokenMessenger: find(tmm, "remote_token_messenger", String(CCTP.hyperEvmDomain)),
    tokenMinter: find(tmm, "token_minter"),
    localToken: find(tmm, "local_token", USDC_MINT),
    eventAuthority: find(tmm, "__event_authority"),
  };
}
