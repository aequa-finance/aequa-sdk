# @aequa-finance/sdk

TypeScript for building on aequa: USDq, a dollar backed by tokenized S&P 500 and Nasdaq-100
ETFs on Solana and hedged with short index perps on Hyperliquid; sUSDq, staked USDq; and
stAEQUA. It reads the program's state, quotes every path with the program's own arithmetic,
builds each of its 37 instructions, and lays out, simulates and sends the transactions they go
in. Program `9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL`, Anchor 1.2.1.

```bash
npm install @aequa-finance/sdk @solana/web3.js
```

ESM with type declarations, for Node 20.18 or later and for browsers through a bundler; it
uses nothing of Node's. It targets the program on mainnet: mainnet's USDC, xStocks, Pyth Pro,
CCTP and Jupiter.

## Quickstart

```ts
import { Connection, PublicKey } from "@solana/web3.js";
import { AequaClient, pythPro } from "@aequa-finance/sdk";

const client = new AequaClient({
  connection: new Connection(RPC_URL, "confirmed"),
  prices: pythPro({ token: PYTH_PRO_KEY }), // for the xStock paths
});

const protocol = await client.protocol();
const wallet = await client.position(owner);

// Mint 1,000 USDq with USDC: built, simulated, ready for the wallet.
const built = await client.mint({ user: owner, asset: "USDC", amount: 1_000_000_000n });
built.out; // USDq the program will pay, raw units
const signed = await walletAdapter.signTransaction(built.transaction);
const signature = await client.send(signed, built);
```

Amounts are `bigint` base units everywhere: USDC, USDq and sUSDq carry 6 decimals, the xStocks
8, AEQUA its mint's. Prices are dollars at 1e8, ScaledUiAmount multipliers at 1e12, times unix
seconds unless a name says milliseconds.

## How aequa works, for a builder

| | |
|---|---|
| USDq | Minted for USDC 1:1, or for SPYx or QQQx at a signed Pyth Pro price less the session's band; redeemed the same ways. A fee of 10 bps, lower with active stAEQUA (5 and 2 bps tiers). Each path draws on an hourly bucket that refills continuously; supply has a ceiling set by the collateral's spot caps. |
| sUSDq | USDq staked for shares. Every 8 hours `distribute` mints the reserve's surplus over a 25 bps cushion, up to 5 bps of supply a day, 80% of it to sUSDq, vesting over the next interval, so the rate rises second by second. Unstaking starts a 7-day cooldown, then `claim`. |
| stAEQUA | AEQUA staked for shares. Half of each buyback streams to it; it sets the fee tier and Realms voting weight. Unstaking cools for 10 days, then opens a 2-day withdraw window. |
| xStock paths | Need a signed Pyth Pro update in an open session (regular, pre, post, overnight), a fresh hedge report with that market live, and the mint outside a corporate-action window and not paused by its issuer. |
| Pauses | Each path is a bit of `Config.paused` (`PATH`); a listing can be paused on its own. |

## AequaClient

| Method | Does |
|---|---|
| `protocol()` | The whole state in one read (`Protocol`) |
| `position(owner)` | A wallet's balances, cooldown and stAEQUA position (`Position`) |
| `price(feeds)` | A signed update from the price source, parsed |
| `mint({ user, asset, amount, minOut? })` | USDq for `"USDC"`, `"SPYx"`, `"QQQx"` or a listed mint |
| `redeem({ user, asset, amount, minOut? })` | USDq back into USDC or the xStock |
| `stake({ user, amount, minShares?, slippageBps? })` | USDq into sUSDq |
| `unstake({ user, shares, restartCooldown? })` | Starts a cooldown; one that has ended is claimed first in the same transaction. One still running would take the new USDq and start its 7 days again, so that needs `restartCooldown: true` |
| `claim({ user })` | The USDq of an ended cooldown |
| `stakeAequa`, `unstakeAequa`, `withdrawAequa` | The stAEQUA position |
| `send(signed, built?)` | Sends, then polls and resends until it lands or its blockhash expires |

