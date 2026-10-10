// The user paths: USDq against USDC or an xStock, sUSDq, and stAEQUA. Token accounts default to
// the user's associated accounts; any account of the right mint and owner works.

import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { SYSTEM_PROGRAM, TOKEN_2022_PROGRAM, TOKEN_PROGRAM, USDC_MINT } from "../constants.js";
import { aequaStake, ata, collateralPda, collateralVault, PDA, usdqCooldown } from "../pda.js";
import { program } from "../program.js";
import { bn, bytes, pythAccounts, type AequaToken, type Priced } from "./shared.js";

/**
 * `withStake`: pass the user's stAEQUA position for the fee tier. The position account must
 * exist (`Position.aequaStake`); without it the base fee applies.
 */
type Fee = { withStake?: boolean };

const feeAccounts = (user: PublicKey, withStake?: boolean) => (withStake ? { aequaStake: aequaStake(user), aequaPool: PDA.aequaPool } : { aequaStake: null, aequaPool: null });

/** USDC in, USDq out 1:1 less the fee. */
export function mintWithUsdc(a: Fee & { user: PublicKey; amount: bigint; minOut: bigint; userUsdc?: PublicKey; userUsdq?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.mintWithUsdc(bn(a.amount), bn(a.minOut))
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      usdqMint: PDA.usdqMint,
      usdcMint: USDC_MINT,
      userUsdc: a.userUsdc ?? ata(USDC_MINT, a.user),
      userUsdq: a.userUsdq ?? ata(PDA.usdqMint, a.user),
      buffer: PDA.buffer,
      reserveFund: PDA.reserveFund,
      protocol: PDA.protocol,
      ...feeAccounts(a.user, a.withStake),
      tokenProgram: TOKEN_PROGRAM,
    })
    .instruction();
}

/** USDq in, USDC out 1:1 less the fee, from the buffer. */
export function redeemForUsdc(a: Fee & { user: PublicKey; amount: bigint; minOut: bigint; userUsdq?: PublicKey; userUsdc?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.redeemForUsdc(bn(a.amount), bn(a.minOut))
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      usdqMint: PDA.usdqMint,
      usdcMint: USDC_MINT,
      userUsdq: a.userUsdq ?? ata(PDA.usdqMint, a.user),
      userUsdc: a.userUsdc ?? ata(USDC_MINT, a.user),
      buffer: PDA.buffer,
      reserveFund: PDA.reserveFund,
      protocol: PDA.protocol,
      ...feeAccounts(a.user, a.withStake),
      tokenProgram: TOKEN_PROGRAM,
    })
    .instruction();
}

type CollateralPath = Fee &
  Priced & {
    user: PublicKey;
    /** The xStock's mint. */
    mint: PublicKey;
    amount: bigint;
    minOut: bigint;
    xstockTokenProgram?: PublicKey;
    userXstock?: PublicKey;
    userUsdq?: PublicKey;
  };

function collateralAccounts(a: CollateralPath) {
  const xstockTokenProgram = a.xstockTokenProgram ?? TOKEN_2022_PROGRAM;
  return {
    user: a.user,
    config: PDA.config,
    reserve: PDA.reserve,
    collateral: collateralPda(a.mint),
    mint: a.mint,
    vault: collateralVault(a.mint),
    userXstock: a.userXstock ?? ata(a.mint, a.user, xstockTokenProgram),
    usdqMint: PDA.usdqMint,
    userUsdq: a.userUsdq ?? ata(PDA.usdqMint, a.user),
    reserveFund: PDA.reserveFund,
    protocol: PDA.protocol,
    ...feeAccounts(a.user, a.withStake),
    tokenProgram: TOKEN_PROGRAM,
    xstockTokenProgram,
    pyth: pythAccounts(),
  };
}

