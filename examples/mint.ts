// Mints USDq with USDC or an xStock, signed by a keypair file: the client reads the state,
// quotes, builds the transaction (creating the USDq account if needed), carries a fresh signed
// price on an xStock path and simulates; the keypair signs; the client sends.
//
//   RPC_URL=<rpc> KEYPAIR=<path to keypair.json> [PYTH_PRO_KEY=<token>] \
//     npx tsx examples/mint.ts <USDC|SPYx|QQQx> <amount in raw units>

import { readFileSync } from "node:fs";
import { Connection, Keypair } from "@solana/web3.js";
import { AequaClient, AequaError, findEvent, pythPro, type Asset } from "@aequa-finance/sdk";

const [asset = "USDC", amount = "1000000"] = process.argv.slice(2);
const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR!, "utf8")) as number[]));
const client = new AequaClient({
  connection: new Connection(process.env.RPC_URL!, "confirmed"),
  prices: process.env.PYTH_PRO_KEY ? pythPro({ token: process.env.PYTH_PRO_KEY, url: process.env.PYTH_PRO_URL }) : undefined,
  priorityFee: 50_000,
});

try {
  const built = await client.mint({ user: signer.publicKey, asset: asset as Asset, amount: BigInt(amount) });
  const minted = findEvent(built.simulation.events, "minted")!;
  console.log(`simulated: ${built.out} USDq out, fee ${built.fee} (${minted.feeBps} bps), ${built.simulation.units} compute units`);
  built.transaction.sign([signer]);
  console.log(`landed: ${await client.send(built.transaction, built)}`);
} catch (e) {
  // A refusal carries the program's own name for it, e.g. "CapacityExceeded" or "CollateralNotLive".
  if (e instanceof AequaError) console.error(`refused: ${e.code} (${e.message})`);
  else throw e;
}
