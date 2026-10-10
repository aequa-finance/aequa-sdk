// The permissionless cranks: anyone may send them, and the program decides whether each one is
// due. `buyback`, `cover_deficit` and `sell_slashed` carry a Pyth update only when AEQUA's pool
// quotes in something other than a dollar (`Config.aequa.quoteFeed`); otherwise the message is
// empty and nothing checks it.

import type { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { JUPITER_PROGRAM, TOKEN_PROGRAM, USDC_MINT } from "../constants.js";
import { collateralPda, collateralVault, PDA, transit } from "../pda.js";
import { program } from "../program.js";
import { bn, bytes, pythAccounts, type AequaToken, type Priced, type Route } from "./shared.js";

/**
 * Values the reserve and mints its surplus or burns against a shortfall. `collateral`: every
 * listed mint in `Config.collaterals` order; the update must price each of them.
 */
export function distribute(a: Priced & { caller: PublicKey; collateral: PublicKey[] }): Promise<TransactionInstruction> {
  const remaining: AccountMeta[] = a.collateral.flatMap((mint) =>
    [collateralPda(mint), mint, collateralVault(mint)].map((pubkey) => ({ pubkey, isSigner: false, isWritable: false })),
  );
  return program()
    .methods.distribute(bytes(a.message), a.ed25519Index)
    .accountsStrict({
      caller: a.caller,
      config: PDA.config,
      reserve: PDA.reserve,
      usdqVault: PDA.usdqVault,
      usdqMint: PDA.usdqMint,
      susdqMint: PDA.susdqMint,
      susdqAssets: PDA.susdqAssets,
      reserveFund: PDA.reserveFund,
      protocol: PDA.protocol,
      buffer: PDA.buffer,
      tokenProgram: TOKEN_PROGRAM,
      pyth: pythAccounts(),
    })
    .remainingAccounts(remaining)
    .instruction();
}

/** Moves USDC withdrawn from the hedge account from the landing account into the buffer. */
export function landUsdc(): Promise<TransactionInstruction> {
  return program()
    .methods.landUsdc()
    .accountsStrict({
      config: PDA.config,
      reserve: PDA.reserve,
      usdcMint: USDC_MINT,
      landingAuthority: PDA.landingAuthority,
      landing: PDA.landing,
      buffer: PDA.buffer,
      tokenProgram: TOKEN_PROGRAM,
    })
    .instruction();
}

type AequaPriced = Partial<Priced> & { caller: PublicKey; aequa: AequaToken };

const swapAccounts = (aequa: AequaToken) => ({
  aequaMint: aequa.mint,
  aequaTokenProgram: aequa.tokenProgram,
  swapAuthority: PDA.swapAuthority,
  transitUsdc: PDA.transitUsdc,
  transitAequa: transit(aequa.mint, aequa.tokenProgram),
  jupiterProgram: JUPITER_PROGRAM,
});

const message = (a: Partial<Priced>) => [bytes(a.message ?? new Uint8Array()), a.ed25519Index ?? 0] as const;

/**
 * Spends `amount` of the protocol vault's USDq on AEQUA through Jupiter, within the TWAP bound:
 * half is burned, half streams to stAEQUA. `route` spends `amount` USDC from the USDC transit
 * account into the AEQUA one.
 */
export function buyback(a: AequaPriced & { amount: bigint; route: Route }): Promise<TransactionInstruction> {
  return program()
    .methods.buyback(...message(a), bn(a.amount), bytes(a.route.data))
    .accountsStrict({
      caller: a.caller,
      config: PDA.config,
      aequaPool: PDA.aequaPool,
      twap: PDA.twap,
      usdqMint: PDA.usdqMint,
      usdcMint: USDC_MINT,
      protocol: PDA.protocol,
      buffer: PDA.buffer,
      aequaPoolVault: PDA.aequaPoolVault,
      tokenProgram: TOKEN_PROGRAM,
      swap: swapAccounts(a.aequa),
      pyth: pythAccounts(),
    })
    .remainingAccounts(a.route.accounts)
    .instruction();
}

/** After a held shortfall: burns the Reserve Fund's USDq, then moves stAEQUA to the slash sale. */
export function coverDeficit(a: AequaPriced): Promise<TransactionInstruction> {
  return program()
    .methods.coverDeficit(...message(a))
    .accountsStrict({
      caller: a.caller,
      config: PDA.config,
      reserve: PDA.reserve,
      aequaPool: PDA.aequaPool,
      usdqMint: PDA.usdqMint,
      twap: PDA.twap,
      mint: a.aequa.mint,
      aequaPoolVault: PDA.aequaPoolVault,
      slashSale: PDA.slashSale,
      reserveFund: PDA.reserveFund,
      tokenProgram: a.aequa.tokenProgram,
      usdqTokenProgram: TOKEN_PROGRAM,
      pyth: pythAccounts(),
    })
    .instruction();
}

/** Sells `amount` slashed AEQUA for USDC through Jupiter, within the slash TWAP bound. */
export function sellSlashed(a: AequaPriced & { amount: bigint; route: Route }): Promise<TransactionInstruction> {
  return program()
    .methods.sellSlashed(...message(a), bn(a.amount), bytes(a.route.data))
    .accountsStrict({
      caller: a.caller,
      config: PDA.config,
      reserve: PDA.reserve,
      aequaPool: PDA.aequaPool,
      twap: PDA.twap,
      usdqMint: PDA.usdqMint,
      usdcMint: USDC_MINT,
      slashSale: PDA.slashSale,
      buffer: PDA.buffer,
      reserveFund: PDA.reserveFund,
      tokenProgram: TOKEN_PROGRAM,
      swap: swapAccounts(a.aequa),
      pyth: pythAccounts(),
    })
    .remainingAccounts(a.route.accounts)
    .instruction();
}
