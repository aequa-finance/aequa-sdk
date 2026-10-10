// Setup and governance: the admin's instructions (a Squads vault after the handoff), the
// guardian's pause, and the one-time `initialize` the upgrade authority signs.

import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { ATA_PROGRAM, PROGRAM_ID, SYSTEM_PROGRAM, TOKEN_2022_PROGRAM, TOKEN_METADATA_PROGRAM, TOKEN_PROGRAM, USDC_MINT } from "../constants.js";
import { collateralPda, collateralVault, metadata, PDA, programData, transit } from "../pda.js";
import { anchored, program, type AequaArgs, type BridgeArgs, type ListingArgs, type Params, type TokenMetadataArgs } from "../program.js";
import type { AequaToken } from "./shared.js";

/** Creates the state and the USDq and sUSDq mints with every path paused. `payer` must be the upgrade authority. */
export function initialize(a: { payer: PublicKey; admin: PublicKey; guardian: PublicKey; keeper: PublicKey; reporter: PublicKey; params: Params }): Promise<TransactionInstruction> {
  return program()
    .methods.initialize(anchored({ admin: a.admin, guardian: a.guardian, keeper: a.keeper, reporter: a.reporter, params: a.params }))
    .accountsStrict({
      payer: a.payer,
      program: PROGRAM_ID,
      programData: programData(),
      config: PDA.config,
      reserve: PDA.reserve,
      usdqVault: PDA.usdqVault,
      aequaPool: PDA.aequaPool,
      usdqMint: PDA.usdqMint,
      susdqMint: PDA.susdqMint,
      usdcMint: USDC_MINT,
      tokenProgram: TOKEN_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/**
 * The buffer, Reserve Fund and protocol vault. The landing and USDC transit accounts are
 * associated accounts created ahead of it (`createAtaIdempotent`), which the program checks.
 */
export function createVaults(a: { payer: PublicKey; admin: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.createVaults()
    .accountsStrict({
      payer: a.payer,
      config: PDA.config,
      admin: a.admin,
      usdqMint: PDA.usdqMint,
      usdcMint: USDC_MINT,
      buffer: PDA.buffer,
      landingAuthority: PDA.landingAuthority,
      landing: PDA.landing,
      swapAuthority: PDA.swapAuthority,
      transitUsdc: PDA.transitUsdc,
      reserveFund: PDA.reserveFund,
      protocol: PDA.protocol,
      tokenProgram: TOKEN_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** sUSDq's two USDq accounts: its assets and the cooldown silo. */
export function createSusdqVaults(a: { payer: PublicKey; admin: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.createSusdqVaults()
    .accountsStrict({
      payer: a.payer,
      config: PDA.config,
      admin: a.admin,
      usdqMint: PDA.usdqMint,
      susdqAssets: PDA.susdqAssets,
      susdqSilo: PDA.susdqSilo,
      tokenProgram: TOKEN_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** Lists an xStock. Its transit account (the swap authority's associated account) is created ahead of it. */
export function addCollateral(a: { payer: PublicKey; admin: PublicKey; mint: PublicKey; listing: ListingArgs; tokenProgram?: PublicKey }): Promise<TransactionInstruction> {
  const tokenProgram = a.tokenProgram ?? TOKEN_2022_PROGRAM;
  return program()
    .methods.addCollateral(anchored(a.listing))
    .accountsStrict({
      payer: a.payer,
      config: PDA.config,
      admin: a.admin,
      mint: a.mint,
      collateral: collateralPda(a.mint),
      vault: collateralVault(a.mint),
      swapAuthority: PDA.swapAuthority,
      transit: transit(a.mint, tokenProgram),
      tokenProgram,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** Changes a listing: its feed, bands, caps and hedge market. */
export function setCollateral(a: { admin: PublicKey; mint: PublicKey; listing: ListingArgs }): Promise<TransactionInstruction> {
  return program()
    .methods.setCollateral(anchored(a.listing))
    .accountsStrict({ config: PDA.config, admin: a.admin, collateral: collateralPda(a.mint) })
    .instruction();
}

/** Every parameter at once, each inside its range; a cap may at most double per change. */
export function setParams(a: { admin: PublicKey; params: Params }): Promise<TransactionInstruction> {
  return program().methods.setParams(anchored(a.params)).accountsStrict({ config: PDA.config, admin: a.admin }).instruction();
}

/** The guardian, keeper and reporter keys, and a pending admin who then calls `acceptAdmin`. */
export function setRoles(a: { admin: PublicKey; guardian: PublicKey; keeper: PublicKey; reporter: PublicKey; pendingAdmin: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.setRoles(a.guardian, a.keeper, a.reporter, a.pendingAdmin)
    .accountsStrict({ config: PDA.config, admin: a.admin })
    .instruction();
}

export function acceptAdmin(a: { pendingAdmin: PublicKey }): Promise<TransactionInstruction> {
  return program().methods.acceptAdmin().accountsStrict({ config: PDA.config, pendingAdmin: a.pendingAdmin }).instruction();
}

/** The HyperCore account `bridge_out` credits, and the fee cap (`bridgeArgs`). */
export function setBridgeRoute(a: { admin: PublicKey; route: BridgeArgs }): Promise<TransactionInstruction> {
  return program().methods.setBridgeRoute(anchored(a.route)).accountsStrict({ config: PDA.config, admin: a.admin }).instruction();
}

/** Metaplex metadata for USDq or sUSDq. */
export function setTokenMetadata(a: { payer: PublicKey; admin: PublicKey; mint: PublicKey; token: TokenMetadataArgs }): Promise<TransactionInstruction> {
  return program()
    .methods.setTokenMetadata(a.token)
    .accountsStrict({
      payer: a.payer,
      config: PDA.config,
      admin: a.admin,
      usdqVault: PDA.usdqVault,
      mint: a.mint,
      metadata: metadata(a.mint),
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** Pauses `paths` (`PATH` bits) and, with `collateral`, that listing. The guardian or the admin signs. */
export function pause(a: { signer: PublicKey; paths: number; collateral?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.pause(a.paths)
    .accountsStrict({ config: PDA.config, signer: a.signer, collateral: a.collateral ? collateralPda(a.collateral) : null })
    .instruction();
}

export function unpause(a: { admin: PublicKey; paths: number }): Promise<TransactionInstruction> {
  return program().methods.unpause(a.paths).accountsStrict({ config: PDA.config, admin: a.admin }).instruction();
}

export function unpauseCollateral(a: { admin: PublicKey; mint: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.unpauseCollateral()
    .accountsStrict({ config: PDA.config, admin: a.admin, collateral: collateralPda(a.mint) })
    .instruction();
}

/**
 * The AEQUA token, once; later calls with the same mint may move the pool the TWAP reads.
 * `quote`: the pool's quote mint and token program; `pool` names the pool and its two reserve
 * accounts, and `quoteFeed` the quote's Pyth Pro feed (0 for a dollar).
 */
export function setAequa(a: { payer: PublicKey; admin: PublicKey; aequa: AequaToken; quote: AequaToken; pool: AequaArgs }): Promise<TransactionInstruction> {
  return program()
    .methods.setAequa(anchored(a.pool))
    .accountsStrict({
      payer: a.payer,
      config: PDA.config,
      admin: a.admin,
      mint: a.aequa.mint,
      quoteMint: a.quote.mint,
      poolAequaVault: a.pool.poolAequaVault,
      poolQuoteVault: a.pool.poolQuoteVault,
      aequaPoolVault: PDA.aequaPoolVault,
      slashSale: PDA.slashSale,
      twap: PDA.twap,
      swapAuthority: PDA.swapAuthority,
      transitAequa: transit(a.aequa.mint, a.aequa.tokenProgram),
      tokenProgram: a.aequa.tokenProgram,
      quoteTokenProgram: a.quote.tokenProgram,
      associatedTokenProgram: ATA_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}