Each action returns a `Built`: the unsigned `transaction`, its `simulation` (compute units, logs,
the events it emitted), `out` and `fee` in raw units, and on the xStock paths `expiresAt`, the
moment the signed price inside stops counting (10 s after Pyth signed it). `minOut` defaults to
the exact quote: on the USDC and xStock paths the program pays exactly that. The stake paths
leave `slippageBps` (10) of room, since vesting moves their rates every second.

Token accounts the action pays into are created in the same transaction when missing. Give the
client the program's lookup table (`lookupTable`) to keep the xStock paths' transactions small.

## Reading state

```ts
import { fetchProtocol, fetchPosition, feeFor, usdcMintRoom, collateralRoom, susdqRate, nav } from "@aequa-finance/sdk";

const p = await fetchProtocol(connection);  // one read with Solana's clock; a second once AEQUA is set or a third listing exists
p.now;                     // the chain's unix time at that slot; derived values use it
p.config.params;           // every governance parameter
p.collateral[0].mintInfo;  // multiplier in force, issuer pause, corporate-action window
usdcMintRoom(p);           // USDC mint capacity left this hour, under the supply ceiling
```

| Helper | Returns |
|---|---|
| `feeFor(p, stake)` | The holder's fee in bps |
| `usdqSupplyCap(p)`, `usdcMintRoom(p)`, `collateralRoom(c, now)` | Ceiling and hourly room per path |
| `xstockMintRoom(p, c, priceE8)` | The value an xStock can mint now: its bucket, its spot cap at that price, the ceiling |
| `susdqAssets(p)`, `susdqRate(p)` | USDq behind sUSDq, and USDq per sUSDq at 1e6 |
| `aequaPoolAssets(p)`, `positionState(p, stake)` | stAEQUA's AEQUA, and a position's `active` / `cooling` / `window` |
| `hedgeReportFresh(p)`, `collateralHedgeLive(p, c)` | Whether the xStock paths' hedge condition holds |
| `pathOpen(p, PATH.X)` | Whether a path is open |
| `nextDistribution(p)` | When `distribute` is next due |
| `nav(p, pricesE8)` | NAV as `distribute` values it |
| `distributionPreview(p, pricesE8)` | What `distribute` would mint and where it goes, or burn against a shortfall |

Accounts decode to plain values: every u64, i64 and u128 as `bigint`, every key as `PublicKey`
(`decodeAccount("config", data)`; types `Config`, `Reserve`, `Collateral`, `UsdqVault`,
`AequaPool`, `AequaStake`, `UsdqCooldown`, `Twap`, `VoterWeightRecord`, `MaxVoterWeightRecord`).
`aequaProgram(connection)` is a full Anchor client when you want one.

## Quotes and the program's arithmetic

`quote.mintWithUsdc`, `quote.redeemForUsdc`, `quote.mintWithCollateral(c, amount, price, feeBps)`,
`quote.redeemForCollateral(...)`, `quote.stakeUsdq(p, amount)`, `quote.unstakeUsdq(p, shares)`,
`quote.stakeAequa`, `quote.withdrawAequa`: each computes what the instruction pays, the way it
computes it. Beneath them, `math` ports `math.rs` function for function (`afterFee`,
`xstockToUsd`, `usdToXstock`, `xstockValue`, `bucketLevel`, `sharesFor`, `assetsFor`, `vested`,
`priceE8`, `multiplierE12`, `supplyCap`, `feeBps`, `twapAverage`, `poolPrice`, `stakeState`,
`distributionSplit`, …), failing with the program's error names where the program fails. For the
AEQUA cranks: `aequaPriceUsd` (the TWAP in dollars), `fillPrice`, `usdAt`, `aequaForUsd`, and
`buybackMinOut` and `slashSaleMinOut`, the least a route may return and still clear the TWAP
bound.

## Instructions

`instructions` has one builder per instruction. Each takes plain values, fills in every
account, and returns the `TransactionInstruction` without touching the network.

