# @aequa-finance/sdk

TypeScript for building on aequa: USDq, a dollar backed by tokenized S&P 500 and Nasdaq-100
ETFs on Solana and hedged with short index perps on Hyperliquid; sUSDq, staked USDq; and
stAEQUA. It reads the program's state, quotes every path with the program's own arithmetic,
builds each of its 37 instructions, and lays out, simulates and sends the transactions they go
in. Program `9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL`.

```bash
npm install @aequa-finance/sdk @solana/web3.js
```

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
| USDq | Minted for USDC 1:1, or for SPYx or QQQx at a signed Pyth Pro price less the session's band; redeemed the same ways. A fee of 10 bps, lower with active stAEQUA. Each path draws on an hourly bucket that refills continuously; supply has a ceiling set by the collateral's spot caps. |
| sUSDq | USDq staked for shares. Every 8 hours `distribute` mints the reserve's surplus, most of it to sUSDq, vesting over the next interval. Unstaking starts a 7-day cooldown, then `claim`. |
| stAEQUA | AEQUA staked for shares. Half of each buyback streams to it; it sets the fee tier and Realms voting weight. Unstaking cools for 10 days, then opens a 2-day withdraw window. |
| xStock paths | Need a signed Pyth Pro update in an open session, a fresh hedge report with that market live, and the mint outside a corporate-action window and not paused by its issuer. |

## AequaClient

| Method | Does |
|---|---|
| `protocol()` | The whole state in one read (`Protocol`) |
| `position(owner)` | A wallet's balances, cooldown and stAEQUA position (`Position`) |
| `price(feeds)` | A signed update from the price source, parsed |
| `mint({ user, asset, amount, minOut? })` | USDq for `"USDC"`, `"SPYx"`, `"QQQx"` or a listed mint |
| `redeem({ user, asset, amount, minOut? })` | USDq back into USDC or the xStock |
| `stake({ user, amount, minShares?, slippageBps? })` | USDq into sUSDq |
| `unstake({ user, shares })` | Starts a cooldown; one that has ended is claimed first in the same transaction |
| `claim({ user })` | The USDq of an ended cooldown |
| `stakeAequa`, `unstakeAequa`, `withdrawAequa` | The stAEQUA position |
| `send(signed, built?)` | Sends, then polls and resends until it lands or its blockhash expires |

Each action returns a `Built`: the unsigned `transaction`, its `simulation` (compute units, logs,
the events it emitted), `out` and `fee` in raw units, and on the xStock paths `expiresAt`, the
moment the signed price inside stops counting. `minOut` defaults to the exact quote.

Token accounts the action pays into are created in the same transaction when missing. Give the
client the program's lookup table (`lookupTable`) to keep the xStock paths' transactions small.

## Reading state

```ts
import { fetchProtocol, fetchPosition, feeFor, usdcMintRoom, collateralRoom, susdqRate, nav } from "@aequa-finance/sdk";

const p = await fetchProtocol(connection);  // one read with Solana's clock
p.now;                     // the chain's unix time at that slot; derived values use it
p.config.params;           // every governance parameter
p.collateral[0].mintInfo;  // multiplier in force, issuer pause, corporate-action window
usdcMintRoom(p);           // USDC mint capacity left this hour, under the supply ceiling
```

`feeFor`, `usdqSupplyCap`, `collateralRoom`, `xstockMintRoom`, `susdqRate`, `positionState`,
`hedgeReportFresh`, `nextDistribution`, `nav` and `distributionPreview` read what the state says.

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

## Governance

stAEQUA votes in Realms through the program's voter-weight plugin. A record holds the voter's
active stAEQUA for the slot it was updated in, so `updateVoterWeightRecord` goes in the same
transaction as the vote or proposal; `createVoterWeightRecord` makes the record once per realm.
