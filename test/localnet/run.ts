// The SDK end to end on a local validator, through the SDK alone. The program as built runs with
// mainnet's own binaries and accounts for the token programs, Pyth Lazer, Metaplex, CCTP V2,
// Jupiter and Raydium CLMM (the program's tests/fixtures); a local Pyth Pro signer the Lazer storage
// trusts serves signed prices over Pyth Pro's REST shape.
//
// Every one of the 37 instructions goes through its builder: setup, every user path through
// AequaClient, the keeper's and reporter's, the cranks, the admin's and governance's. Each lands,
// or, where it waits on time (a distribution, the TWAP, a cooldown), the program refuses it by
// name from inside the instruction, which it reaches only after Anchor has checked every account.
//
//   npm run test:localnet     WSL with solana-test-validator 2.x; AEQUA_PROGRAM_DIR points at a
//                             checkout of github.com/aequa-finance/aequa, built with its IDL

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createPrivateKey, createPublicKey, sign as edSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type AddressLookupTableAccount,
} from "@solana/web3.js";
import {
  AequaClient,
  AequaError,
  ata,
  bridgeArgs,
  circleMaxFee,
  CCTP,
  COLLATERAL,
  collateralPda,
  collateralVault,
  createAtaIdempotent,
  decodeAccount,
  feeFits,
  fetchPosition,
  fetchProtocol,
  findEvent,
  hyperCoreHook,
  instructions as ix,
  jupiterRoute,
  lookupTableAddresses,
  maxVoterWeightRecord,
  PATH,
  PDA,
  poolPrice,
  prepare,
  PROGRAM_ID,
  pythPro,
  readMint,
  routeFromInstruction,
  sendAndConfirm,
  sendFresh,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  transactionEvents,
  USDC_MINT,
  usdqSupplyCap,
  voterWeightRecord,
  withPrice,
  type Built,
  type JupiterInstruction,
  type ListingArgs,
  type Protocol,
} from "../../src/index.js";
import { launchParams } from "../helpers.js";

const PROGRAM_DIR = process.env.AEQUA_PROGRAM_DIR;
if (!PROGRAM_DIR) throw new Error("set AEQUA_PROGRAM_DIR to a checkout of github.com/aequa-finance/aequa");
const FIX = join(PROGRAM_DIR, "tests/fixtures");
const SO = join(PROGRAM_DIR, "target/deploy/aequa.so");
const RPC_PORT = 18999;
const PYTH_PORT = 19070;
/** A hedge account on HyperCore: what the bridge route names. */
const HEDGE = "0x23c01769707134a1c0cff5fedb94e87f3bdc2aea";
const USD = 1_000_000n;

for (const need of [SO, join(FIX, "jupiter_buy.json")]) if (!existsSync(need)) throw new Error(`${need} is missing: build the program (its README)`);

const results = new Map<string, string>();
const done = (name: string, how = "landed") => results.set(name, how);
const step = (s: string) => console.log(`\n— ${s}`);

/* ── Keys and the local Pyth Pro signer ─────────────────────── */

const [deployer, guardian, keeper, reporter, issuer, user, newAdmin] = Array.from({ length: 7 }, () => Keypair.generate());
const pythSeed = Buffer.alloc(32, 42);
const pythPriv = createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), pythSeed]), format: "der", type: "pkcs8" });
const pythPub = (createPublicKey(pythPriv).export({ format: "der", type: "spki" }) as Buffer).subarray(-32);

/** Mantissas at exponent −5, by feed. */
const mantissa = new Map<number, bigint>();

function signedEnvelope(feeds: number[]): Buffer {
  const now = BigInt(Date.now()) * 1000n;
  const parts: Buffer[] = [];
  const head = Buffer.alloc(14);
  head.writeUInt32LE(2_479_346_549, 0);
  head.writeBigUInt64LE(now, 4);
  head[12] = 3;
  head[13] = feeds.length;
  parts.push(head);
  for (const id of feeds) {
    const f = Buffer.alloc(39);
    f.writeUInt32LE(id, 0);
    f[4] = 4;
    f[5] = 0;
    f.writeBigInt64LE(mantissa.get(id) ?? 50_000_000n, 6);
    f[14] = 4;
    f.writeInt16LE(-5, 15);
    f[17] = 12;
    f[18] = 1;
    f.writeBigUInt64LE(now, 19);
    f[27] = 9;
    // Regular session: the program reads the session from the update, never the wall clock.
    f.writeInt16LE(0, 28);
    parts.push(f.subarray(0, 30));
  }
  const payload = Buffer.concat(parts);
  const len = Buffer.alloc(2);
  len.writeUInt16LE(payload.length);
  return Buffer.concat([Buffer.from([0xb9, 0x01, 0x1a, 0x82]), edSign(null, payload, pythPriv), pythPub, len, payload]);
}