| Who | Builders |
|---|---|
| Users | `mintWithUsdc`, `redeemForUsdc`, `mintWithCollateral`, `redeemForCollateral`, `stakeUsdq`, `startUsdqCooldown`, `claimUsdq`, `stakeAequa`, `startAequaUnstake`, `withdrawAequa` |
| Anyone (cranks) | `distribute`, `landUsdc`, `buyback`, `coverDeficit`, `sellSlashed` |
| Keeper | `swap`, `bridgeOut`, `observePool` |
| Reporter | `reportHedge` |
| Admin | `initialize`, `createVaults`, `createSusdqVaults`, `addCollateral`, `setCollateral`, `setParams`, `setRoles`, `acceptAdmin`, `setBridgeRoute`, `setTokenMetadata`, `unpause`, `unpauseCollateral`, `setAequa` |
| Guardian or admin | `pause` |
| Governance | `createVoterWeightRecord`, `updateVoterWeightRecord`, `createMaxVoterWeightRecord`, `updateMaxVoterWeightRecord` |

```ts
import { instructions, withPrice, prepare, sendAndConfirm } from "@aequa-finance/sdk";

const message = await prices.signed([1398]); // SPY's feed
const ixs = await withPrice(message, (ed25519Index) =>
  instructions.mintWithCollateral({ user, mint: SPYX, amount, minOut, message, ed25519Index }),
);
const { transaction, blockhash } = await prepare(connection, { payer: user, instructions: ixs, lookupTables });
```

Pass `withStake: true` on the four mint and redeem builders when the user has a stAEQUA
position, for the fee tier.

## Transactions

Every transaction starts with two compute-budget instructions. A priced instruction carries its
signed update as its first argument and comes right after the ed25519 instruction that checks
it; the program is told that instruction's index. `withPrice(envelope, build, before)` lays this
out: the check lands at `2 + before.length`. Wallets keep a compute budget that is already there
and add their own instructions after the last one, so the index holds through signing.

| | |
|---|---|
| `compose` | A v0 transaction with the compute budget first |
| `simulate` | Units, logs and events, or an `AequaError` naming the refusal |
| `prepare` | Simulates, sets the compute units from it, optionally signs |
| `sendAndConfirm` | Sends with the node's check first, then polls and resends until it lands |
| `sendFresh` | Builds again for each attempt: a fresh price after a `StalePrice`, a fresh blockhash after an expiry |
| `lookupTableAddresses(listing?)` | Every address the program's transactions reuse: the lookup table's contents, for the launch listing or the one given |

## Prices

The xStock paths, the keeper's swap and `distribute` take a Pyth Pro update signed for Solana:
one feed per ETF (SPY 1398, QQQ 1363), on a channel of 200 ms or faster, at most
`pythFreshnessSecs` (10) old, with the session it was priced in. `pythPro({ token })` fetches
them from Pyth Pro's REST endpoint; any object with `signed(feeds): Promise<Uint8Array>` works as
a `PriceSource`. `parseEnvelope`, `requireFresh`, `feedPrice` and `isLive` read an update exactly
as the program does.

## Errors

A refusal is an `AequaError` with the logs and a `code`: the program's error name when the logs
show the program raised it; another program's error name, with that program in `program`, when
it came from one it calls (Pyth Lazer, Jupiter, CCTP); `Custom<n>` when only a number is known
(`errorName(n)` reads it as this program's); a runtime error (`BlockhashNotFound`,
`InsufficientFundsForFee`, …); or one the SDK raises:

| Code | When |
|---|---|
| `Expired` | The blockhash ran out before the transaction landed; sending again is safe |
| `Unconfirmed` | Its status couldn't be read after the blockhash ran out; look it up before sending again |
| `TooLarge` | It doesn't fit in a transaction; the program's lookup table makes room |
| `NotListed` | The asset isn't listed |
| `NoPriceSource` | An xStock path without a `PriceSource` |

`err.is("StalePrice")` checks for one of the program's own; `ERRORS` maps each name to its number
and message:

