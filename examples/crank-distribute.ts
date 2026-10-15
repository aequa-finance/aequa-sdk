// A permissionless crank: `distribute` once it is due, with every listed collateral priced and
// the price paired with the latest hedge report. Anyone may send it; the program checks the rest.
//
//   RPC_URL=<rpc> KEYPAIR=<path> PYTH_PRO_KEY=<token> LOOKUP_TABLE=<the program's table> \
//     npx tsx examples/crank-distribute.ts

import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { fetchProtocol, hedgeReportFresh, instructions, isLive, LIMITS, lookupTable, nextDistribution, parseEnvelope, pythPro, sendFresh, withPrice } from "@aequa-finance/sdk";

const connection = new Connection(process.env.RPC_URL!, "confirmed");
const caller = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR!, "utf8")) as number[]));
const prices = pythPro({ token: process.env.PYTH_PRO_KEY!, url: process.env.PYTH_PRO_URL });

const p = await fetchProtocol(connection);
const feeds = p.collateral.map((c) => c.account.feed);
if (p.now < nextDistribution(p)) {
  console.log(`not due until ${new Date(nextDistribution(p) * 1000).toISOString()}`);
} else if (!hedgeReportFresh(p) || Date.now() - Number(p.reserve.report.hlTime) > LIMITS.pairingMs / 2) {
  console.log("waiting for a fresh hedge report: the update must sit within 20 s of its HyperCore time");
} else {
  // Every listing adds three accounts: past two, the transaction needs the program's lookup table.
  const lookupTables = process.env.LOOKUP_TABLE ? [await lookupTable(connection, new PublicKey(process.env.LOOKUP_TABLE))] : [];
  const signature = await sendFresh(connection, {
    signers: [caller],
    lookupTables,
    label: "distribute",
    build: async () => {
      const message = await prices.signed(feeds);
      const update = parseEnvelope(message);
      const now = Math.floor(Date.now() / 1000);
      if (!feeds.every((f) => isLive(update, f, now, p.config.params.pythFreshnessSecs))) throw new Error("a collateral's session is closed");
      return withPrice(message, (ed25519Index) => instructions.distribute({ caller: caller.publicKey, collateral: p.collateral.map((c) => c.mint), message, ed25519Index }));
    },
  });
  console.log(`distributed: ${signature}`);
}