/** Pyth Pro's REST shape, checking the request as Pyth Pro would read it. */
const pythServer = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const r = JSON.parse(body) as { priceFeedIds: number[]; formats: string[]; channel: string; jsonBinaryEncoding: string; properties: string[] };
    const ok =
      req.url === "/v1/latest_price" &&
      req.headers.authorization === "Bearer local-token" &&
      r.formats.join() === "solana" &&
      r.channel === "fixed_rate@200ms" &&
      r.jsonBinaryEncoding === "base64" &&
      ["price", "exponent", "feedUpdateTimestamp", "marketSession"].every((p) => r.properties.includes(p));
    res.statusCode = ok ? 200 : 400;
    res.setHeader("content-type", "application/json");
    res.end(ok ? JSON.stringify({ solana: { encoding: "base64", data: signedEnvelope(r.priceFeedIds).toString("base64") } }) : "{}");
  });
});
const prices = pythPro({ token: "local-token", url: `http://127.0.0.1:${PYTH_PORT}` });

/* ── Programs and accounts for the validator ────────────────── */

const work = join(tmpdir(), "aequa-sdk-localnet");
mkdirSync(join(work, "accounts"), { recursive: true });
const wsl = (p: string) => p.replace(/^([A-Za-z]):\\/, (_, d: string) => `/mnt/${d.toLowerCase()}/`).replace(/\\/g, "/");
type AccountJson = { pubkey: string; account: { lamports: number; data: [string, string]; owner: string; executable: boolean; rentEpoch: number; space: number } };
const accounts: { address: string; path: string }[] = [];
function addAccount(address: string, owner: string, lamports: number, data: Buffer) {
  const path = join(work, "accounts", `${address}.json`);
  const json: AccountJson = { pubkey: address, account: { lamports, data: [data.toString("base64"), "base64"], owner, executable: false, rentEpoch: 0, space: data.length } };
  writeFileSync(path, JSON.stringify(json));
  accounts.push({ address, path: wsl(path) });
}
function addFixture(name: string, patch?: (d: Buffer) => void) {
  const a = JSON.parse(readFileSync(join(FIX, name), "utf8")) as AccountJson;
  const data = Buffer.from(a.account.data[0], "base64");
  patch?.(data);
  addAccount(a.pubkey, a.account.owner, a.account.lamports, data);
}
// The issuer mints USDC and the xStocks here.
const mintAuthority = (d: Buffer) => {
  d.writeUInt32LE(1, 0);
  issuer.publicKey.toBuffer().copy(d, 4);
};
addFixture("usdc_mint.json", mintAuthority);
addFixture("spyx_mint.json", mintAuthority);
addFixture("qqqx_mint.json", mintAuthority);
// The Lazer storage trusts the local signer, with no expiry.
addFixture("pyth_lazer_storage.json", (d) => {
  d[80] = 2;
  pythPub.copy(d, 121);
  d.writeBigInt64LE(2n ** 63n - 1n, 153);
});
addFixture("pyth_lazer_treasury.json");
for (const f of ["cctp_message_transmitter", "cctp_token_messenger", "cctp_remote_token_messenger_19", "cctp_token_minter", "cctp_local_token_usdc"]) addFixture(`${f}.json`);
// The captured Jupiter route: USDC to SPYx through Raydium CLMM, and the accounts it touches.
const route = JSON.parse(readFileSync(join(FIX, "jupiter_buy.json"), "utf8")) as {
  quote: { inAmount: string; outAmount: string };
  swapInstruction: JupiterInstruction;
  accounts: Record<string, { lamports: number; owner: string; data: string }>;
  programs: string[];
};
for (const [address, a] of Object.entries(route.accounts)) {
  if (address === USDC_MINT.toBase58() || address === COLLATERAL.SPYx.mint.toBase58()) continue;
  addAccount(address, a.owner, a.lamports, Buffer.from(a.data, "base64"));
}
const programs = [
  ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "spl_token.so"],
  ["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "spl_token_2022.so"],
  ["ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "spl_ata.so"],
  ["pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt", "pyth_lazer.so"],
  ["metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", "mpl_token_metadata.so"],
  [CCTP.messageTransmitter.toBase58(), "cctp_message_transmitter_v2.so"],
  [CCTP.tokenMessengerMinter.toBase58(), "cctp_token_messenger_minter_v2.so"],
  ...route.programs.filter((id) => !id.startsWith("Token")).map((id) => [id, `prog_${id}.so`]),
].map(([id, file]) => ({ id, path: wsl(join(FIX, file)) }));
const manifest = join(work, "manifest.json");
writeFileSync(manifest, JSON.stringify({ programs, upgradeable: [{ id: PROGRAM_ID.toBase58(), path: wsl(SO), authority: deployer.publicKey.toBase58() }], accounts }));

/* ── Token instructions the run needs beyond the SDK's ──────── */

const u64 = (v: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(v);
  return b;
};
const mintTo = (mint: PublicKey, to: PublicKey, amount: bigint, program = TOKEN_PROGRAM) =>
  new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
      { pubkey: issuer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([7]), u64(amount)]),
  });