| Code | Name | Message |
|---|---|---|
| 6000 | `ZeroAmount` | Enter an amount |
| 6001 | `InsufficientFunds` | The balance is lower than that |
| 6002 | `SlippageExceeded` | The amount out is below the minimum asked for |
| 6003 | `CapacityExceeded` | This hour's capacity on this path was used in the meantime |
| 6004 | `SupplyCapExceeded` | That would take USDq past its supply ceiling |
| 6005 | `SpotCapExceeded` | That would take this collateral past its spot cap |
| 6006 | `BufferInsufficient` | The buffer holds less than that right now |
| 6007 | `VaultInsufficient` | The vault holds less of this collateral than that |
| 6008 | `CollateralNotLive` | No fresh price for this collateral: the session is closed |
| 6009 | `HedgeNotLive` | The hedge report is stale or the hedge market is paused |
| 6010 | `CorporateActionWindow` | This collateral is inside a corporate-action window |
| 6011 | `IssuerPaused` | The issuer has paused this collateral's mint |
| 6012 | `CollateralNotAdmissible` | The collateral mint fails an admission check |
| 6013 | `StalePrice` | The signed price is older than the freshness limit |
| 6014 | `InvalidPythMessage` | The Pyth message could not be read |
| 6015 | `WrongPythChannel` | The Pyth message is on a channel slower than 200 ms |
| 6016 | `InvalidPythPrice` | The Pyth price is missing or not positive |
| 6017 | `CooldownActive` | The cooldown is still running |
| 6018 | `NothingToClaim` | There is nothing to claim |
| 6019 | `NothingStaked` | There is no stake to unstake |
| 6020 | `PositionCooling` | The position is cooling down |
| 6021 | `WindowNotOpen` | The withdraw window isn't open |
| 6022 | `AequaNotSet` | AEQUA has not been set up yet |
| 6023 | `NotDue` | Not due yet |
| 6024 | `NothingToMove` | Nothing to move |
| 6025 | `DeficitNotHeld` | The deficit has not held long enough |
| 6026 | `SlashCapReached` | The slash cap for the rolling window is used |
| 6027 | `TwapBound` | The fill is outside the bound around the TWAP |
| 6028 | `TwapNotReady` | Not enough price observations for the TWAP |
| 6029 | `ReportOutOfOrder` | The report is older than the last one |
| 6030 | `InvalidRoute` | The swap route is not a Jupiter route over the expected accounts |
| 6031 | `SwapBelowMinimum` | The swap returned less than the Pyth price allows |
| 6032 | `SwapOverspent` | The swap spent more than it was given |
| 6033 | `BridgeNotSet` | The bridge route is not set |
| 6034 | `Unauthorized` | The signer does not hold this role |
| 6035 | `Paused` | This path is paused |
| 6036 | `ParamOutOfRange` | A parameter is outside its hard-coded range |
| 6037 | `TooManyCollaterals` | The collateral list is full |
| 6038 | `CollateralMismatch` | The collateral accounts don't match the listing |
| 6039 | `MathOverflow` | Arithmetic overflow |
| 6040 | `ReportTimeOutOfRange` | The report's HyperCore time is outside the accepted range |

## Events

`parseEvents(logs)` returns the program's events in order, amounts as bigints;
`findEvent(events, "minted")` picks one; `transactionEvents(connection, signature)` reads a
landed transaction's. Live: `connection.onLogs(PROGRAM_ID, ({ logs }) => parseEvents(logs))`.

| Event | Fields |
|---|---|
| `minted` | user, asset, amountIn, usdqOut, fee, feeTo, feeBps, priceE8, session |
| `redeemed` | user, asset, usdqIn, amountOut, fee, feeTo, feeBps, priceE8, session |
| `usdqStaked` | user, usdq, shares |
| `usdqCooldownStarted` | user, shares, usdq, cooling, unlockAt |
| `usdqClaimed` | user, usdq |
| `aequaStaked` | user, aequa, shares |
| `aequaUnstakeStarted` | user, shares, windowOpens, windowCloses |
| `aequaWithdrawn` | user, aequa, shares |
| `distributed` | nav, supply, surplus, amount, toSusdq, toReserveFund, toProtocol, burned, deficitStreak, susdqRateE12, at |
| `boughtBack` | usdqIn, aequaOut, burned, streamed, twapE12 |
| `deficitCovered` | fundBurned, aequa, deficit |
| `slashSold` | aequaIn, usdqOut, burned, toReserveFund |
| `swapped` | collateral, buy, amountIn, amountOut, minOut, priceE8 |
| `bridgedOut` | amount, bridgedOutTotal, message |
| `landed` | amount, landedTotal |
| `hedgeReported` | accountValue, marketLive, creditedTotal, withdrawnTotal, hlTime |
| `paramsChanged` | by |
| `pathsPaused` | by, paused, collateral |

