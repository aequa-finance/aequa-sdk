// The addresses and numbers the program is built on: its id, the programs and accounts it
// calls, and the listed collateral. Values come from the program's source (constants.rs,
// state.rs, pyth.rs and the instructions).

import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL");

export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111");
export const COMPUTE_BUDGET_PROGRAM = new PublicKey("ComputeBudget111111111111111111111111111111");
export const ED25519_PROGRAM = new PublicKey("Ed25519SigVerify111111111111111111111111111");
export const INSTRUCTIONS_SYSVAR = new PublicKey("Sysvar1nstructions1111111111111111111111111");
export const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");
export const TOKEN_METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const BPF_LOADER_UPGRADEABLE = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
/** Jupiter Aggregator v6: `swap`, `buyback` and `sell_slashed` route through it. */
export const JUPITER_PROGRAM = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/** USDq, sUSDq and USDC carry 6 decimals; dollar amounts inside the program use the same unit. */
export const USD_DECIMALS = 6;
/** Prices are carried at 1e8, ScaledUiAmount multipliers at 1e12. */
export const PRICE_ONE = 100_000_000n;
export const MULT_ONE = 1_000_000_000_000n;
export const BPS = 10_000n;

/** The launch collateral: Backed's xStocks, each with its ETF's Pyth Pro feed and hedge perp. */
export const COLLATERAL = {
  SPYx: { mint: new PublicKey("XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W"), feed: 1398, decimals: 8, perp: "xyz:SP500" },
  QQQx: { mint: new PublicKey("Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ"), feed: 1363, decimals: 8, perp: "xyz:XYZ100" },
} as const;
export type XStock = keyof typeof COLLATERAL;
export const XSTOCKS = Object.keys(COLLATERAL) as XStock[];

/** Pyth Pro (Lazer) on Solana: the program, its storage of trusted signers, and its treasury. */
export const PYTH = {
  program: new PublicKey("pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"),
  storage: new PublicKey("3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"),
  treasury: new PublicKey("Gx4MBPb1vqZLJajZmsKLg8fGw9ErhoKsR8LeKcCKFyak"),
  /** The program takes channels up to 200 ms (real time, 50 ms, 200 ms). */
  channel: "fixed_rate@200ms",
} as const;

/** Circle CCTP V2: the programs `bridge_out` burns through. */
export const CCTP = {
  tokenMessengerMinter: new PublicKey("CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe"),
  messageTransmitter: new PublicKey("CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC"),
  hyperEvmDomain: 19,
} as const;

/** The paths the guardian can pause, as bits of `Config.paused` (state.rs `path`). */
export const PATH = {
  MINT_USDC: 1 << 0,
  REDEEM_USDC: 1 << 1,
  MINT_COLLATERAL: 1 << 2,
  REDEEM_COLLATERAL: 1 << 3,
  STAKE_USDQ: 1 << 4,
  /** `start_usdq_cooldown` and `claim_usdq`. */
  UNSTAKE_USDQ: 1 << 5,
  STAKE_AEQUA: 1 << 6,
  /** `start_aequa_unstake` and `withdraw_aequa`. */
  UNSTAKE_AEQUA: 1 << 7,
  DISTRIBUTE: 1 << 8,
  LAND: 1 << 9,
  BUYBACK: 1 << 10,
  /** `cover_deficit` and `sell_slashed`. */
  COVER_DEFICIT: 1 << 11,
  /** `swap` and `bridge_out`. */
  KEEPER: 1 << 12,
  REPORT: 1 << 13,
  ALL: (1 << 14) - 1,
} as const;

/** US equity sessions as Pyth Pro reports them; each indexes a collateral's `bandsBps`. */
export const SESSION = { REGULAR: 0, PRE: 1, POST: 2, OVERNIGHT: 3, CLOSED: 4 } as const;
