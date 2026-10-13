# @aequa-finance/sdk

TypeScript for building on aequa: USDq, a dollar backed by tokenized S&P 500 and Nasdaq-100
ETFs on Solana and hedged with short index perps on Hyperliquid; sUSDq, staked USDq; and
stAEQUA. It reads the program's state, quotes every path with the program's own arithmetic,
builds its instructions, and lays out, simulates and sends the transactions they go in.
Program `9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL`.

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
const signed = await walletAdapter.signTransaction(built.transaction);
const signature = await client.send(signed, built);
```

Amounts are `bigint` base units everywhere: USDC, USDq and sUSDq carry 6 decimals, the xStocks
8. Prices are dollars at 1e8, ScaledUiAmount multipliers at 1e12, times unix seconds.

## AequaClient

| Method | Does |
|---|---|
| `protocol()` | The whole state in one read (`Protocol`) |
| `position(owner)` | A wallet's balances, cooldown and stAEQUA position (`Position`) |
| `price(feeds)` | A signed update from the price source, parsed |
| `mint({ user, asset, amount, minOut? })` | USDq for `"USDC"`, `"SPYx"`, `"QQQx"` or a listed mint |
| `redeem({ user, asset, amount, minOut? })` | USDq back into USDC or the xStock |
| `stake({ user, amount, minShares?, slippageBps? })` | USDq into sUSDq |
| `send(signed, built?)` | Sends, then polls and resends until it lands or its blockhash expires |

Each action returns a `Built`: the unsigned `transaction`, its `simulation`, `out` and `fee` in
raw units, and on the xStock paths `expiresAt`, the moment the signed price inside stops
counting. Token accounts the action pays into are created in the same transaction when missing.