## Cranks

`distribute`, `landUsdc`, `buyback`, `coverDeficit` and `sellSlashed` are open to anyone; the
program decides whether each is due and refuses by name when it isn't (`NotDue`,
`TwapNotReady`, `DeficitNotHeld`, `NothingToMove`). `distribute` takes an update pricing every
listed collateral, signed within 20 s of the latest hedge report's HyperCore time
(`LIMITS.pairingMs`), and each listing's account, mint and vault in `Config` order.
`buyback` and `sellSlashed` take a Jupiter route between the swap authority's transit accounts:
`jupiterRoute({ inputMint, outputMint, amount })` returns it with the lookup tables its
transaction needs beside the program's; `buybackMinOut` and `slashSaleMinOut` say how little it
may return. Past two listings, `distribute` needs the program's lookup table. See
`examples/crank-distribute.ts`.

## Governance

stAEQUA votes in Realms through the program's voter-weight plugin. A record holds the voter's
active stAEQUA for the slot it was updated in, so `updateVoterWeightRecord` goes in the same
transaction as the vote or proposal; `createVoterWeightRecord` makes the record once per realm.
The max voter weight is the whole stAEQUA pool. See `examples/vote-weight.ts`.

## Addresses

| | |
|---|---|
| `PROGRAM_ID` | The program |
| `PDA` | Its accounts: `config`, `reserve`, `usdqMint`, `susdqMint`, `buffer`, `landing`, `reserveFund`, `protocol`, `usdqVault`, `aequaPool`, `twap`, `swapAuthority`, … |
| `collateralPda`, `collateralVault`, `usdqCooldown`, `aequaStake`, `voterWeightRecord`, `maxVoterWeightRecord`, `ata` | Derived per mint or owner |
| `COLLATERAL` | SPYx and QQQx: mint, Pyth Pro feed, decimals, hedge perp |
| `PYTH`, `CCTP`, `JUPITER_PROGRAM`, `USDC_MINT` | What the program calls |
| `IDL` | The program's IDL |

## Development

```bash
npm test               # unit: builders against the IDL, arithmetic, prices, mints, sending, a browser bundle
npm run test:localnet  # the SDK end to end on a local validator
npm run build          # dist/
```

The unit suite checks each of the 37 builders against the IDL: its discriminator, every account
in order with its signer and writable flags, fixed addresses, and the PDAs re-derived from the
IDL's own seeds. The arithmetic runs against the program's test vectors, the Pyth reader against
real Ed25519 signatures, the mint reader against mainnet's SPYx, QQQx and USDC mints; sending,
expiry and retries against a scripted RPC; and a browser bundle runs with no global Buffer.

The localnet run starts `solana-test-validator` in WSL with the program as built and mainnet's
own Token, Token-2022, ATA, Pyth Lazer, Metaplex, CCTP V2, Jupiter and Raydium CLMM programs and
accounts, and a local Pyth Pro signer the Lazer storage trusts. Through the SDK alone it sets the
program up, takes every user path through `AequaClient` with exact quotes, swaps on a captured
Jupiter route, bridges through CCTP, and sends every other instruction: 31 of the 37 land, and
the six that wait on time (a distribution, the TWAP, a cooldown) are refused by name from inside
the instruction, after Anchor has checked every account. Then it runs the examples against the
validator and asks Jupiter's API for a live route. It reads a built checkout of the program
([aequa](https://github.com/aequa-finance/aequa)) from `AEQUA_PROGRAM_DIR`: `target/deploy/aequa.so`
and `tests/fixtures`.

When the program changes, its `scripts/idl.sh <path to aequa-sdk>` copies the IDL into
`src/idl` and writes `src/idl/idl.ts`, the module the SDK loads it from.
