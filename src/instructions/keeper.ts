// The role-gated operations: the keeper's desk (`swap`, `bridge_out`, `observe_pool`) and the
// reporter's hedge figures (`report_hedge`). Each needs the key `Config` names for the role.

import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { CCTP, JUPITER_PROGRAM, SYSTEM_PROGRAM, TOKEN_2022_PROGRAM, TOKEN_PROGRAM, USDC_MINT } from "../constants.js";
import { cctpBurnAccounts, collateralPda, collateralVault, PDA, transit } from "../pda.js";
import { anchored, program, type ReportArgs } from "../program.js";
import { bn, bytes, pythAccounts, type Priced, type Route } from "./shared.js";

/**
 * Swaps between the buffer and a collateral vault through Jupiter, at no worse than the signed
 * price less the keeper's slippage. `buy`: USDC into the xStock; the route spends `amountIn`
 * between the transit accounts.
 */
export function swap(a: Priced & { keeper: PublicKey; mint: PublicKey; buy: boolean; amountIn: bigint; route: Route; xstockTokenProgram?: PublicKey }): Promise<TransactionInstruction> {
  const xstockTokenProgram = a.xstockTokenProgram ?? TOKEN_2022_PROGRAM;
  return program()
    .methods.swap(bytes(a.message), a.ed25519Index, a.buy, bn(a.amountIn), bytes(a.route.data))
    .accountsStrict({
      keeper: a.keeper,
      config: PDA.config,
      collateral: collateralPda(a.mint),
      mint: a.mint,
      vault: collateralVault(a.mint),
      usdcMint: USDC_MINT,
      buffer: PDA.buffer,
      swapAuthority: PDA.swapAuthority,
      transitUsdc: PDA.transitUsdc,
      transitXstock: transit(a.mint, xstockTokenProgram),
      tokenProgram: TOKEN_PROGRAM,
      xstockTokenProgram,
      jupiterProgram: JUPITER_PROGRAM,
      pyth: pythAccounts(),
    })
    .remainingAccounts(a.route.accounts)
    .instruction();
}

/**
 * Burns `amount` buffer USDC through CCTP V2 to the hedge account on HyperCore, allowing Circle
 * at most `maxFee` (`circleMaxFee`). `messageSentEventData` is a new keypair's address; that
 * keypair signs the transaction too.
 */
export function bridgeOut(a: { keeper: PublicKey; messageSentEventData: PublicKey; amount: bigint; maxFee: bigint; fast: boolean }): Promise<TransactionInstruction> {
  const c = cctpBurnAccounts(PDA.buffer);
  return program()
    .methods.bridgeOut(bn(a.amount), bn(a.maxFee), a.fast)
    .accountsStrict({
      keeper: a.keeper,
      config: PDA.config,
      reserve: PDA.reserve,
      buffer: PDA.buffer,
      usdcMint: USDC_MINT,
      messageSentEventData: a.messageSentEventData,
      senderAuthority: c.senderAuthority,
      denylist: c.denylist,
      messageTransmitter: c.messageTransmitter,
      tokenMessenger: c.tokenMessenger,
      remoteTokenMessenger: c.remoteTokenMessenger,
      tokenMinter: c.tokenMinter,
      localToken: c.localToken,
      cctpEventAuthority: c.eventAuthority,
      messageTransmitterProgram: CCTP.messageTransmitter,
      tokenMessengerMinterProgram: CCTP.tokenMessengerMinter,
      tokenProgram: TOKEN_PROGRAM,
      systemProgram: SYSTEM_PROGRAM,
    })
    .instruction();
}

/** Records the AEQUA pool's price for the TWAP: its two reserve accounts, from `Config.aequa`. */
export function observePool(a: { keeper: PublicKey; poolAequaVault: PublicKey; poolQuoteVault: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.observePool()
    .accountsStrict({ config: PDA.config, keeper: a.keeper, twap: PDA.twap, poolAequaVault: a.poolAequaVault, poolQuoteVault: a.poolQuoteVault })
    .instruction();
}

/** The hedge account's figures, stamped with HyperCore's time (`hlTime`, ms). */
export function reportHedge(a: { reporter: PublicKey; report: ReportArgs }): Promise<TransactionInstruction> {
  return program()
    .methods.reportHedge(anchored(a.report))
    .accountsStrict({ config: PDA.config, reporter: a.reporter, reserve: PDA.reserve })
    .instruction();
}