/** An xStock in, USDq out at the signed price less the session's band and the fee. */
export function mintWithCollateral(a: CollateralPath): Promise<TransactionInstruction> {
  return program()
    .methods.mintWithCollateral(bytes(a.message), a.ed25519Index, bn(a.amount), bn(a.minOut))
    .accountsStrict(collateralAccounts(a))
    .instruction();
}

/** USDq in, an xStock out at the signed price plus the session's band, after the fee. */
export function redeemForCollateral(a: CollateralPath): Promise<TransactionInstruction> {
  return program()
    .methods.redeemForCollateral(bytes(a.message), a.ed25519Index, bn(a.amount), bn(a.minOut))
    .accountsStrict(collateralAccounts(a))
    .instruction();
}

/** USDq in, sUSDq out at the vault's rate. */
export function stakeUsdq(a: { user: PublicKey; amount: bigint; minShares: bigint; userUsdq?: PublicKey; userSusdq?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.stakeUsdq(bn(a.amount), bn(a.minShares))
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      usdqVault: PDA.usdqVault,
      usdqMint: PDA.usdqMint,
      susdqMint: PDA.susdqMint,
      userUsdq: a.userUsdq ?? ata(PDA.usdqMint, a.user),
      userSusdq: a.userSusdq ?? ata(PDA.susdqMint, a.user),
      susdqAssets: PDA.susdqAssets,
      tokenProgram: TOKEN_PROGRAM,
    })
    .instruction();
}

/** Burns sUSDq and locks its USDq for the cooldown; another one adds to it and restarts the clock. */
export function startUsdqCooldown(a: { user: PublicKey; shares: bigint; userSusdq?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.startUsdqCooldown(bn(a.shares))
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      usdqVault: PDA.usdqVault,
      usdqMint: PDA.usdqMint,
      susdqMint: PDA.susdqMint,
      userSusdq: a.userSusdq ?? ata(PDA.susdqMint, a.user),
      susdqAssets: PDA.susdqAssets,
      susdqSilo: PDA.susdqSilo,
      cooldown: usdqCooldown(a.user),
      tokenProgram: TOKEN_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** The USDq of a cooldown that has ended. */
export function claimUsdq(a: { user: PublicKey; userUsdq?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.claimUsdq()
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      usdqMint: PDA.usdqMint,
      userUsdq: a.userUsdq ?? ata(PDA.usdqMint, a.user),
      susdqSilo: PDA.susdqSilo,
      cooldown: usdqCooldown(a.user),
      tokenProgram: TOKEN_PROGRAM,
    })
    .instruction();
}

/** AEQUA into the stAEQUA pool; creates the position on the first stake. */
export function stakeAequa(a: { user: PublicKey; aequa: AequaToken; amount: bigint; minShares: bigint; userAequa?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.stakeAequa(bn(a.amount), bn(a.minShares))
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      aequaPool: PDA.aequaPool,
      aequaStake: aequaStake(a.user),
      mint: a.aequa.mint,
      userAequa: a.userAequa ?? ata(a.aequa.mint, a.user, a.aequa.tokenProgram),
      aequaPoolVault: PDA.aequaPoolVault,
      tokenProgram: a.aequa.tokenProgram,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** Starts the whole position's cooldown; the withdraw window opens after it. */
export function startAequaUnstake(a: { user: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.startAequaUnstake()
    .accountsStrict({ user: a.user, config: PDA.config, aequaStake: aequaStake(a.user) })
    .instruction();
}

/** The position's AEQUA during its withdraw window; closes the position. */
export function withdrawAequa(a: { user: PublicKey; aequa: AequaToken; userAequa?: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.withdrawAequa()
    .accountsStrict({
      user: a.user,
      config: PDA.config,
      aequaPool: PDA.aequaPool,
      aequaStake: aequaStake(a.user),
      mint: a.aequa.mint,
      userAequa: a.userAequa ?? ata(a.aequa.mint, a.user, a.aequa.tokenProgram),
      aequaPoolVault: PDA.aequaPoolVault,
      tokenProgram: a.aequa.tokenProgram,
    })
    .instruction();
}
