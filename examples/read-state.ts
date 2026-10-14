// The protocol in one read, and a wallet in another.
//
//   RPC_URL=<mainnet rpc> npx tsx examples/read-state.ts [wallet address]

import { Connection, PublicKey } from "@solana/web3.js";
import {
  collateralHedgeLive,
  collateralRoom,
  feeFor,
  fetchPosition,
  fetchProtocol,
  nextDistribution,
  positionState,
  susdqRate,
  usdcMintRoom,
  usdqSupplyCap,
} from "@aequa-finance/sdk";

const connection = new Connection(process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
const usd = (raw: bigint) => (Number(raw) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 });

const p = await fetchProtocol(connection);
console.log(`USDq supply      ${usd(p.usdqSupply)} of ${usd(usdqSupplyCap(p))}`);
console.log(`buffer           ${usd(p.balances.buffer)} USDC`);
console.log(`Reserve Fund     ${usd(p.balances.reserveFund)} USDq`);
console.log(`sUSDq            ${usd(p.susdqSupply)} at ${Number(susdqRate(p)) / 1e6} USDq each`);
console.log(`USDC mint room   ${usd(usdcMintRoom(p))} this hour`);
console.log(`next distribute  ${new Date(nextDistribution(p) * 1000).toISOString()}`);
for (const c of p.collateral) {
  const room = collateralRoom(c, p.now);
  console.log(`${c.symbol ?? c.mint.toBase58()}  vault ${Number(c.vault) / 10 ** c.mintInfo.decimals}, hedge ${collateralHedgeLive(p, c) ? "live" : "closed"}, mint room ${usd(room.mint)}, redeem room ${usd(room.redeem)}`);
}

const address = process.argv[2];
if (address) {
  const w = await fetchPosition(connection, p, new PublicKey(address));
  console.log(`\n${address}`);
  console.log(`USDC ${usd(w.usdc.amount)}, USDq ${usd(w.usdq.amount)}, sUSDq ${usd(w.susdq.amount)}`);
  for (const x of w.xstocks) console.log(`${x.symbol ?? x.mint.toBase58()} ${x.amount}`);
  if (w.usdqCooldown) console.log(`cooling ${usd(w.usdqCooldown.amount)} USDq until ${new Date(Number(w.usdqCooldown.unlockAt) * 1000).toISOString()}`);
  if (w.aequaStake) console.log(`stAEQUA ${w.aequaStake.shares} shares, ${positionState(p, w.aequaStake)}`);
  console.log(`fee ${feeFor(p, w.aequaStake)} bps`);
}