const transfer = (from: PublicKey, to: PublicKey, owner: PublicKey, amount: bigint) =>
  new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    keys: [
      { pubkey: from, isSigner: false, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([3]), u64(amount)]),
  });

/* ── Run ────────────────────────────────────────────────────── */

let validatorPid = "";
let connection: Connection;
let tables: AddressLookupTableAccount[] = [];

/** Builds, simulates, signs, sends and confirms, through the SDK's transaction module. */
async function run(label: string, payer: Keypair, instructions: TransactionInstruction[], o: { signers?: Keypair[]; tables?: AddressLookupTableAccount[] } = {}) {
  const { transaction, blockhash } = await prepare(connection, { payer: payer.publicKey, instructions, lookupTables: o.tables ?? tables, signers: [payer, ...(o.signers ?? [])], label });
  return sendAndConfirm(connection, transaction, { lastValidBlockHeight: blockhash.lastValidBlockHeight });
}

/** The program refuses `name` with `code`, from inside the instruction. */
async function refuses(name: string, payer: Keypair, instructions: TransactionInstruction[], code: string, o: { signers?: Keypair[] } = {}) {
  await assert.rejects(run(name, payer, instructions, o), (e) => {
    assert.ok(e instanceof AequaError, String(e));
    assert.equal(e.code, code, `${name}: ${e.message}`);
    return true;
  });
  done(name, `refused: ${code} (expected)`);
}

/** Signs and sends what the client built. */
async function sendBuilt(client: AequaClient, built: Built, signer = user) {
  built.transaction.sign([signer]);
  return client.send(built.transaction, built);
}

