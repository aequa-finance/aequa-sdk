// The addresses and numbers the program is built on: its id, the programs it calls and the
// listed collateral. Values come from the program's source (constants.rs, state.rs).

import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL");

export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111");
export const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");

export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/** USDq, sUSDq and USDC carry 6 decimals; dollar amounts inside the program use the same unit. */
export const USD_DECIMALS = 6;
/** Prices are carried at 1e8, ScaledUiAmount multipliers at 1e12. */
export const PRICE_ONE = 100_000_000n;
export const MULT_ONE = 1_000_000_000_000n;
export const BPS = 10_000n;

/** The launch collateral: Backed's xStocks, each with its ETF's Pyth Pro feed. */
export const COLLATERAL = {
  SPYx: { mint: new PublicKey("XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W"), feed: 1398, decimals: 8 },
  QQQx: { mint: new PublicKey("Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ"), feed: 1363, decimals: 8 },
} as const;
export type XStock = keyof typeof COLLATERAL;
export const XSTOCKS = Object.keys(COLLATERAL) as XStock[];