try {
  await new Promise<void>((r) => pythServer.listen(PYTH_PORT, "127.0.0.1", r));

  step("validator");
  const home = execFileSync("wsl.exe", ["--exec", "bash", "-c", "echo $HOME"], { encoding: "utf8" }).trim();
  const script = wsl(fileURLToPath(new URL("./validator.sh", import.meta.url)));
  validatorPid = execFileSync("wsl.exe", ["--exec", "bash", script, wsl(manifest), `${home}/.cache/aequa-sdk-localnet/ledger`, String(RPC_PORT)], {
    encoding: "utf8",
    env: { ...process.env, MSYS_NO_PATHCONV: "1" },
  }).trim();
  console.log(`validator pid ${validatorPid} (WSL)`);
  connection = new Connection(`http://127.0.0.1:${RPC_PORT}`, "confirmed");
  for (let i = 0; ; i++) {
    const slot = await connection.getSlot().catch(() => 0);
    if (slot > 2) break;
    if (i > 90) throw new Error("the validator didn't start");
    await new Promise((r) => setTimeout(r, 1000));
  }
  for (const k of [deployer, guardian, keeper, reporter, issuer, user, newAdmin]) {
    const sig = await connection.requestAirdrop(k.publicKey, 100 * LAMPORTS_PER_SOL);
    while ((await connection.getSignatureStatuses([sig])).value[0]?.confirmationStatus !== "confirmed") await new Promise((r) => setTimeout(r, 400));
  }

  step("setup, from the builders");
  const params = launchParams();
  await run("initialize", deployer, [await ix.initialize({ payer: deployer.publicKey, admin: deployer.publicKey, guardian: guardian.publicKey, keeper: keeper.publicKey, reporter: reporter.publicKey, params })]);
  done("initialize");
  await run("create_vaults", deployer, [
    createAtaIdempotent(deployer.publicKey, PDA.landingAuthority, USDC_MINT),
    createAtaIdempotent(deployer.publicKey, PDA.swapAuthority, USDC_MINT),
    await ix.createVaults({ payer: deployer.publicKey, admin: deployer.publicKey }),
  ]);
  done("createVaults");
  await run("create_susdq_vaults", deployer, [await ix.createSusdqVaults({ payer: deployer.publicKey, admin: deployer.publicKey })]);
  done("createSusdqVaults");
  const perp = (name: string) => [...Buffer.from(name.padEnd(24, "\0"))];
  const listings: Record<"SPYx" | "QQQx", ListingArgs> = {
    SPYx: { feed: 1398, bandsBps: [5, 15, 15, 25], spotCap: 14_900_000n * USD, hourlyCap: 500_000n * USD, perp: perp("xyz:SP500"), perpAsset: 110_052 },
    QQQx: { feed: 1363, bandsBps: [5, 15, 15, 25], spotCap: 12_800_000n * USD, hourlyCap: 500_000n * USD, perp: perp("xyz:XYZ100"), perpAsset: 110_000 },
  };
  for (const x of ["SPYx", "QQQx"] as const) {
    const mint = COLLATERAL[x].mint;
    await run(`add_collateral ${x}`, deployer, [
      createAtaIdempotent(deployer.publicKey, PDA.swapAuthority, mint, TOKEN_2022_PROGRAM),
      await ix.addCollateral({ payer: deployer.publicKey, admin: deployer.publicKey, mint, listing: listings[x] }),
    ]);
  }
  done("addCollateral");
  await run("set_bridge_route", deployer, [await ix.setBridgeRoute({ admin: deployer.publicKey, route: bridgeArgs(HEDGE, 1, 1_000_000n) })]);
  done("setBridgeRoute");
  for (const [mint, name, symbol] of [
    [PDA.usdqMint, "USDq", "USDq"],
    [PDA.susdqMint, "Staked USDq", "sUSDq"],
  ] as const) {
    await run(`set_token_metadata ${symbol}`, deployer, [await ix.setTokenMetadata({ payer: deployer.publicKey, admin: deployer.publicKey, mint, token: { name, symbol, uri: `https://example.com/${symbol}.json` } })]);
  }
  done("setTokenMetadata");
  // The lookup table every client uses.
  const [create, tableAddress] = AddressLookupTableProgram.createLookupTable({ authority: deployer.publicKey, payer: deployer.publicKey, recentSlot: await connection.getSlot("finalized") });
  await run("lookup table", deployer, [create]);
  const wanted = lookupTableAddresses();
  for (let i = 0; i < wanted.length; i += 20) {
    await run("lookup table", deployer, [AddressLookupTableProgram.extendLookupTable({ lookupTable: tableAddress, authority: deployer.publicKey, payer: deployer.publicKey, addresses: wanted.slice(i, i + 20) })]);
  }
  await new Promise((r) => setTimeout(r, 1_500));
  tables = [(await connection.getAddressLookupTable(tableAddress)).value!];
  assert.equal(tables[0].state.addresses.length, wanted.length);
  await run("unpause", deployer, [await ix.unpause({ admin: deployer.publicKey, paths: PATH.ALL })]);
  done("unpause");

  let p: Protocol = await fetchProtocol(connection);
  assert.equal(p.config.paused, 0);
  assert.equal(p.collateral.length, 2);
  assert.deepEqual(
    p.collateral.map((c) => c.symbol),
    ["SPYx", "QQQx"],
  );
  assert.equal(usdqSupplyCap(p), ((14_900_000n + 12_800_000n) * USD * 10_000n) / 6_750n);
  assert.deepEqual(Uint8Array.from(p.config.bridge.hookData.slice(0, 56)), hyperCoreHook(HEDGE));
  assert.ok(Math.abs(p.now - Date.now() / 1000) < 30, "the protocol read carries Solana's clock");
  console.log(`setup done: ${wanted.length} addresses in the lookup table ${tableAddress.toBase58()}`);

  step("the user's tokens");
  const userUsdc = ata(USDC_MINT, user.publicKey);
  const userSpyx = ata(COLLATERAL.SPYx.mint, user.publicKey, TOKEN_2022_PROGRAM);
  await run("user accounts", issuer, [
    createAtaIdempotent(issuer.publicKey, user.publicKey, USDC_MINT),
    createAtaIdempotent(issuer.publicKey, user.publicKey, COLLATERAL.SPYx.mint, TOKEN_2022_PROGRAM),
    mintTo(USDC_MINT, userUsdc, 50_000n * USD),
    mintTo(COLLATERAL.SPYx.mint, userSpyx, 10_000_000_000n, TOKEN_2022_PROGRAM),
  ]);

  step("the hedge report");
  const report = async (accountValue: bigint) =>
    run("report_hedge", reporter, [
      await ix.reportHedge({ reporter: reporter.publicKey, report: { accountValue, shortNotional: Array(8).fill(0n), marketLive: 0b11, creditedTotal: 0n, withdrawnTotal: 0n, hlTime: BigInt(Date.now()) } }),
    ]);
  await report(0n);
  done("reportHedge");
  p = await fetchProtocol(connection);
  assert.equal(p.reserve.report.marketLive, 0b11);

  step("AequaClient: USDC paths");
  const client = new AequaClient({ connection, prices, lookupTable: tableAddress, priorityFee: 1_000 });
  let built = await client.mint({ user: user.publicKey, asset: "USDC", amount: 20_000n * USD });
  assert.equal(built.out, 19_980n * USD);
  assert.equal(findEvent(built.simulation.events, "minted")?.usdqOut, built.out, "the simulation pays the quote");
  let sig = await sendBuilt(client, built);
  const landed = findEvent(await transactionEvents(connection, sig), "minted")!;
  assert.equal(landed.usdqOut, built.out);
  assert.equal(landed.feeTo, 0, "fees fill the Reserve Fund first");
  let w = await client.position(user.publicKey);
  assert.equal(w.usdq.amount, 19_980n * USD);
  assert.ok(w.usdq.exists);
  done("mintWithUsdc");

  built = await client.redeem({ user: user.publicKey, asset: "USDC", amount: 1_000n * USD });
  await sendBuilt(client, built);
  w = await client.position(user.publicKey);
  assert.equal(w.usdc.amount, 30_000n * USD + 999n * USD);
  assert.equal(w.usdq.amount, 18_980n * USD);
  done("redeemForUsdc");

  step("AequaClient: SPYx paths at a signed price");
  // SPY at the price the captured route implies, 2% up, so the keeper's swap below clears it.
  const spyxMint = readMint(Buffer.from((JSON.parse(readFileSync(join(FIX, "spyx_mint.json"), "utf8")) as AccountJson).account.data[0], "base64"), Math.floor(Date.now() / 1000));
  const [inAmount, outAmount] = [BigInt(route.quote.inAmount), BigInt(route.quote.outAmount)];
  const impliedE8 = (inAmount * 10n ** 8n * 10n ** 12n * 10n ** 8n) / (USD * spyxMint.multiplierE12 * outAmount);
  mantissa.set(1398, (impliedE8 * 102n) / 100n / 1000n);
  mantissa.set(1363, 60_000_000n);
  built = await client.mint({ user: user.publicKey, asset: "SPYx", amount: 100_000_000n });
  assert.ok(built.expiresAt && built.expiresAt > Date.now());
  sig = await sendBuilt(client, built);
  const mintedX = findEvent(await transactionEvents(connection, sig), "minted")!;
  assert.equal(mintedX.usdqOut, built.out, "the program paid exactly the quote");
  assert.ok(mintedX.asset.equals(COLLATERAL.SPYx.mint) && mintedX.session === 0);
  console.log(`1 SPYx minted ${Number(built.out) / 1e6} USDq at $${Number(mintedX.priceE8) / 1e8}`);
  done("mintWithCollateral");
  built = await client.redeem({ user: user.publicKey, asset: "SPYx", amount: 100n * USD });
  sig = await sendBuilt(client, built);
  assert.equal(findEvent(await transactionEvents(connection, sig), "redeemed")!.amountOut, built.out);
  done("redeemForCollateral");

  step("AequaClient: sUSDq");
  built = await client.stake({ user: user.publicKey, amount: 2_000n * USD });
  assert.equal(built.out, 2_000n * USD, "the first stake is one to one");
  await sendBuilt(client, built);
  done("stakeUsdq");
  built = await client.unstake({ user: user.publicKey, shares: 500n * USD });
  await sendBuilt(client, built);
  w = await client.position(user.publicKey);
  assert.equal(w.usdqCooldown?.amount, built.out);
  assert.equal(w.susdq.amount, 1_500n * USD);
  // Another unstake while that one runs adds to it and starts its clock again: only when asked.
  await assert.rejects(client.unstake({ user: user.publicKey, shares: 100n * USD }), (e) => e instanceof AequaError && e.code === "CooldownActive");
  built = await client.unstake({ user: user.publicKey, shares: 100n * USD, restartCooldown: true });
  await sendBuilt(client, built);
  w = await client.position(user.publicKey);
  assert.equal(w.usdqCooldown?.amount, 600n * USD);
  done("startUsdqCooldown");
  await assert.rejects(client.claim({ user: user.publicKey }), (e) => e instanceof AequaError && e.code === "CooldownActive");
  done("claimUsdq", "refused: CooldownActive (expected, 7-day cooldown)");

  step("the keeper: a Jupiter swap on the captured route, a CCTP bridge, the land crank");
  const swapRoute = routeFromInstruction(route.swapInstruction);
  const [createRouteTable, routeTable] = AddressLookupTableProgram.createLookupTable({ authority: deployer.publicKey, payer: deployer.publicKey, recentSlot: await connection.getSlot("finalized") });
  await run("route table", deployer, [createRouteTable]);
  const routeKeys = [...new Set(swapRoute.accounts.map((a) => a.pubkey.toBase58()))].map((k) => new PublicKey(k));
  for (let i = 0; i < routeKeys.length; i += 20) {
    await run("route table", deployer, [AddressLookupTableProgram.extendLookupTable({ lookupTable: routeTable, authority: deployer.publicKey, payer: deployer.publicKey, addresses: routeKeys.slice(i, i + 20) })]);
  }
  await new Promise((r) => setTimeout(r, 1_500));
  const routeTables = [...tables, (await connection.getAddressLookupTable(routeTable)).value!];
  const vaultBefore = (await fetchProtocol(connection)).collateral[0].vault;
  // A fresh price for each attempt: the first run of the route's programs on a new validator
  // can take longer than the price's ten seconds.
  await sendFresh(connection, {
    signers: [keeper],
    lookupTables: routeTables,
    label: "swap",
    build: async () => {
      const signed = await prices.signed([1398]);
      return withPrice(signed, (ed25519Index) => ix.swap({ keeper: keeper.publicKey, mint: COLLATERAL.SPYx.mint, buy: true, amountIn: inAmount, route: swapRoute, message: signed, ed25519Index }));
    },
  });
  p = await fetchProtocol(connection);
  assert.ok(p.collateral[0].vault - vaultBefore >= (outAmount * 99n) / 100n, "the swap delivered the route's SPYx");
  done("swap");

  const fees = { fastBps: 1, standardBps: 0, forwardFee: { low: 100_000, med: 200_000, high: 400_000 } };
  const amount = 1_000n * USD;
  const maxFee = circleMaxFee(amount, fees, true);
  assert.ok(feeFits(amount, maxFee, p.config.bridge));
  const event = Keypair.generate();
  await run("bridge_out", keeper, [await ix.bridgeOut({ keeper: keeper.publicKey, messageSentEventData: event.publicKey, amount, maxFee, fast: true })], { signers: [event] });
  p = await fetchProtocol(connection);
  assert.equal(p.reserve.bridgedOutTotal, amount - maxFee);
  done("bridgeOut");

  await run("landing", issuer, [mintTo(USDC_MINT, PDA.landing, 250n * USD)]);
  const bufferBefore = p.balances.buffer;
  await run("land_usdc", user, [await ix.landUsdc()]);
  p = await fetchProtocol(connection);
  assert.equal(p.balances.buffer, bufferBefore + 250n * USD);
  done("landUsdc");

  step("the cranks that wait on time");
  const dist = await prices.signed([1398, 1363]);
  await refuses("distribute", user, await withPrice(dist, (ed25519Index) => ix.distribute({ caller: user.publicKey, collateral: p.collateral.map((c) => c.mint), message: dist, ed25519Index })), "NotDue");

  step("AEQUA: the token, its pool's TWAP, stAEQUA and the fee tier");
  const aequaMint = Keypair.generate();
  const poolOwner = Keypair.generate().publicKey;
  const rent = await connection.getMinimumBalanceForRentExemption(82);
  await run("AEQUA mint", issuer, [
    SystemProgram.createAccount({ fromPubkey: issuer.publicKey, newAccountPubkey: aequaMint.publicKey, lamports: rent, space: 82, programId: TOKEN_PROGRAM }),
    new TransactionInstruction({ programId: TOKEN_PROGRAM, keys: [{ pubkey: aequaMint.publicKey, isSigner: false, isWritable: true }], data: Buffer.concat([Buffer.from([20, 6]), issuer.publicKey.toBuffer(), Buffer.from([0])]) }),
  ], { signers: [aequaMint] });
  const aequa = { mint: aequaMint.publicKey, tokenProgram: TOKEN_PROGRAM };
  const pool = { pool: poolOwner, poolAequaVault: ata(aequa.mint, poolOwner), poolQuoteVault: ata(USDC_MINT, poolOwner), quoteFeed: 0 };
  await run("AEQUA pool and holdings", issuer, [
    createAtaIdempotent(issuer.publicKey, poolOwner, aequa.mint),
    createAtaIdempotent(issuer.publicKey, poolOwner, USDC_MINT),
    createAtaIdempotent(issuer.publicKey, user.publicKey, aequa.mint),
    mintTo(aequa.mint, pool.poolAequaVault, 1_000_000n * USD),
    mintTo(USDC_MINT, pool.poolQuoteVault, 100_000n * USD),
    mintTo(aequa.mint, ata(aequa.mint, user.publicKey), 200_000n * USD),
  ]);
  await run("set_aequa", deployer, [await ix.setAequa({ payer: deployer.publicKey, admin: deployer.publicKey, aequa, quote: { mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM }, pool })]);
  done("setAequa");
  await run("observe_pool", keeper, [await ix.observePool({ keeper: keeper.publicKey, poolAequaVault: pool.poolAequaVault, poolQuoteVault: pool.poolQuoteVault })]);
  p = await fetchProtocol(connection);
  assert.ok(p.aequa?.mint.equals(aequa.mint));
  assert.equal(p.twap?.count, 1);
  assert.equal(p.twap?.lastPrice, poolPrice(1_000_000n * USD, 6, 100_000n * USD, 6), "the SDK prices the pool as the program does");
  done("observePool");

  built = await client.stakeAequa({ user: user.publicKey, amount: 100_000n * USD });
  await sendBuilt(client, built);
  w = await client.position(user.publicKey);
  assert.equal(w.aequaStake?.shares, built.out);
  done("stakeAequa");
  // 100,000 AEQUA staked reaches the first tier: 5 bps.
  built = await client.mint({ user: user.publicKey, asset: "USDC", amount: 1_000n * USD });
  assert.equal(findEvent(built.simulation.events, "minted")?.feeBps, 5);
  assert.equal(built.fee, 500_000n);
  await sendBuilt(client, built);

  step("governance: voter weight from stAEQUA");
  const realm = Keypair.generate().publicKey;
  const proposal = Keypair.generate().publicKey;
  await run("create_voter_weight_record", user, [await ix.createVoterWeightRecord({ payer: user.publicKey, realm, aequaMint: aequa.mint, voter: user.publicKey })]);
  done("createVoterWeightRecord");
  await run("update_voter_weight_record", user, [await ix.updateVoterWeightRecord({ realm, aequaMint: aequa.mint, voter: user.publicKey, withStake: true, action: { castVote: {} }, target: proposal })]);
  const vote = decodeAccount("voterWeightRecord", (await connection.getAccountInfo(voterWeightRecord(realm, aequa.mint, user.publicKey)))!.data);
  assert.equal(vote.voterWeight, 100_000n * USD);
  assert.ok(vote.weightActionTarget?.equals(proposal));
  assert.deepEqual(vote.weightAction, { castVote: {} });
  done("updateVoterWeightRecord");
  await run("create_max_voter_weight_record", user, [await ix.createMaxVoterWeightRecord({ payer: user.publicKey, realm, aequaMint: aequa.mint })]);
  done("createMaxVoterWeightRecord");
  await run("update_max_voter_weight_record", user, [await ix.updateMaxVoterWeightRecord({ realm, aequaMint: aequa.mint })]);
  const max = decodeAccount("maxVoterWeightRecord", (await connection.getAccountInfo(maxVoterWeightRecord(realm, aequa.mint)))!.data);
  assert.equal(max.maxVoterWeight, 100_000n * USD);
  done("updateMaxVoterWeightRecord");

  step("stAEQUA cooldown, and the AEQUA cranks before the TWAP has its window");
  built = await client.unstakeAequa({ user: user.publicKey });
  await sendBuilt(client, built);
  done("startAequaUnstake");
  built = await client.mint({ user: user.publicKey, asset: "USDC", amount: 1_000n * USD });
  assert.equal(findEvent(built.simulation.events, "minted")?.feeBps, 10, "a cooling position has no tier");
  await assert.rejects(client.withdrawAequa({ user: user.publicKey }), (e) => e instanceof AequaError && e.code === "WindowNotOpen");
  await refuses("withdrawAequa", user, [await ix.withdrawAequa({ user: user.publicKey, aequa })], "WindowNotOpen");
  // USDq sent to the Reserve Fund past its target sends the next fees to the protocol vault,
  // which the buyback spends.
  await run("fund the Reserve Fund", user, [transfer(ata(PDA.usdqMint, user.publicKey), PDA.reserveFund, user.publicKey, 1_000n * USD)]);
  built = await client.mint({ user: user.publicKey, asset: "USDC", amount: 1_000n * USD });
  assert.equal(findEvent(built.simulation.events, "minted")?.feeTo, 1);
  await sendBuilt(client, built);
  const noRoute = { data: new Uint8Array(), accounts: [] };
  await refuses("buyback", user, [await ix.buyback({ caller: user.publicKey, aequa, amount: 1n, route: noRoute })], "TwapNotReady");
  await refuses("sellSlashed", user, [await ix.sellSlashed({ caller: user.publicKey, aequa, amount: 1n, route: noRoute })], "NothingToMove");
  await refuses("coverDeficit", user, [await ix.coverDeficit({ caller: user.publicKey, aequa })], "DeficitNotHeld");

  step("admin and guardian");
  await run("set_params", deployer, [await ix.setParams({ admin: deployer.publicKey, params: { ...params, keeperSlippageBps: 60 } })]);
  assert.equal((await fetchProtocol(connection)).config.params.keeperSlippageBps, 60);
  done("setParams");
  await run("set_collateral", deployer, [await ix.setCollateral({ admin: deployer.publicKey, mint: COLLATERAL.SPYx.mint, listing: { ...listings.SPYx, bandsBps: [6, 15, 15, 25] } })]);
  assert.deepEqual((await fetchProtocol(connection)).collateral[0].account.bandsBps, [6, 15, 15, 25]);
  done("setCollateral");
  await run("pause", guardian, [await ix.pause({ signer: guardian.publicKey, paths: PATH.MINT_USDC, collateral: COLLATERAL.SPYx.mint })]);
  p = await fetchProtocol(connection);
  assert.equal(p.config.paused, PATH.MINT_USDC);
  assert.equal(p.collateral[0].account.paused, true);
  await assert.rejects(client.mint({ user: user.publicKey, asset: "USDC", amount: USD }), (e) => e instanceof AequaError && e.code === "Paused");
  done("pause");
  await run("unpause", deployer, [await ix.unpause({ admin: deployer.publicKey, paths: PATH.MINT_USDC })]);
  await run("unpause_collateral", deployer, [await ix.unpauseCollateral({ admin: deployer.publicKey, mint: COLLATERAL.SPYx.mint })]);
  p = await fetchProtocol(connection);
  assert.equal(p.config.paused, 0);
  assert.equal(p.collateral[0].account.paused, false);
  done("unpauseCollateral");
  await run("set_roles", deployer, [await ix.setRoles({ admin: deployer.publicKey, guardian: guardian.publicKey, keeper: keeper.publicKey, reporter: reporter.publicKey, pendingAdmin: newAdmin.publicKey })]);
  done("setRoles");
  await run("accept_admin", newAdmin, [await ix.acceptAdmin({ pendingAdmin: newAdmin.publicKey })]);
  assert.ok((await fetchProtocol(connection)).config.admin.equals(newAdmin.publicKey));
  done("acceptAdmin");
  await refuses("unpause (by the old admin)", deployer, [await ix.unpause({ admin: deployer.publicKey, paths: PATH.ALL })], "Unauthorized");

  step("the protocol and the wallet, read once more");
  p = await fetchProtocol(connection);
  w = await fetchPosition(connection, p, user.publicKey);
  assert.equal(w.xstocks[0].symbol, "SPYx");
  assert.ok(p.usdqSupply > 0n && p.susdqSupply === 1_400n * USD);
  console.log(`supply ${Number(p.usdqSupply) / 1e6} USDq, buffer ${Number(p.balances.buffer) / 1e6} USDC, SPYx vault ${Number(p.collateral[0].vault) / 1e8}`);

  step("a live Jupiter route for the swap authority");
  try {
    const live = await jupiterRoute({ inputMint: USDC_MINT, outputMint: COLLATERAL.SPYx.mint, amount: 1_000n * USD });
    const data = Buffer.from(live.data);
    assert.ok(["d19853937cfed8e9", "bb64facc31c4af14"].includes(data.subarray(0, 8).toString("hex")), "a v2 route");
    assert.equal(data.readBigUInt64LE(data[0] === 0xd1 ? 9 : 8), 1_000n * USD, "spending exactly the amount");
    assert.ok(live.accounts.some((a) => a.pubkey.equals(PDA.transitUsdc)) && live.accounts.every((a) => !a.isSigner));
    console.log(`Jupiter routes 1,000 USDC to ${Number(live.quote.outAmount) / 1e8} SPYx through ${live.quote.routePlan.map((r) => r.swapInfo.label).join(", ")}`);
  } catch (e) {
    if (e instanceof assert.AssertionError) throw e;
    console.log(`Jupiter's API didn't answer (${String(e).slice(0, 120)}): the captured route above stands for it`);
  }

  step("the examples, against this validator");
  const keyFile = join(work, "user.json");
  writeFileSync(keyFile, JSON.stringify([...user.secretKey]));
  const example = (file: string, args: string[]) =>
    execFileSync(process.execPath, ["--import", "tsx", fileURLToPath(new URL(`../../examples/${file}`, import.meta.url)), ...args], {
      encoding: "utf8",
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: { ...process.env, RPC_URL: `http://127.0.0.1:${RPC_PORT}`, KEYPAIR: keyFile, LOOKUP_TABLE: tableAddress.toBase58() },
    });
  assert.match(example("read-state.ts", [user.publicKey.toBase58()]), /USDq supply[\s\S]*fee 10 bps/);
  assert.match(example("mint.ts", ["USDC", "1000000"]), /landed: \w+/);
  assert.match(example("crank-distribute.ts", []), /not due until/);
  assert.match(example("vote-weight.ts", [realm, user.publicKey, proposal].map((k) => k.toBase58())), /one instruction goes ahead of CastVote/);
  console.log("read-state, mint, crank-distribute and vote-weight ran");

  step("every instruction");
  const all = [
    "initialize", "createVaults", "createSusdqVaults", "addCollateral", "setCollateral", "setParams", "setRoles", "acceptAdmin", "setBridgeRoute",
    "setTokenMetadata", "pause", "unpause", "unpauseCollateral", "mintWithUsdc", "redeemForUsdc", "mintWithCollateral", "redeemForCollateral",
    "stakeUsdq", "startUsdqCooldown", "claimUsdq", "reportHedge", "landUsdc", "bridgeOut", "swap", "distribute", "coverDeficit", "buyback",
    "sellSlashed", "setAequa", "stakeAequa", "startAequaUnstake", "withdrawAequa", "observePool", "createVoterWeightRecord",
    "updateVoterWeightRecord", "createMaxVoterWeightRecord", "updateMaxVoterWeightRecord",
  ];
  assert.equal(all.length, 37);
  for (const name of all) console.log(`  ${name.padEnd(28)} ${results.get(name) ?? "MISSING"}`);
  assert.deepEqual(all.filter((n) => !results.has(n)), [], "every instruction ran");
  console.log("\nlocalnet: ok");
} finally {
  pythServer.close();
  if (validatorPid) execFileSync("wsl.exe", ["--exec", "kill", validatorPid]);
}
