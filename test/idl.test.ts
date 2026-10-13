// Every builder against the program's IDL: one builder per instruction, the discriminator, every
// account in order with its signer and writable flags, fixed addresses, and every PDA the IDL can
// derive (its seeds re-derived here from the IDL itself, not from pda.ts).

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Keypair, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import idl from "../src/idl/aequa.json" with { type: "json" };
import module from "../src/idl/idl.js";
import { bridgeArgs, COLLATERAL, IDL, instructions as ix, PROGRAM_ID, TOKEN_PROGRAM, type ListingArgs, type ReportArgs } from "../src/index.js";
import { launchParams } from "./helpers.js";

type Seed = { kind: "const"; value: number[] } | { kind: "account" | "arg"; path: string };
type IdlAccount = { name: string; signer?: boolean; writable?: boolean; optional?: boolean; address?: string; pda?: { seeds: Seed[]; program?: Seed }; accounts?: IdlAccount[] };
type IdlInstruction = { name: string; discriminator: number[]; accounts: IdlAccount[]; args: { name: string; type: unknown }[] };

const camel = (s: string) => s.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());
const key = () => Keypair.generate().publicKey;
const [user, admin, payer, keeper, reporter, realm, voter, event] = Array.from({ length: 8 }, key);
const aequa = { mint: key(), tokenProgram: TOKEN_PROGRAM };
const quote = { mint: key(), tokenProgram: TOKEN_PROGRAM };
const pool = { pool: key(), poolAequaVault: key(), poolQuoteVault: key(), quoteFeed: 0 };
const spyx = COLLATERAL.SPYx.mint;
const message = Uint8Array.from({ length: 191 }, (_, i) => i % 251);
const priced = { message, ed25519Index: 2 };
const route = { data: Uint8Array.from([9, 8, 7]), accounts: [{ pubkey: key(), isSigner: false, isWritable: true }] };
const listing: ListingArgs = { feed: 1398, bandsBps: [5, 15, 15, 25], spotCap: 1n, hourlyCap: 1n, perp: Array(24).fill(0), perpAsset: 0 };
const report: ReportArgs = { accountValue: 0n, shortNotional: Array(8).fill(0n), marketLive: 3, creditedTotal: 0n, withdrawnTotal: 0n, hlTime: 1n };

/** One call per instruction, and the arguments its seeds use. */
const samples: Record<string, { build: () => Promise<TransactionInstruction>; args?: Record<string, PublicKey> }> = {
  acceptAdmin: { build: () => ix.acceptAdmin({ pendingAdmin: admin }) },
  addCollateral: { build: () => ix.addCollateral({ payer, admin, mint: spyx, listing }) },
  bridgeOut: { build: () => ix.bridgeOut({ keeper, messageSentEventData: event, amount: 10n, maxFee: 1n, fast: true }) },
  buyback: { build: () => ix.buyback({ caller: user, aequa, amount: 5n, route, ...priced }) },
  claimUsdq: { build: () => ix.claimUsdq({ user }) },
  coverDeficit: { build: () => ix.coverDeficit({ caller: user, aequa, ...priced }) },
  createMaxVoterWeightRecord: { build: () => ix.createMaxVoterWeightRecord({ payer, realm, aequaMint: aequa.mint }), args: { realm } },
  createSusdqVaults: { build: () => ix.createSusdqVaults({ payer, admin }) },
  createVaults: { build: () => ix.createVaults({ payer, admin }) },
  createVoterWeightRecord: { build: () => ix.createVoterWeightRecord({ payer, realm, aequaMint: aequa.mint, voter }), args: { realm } },
  distribute: { build: () => ix.distribute({ caller: user, collateral: [spyx, COLLATERAL.QQQx.mint], ...priced }) },
  initialize: { build: () => ix.initialize({ payer, admin, guardian: key(), keeper, reporter, params: launchParams() }) },
  landUsdc: { build: () => ix.landUsdc() },
  mintWithCollateral: { build: () => ix.mintWithCollateral({ user, mint: spyx, amount: 1n, minOut: 0n, withStake: true, ...priced }) },
  mintWithUsdc: { build: () => ix.mintWithUsdc({ user, amount: 1n, minOut: 0n, withStake: true }) },
  observePool: { build: () => ix.observePool({ keeper, poolAequaVault: pool.poolAequaVault, poolQuoteVault: pool.poolQuoteVault }) },
  pause: { build: () => ix.pause({ signer: admin, paths: 1, collateral: spyx }) },
  redeemForCollateral: { build: () => ix.redeemForCollateral({ user, mint: spyx, amount: 1n, minOut: 0n, ...priced }) },
  redeemForUsdc: { build: () => ix.redeemForUsdc({ user, amount: 1n, minOut: 0n }) },
  reportHedge: { build: () => ix.reportHedge({ reporter, report }) },
  sellSlashed: { build: () => ix.sellSlashed({ caller: user, aequa, amount: 5n, route, ...priced }) },
  setAequa: { build: () => ix.setAequa({ payer, admin, aequa, quote, pool }) },
  setBridgeRoute: { build: () => ix.setBridgeRoute({ admin, route: bridgeArgs("0x" + "ab".repeat(20), 1, 1_000_000n) }) },
  setCollateral: { build: () => ix.setCollateral({ admin, mint: spyx, listing }) },
  setParams: { build: () => ix.setParams({ admin, params: launchParams() }) },
  setRoles: { build: () => ix.setRoles({ admin, guardian: key(), keeper, reporter, pendingAdmin: key() }) },
  setTokenMetadata: { build: () => ix.setTokenMetadata({ payer, admin, mint: COLLATERAL.QQQx.mint, token: { name: "USDq", symbol: "USDq", uri: "https://example.com/usdq.json" } }) },
  stakeAequa: { build: () => ix.stakeAequa({ user, aequa, amount: 1n, minShares: 0n }) },
  stakeUsdq: { build: () => ix.stakeUsdq({ user, amount: 1n, minShares: 0n }) },
  startAequaUnstake: { build: () => ix.startAequaUnstake({ user }) },
  startUsdqCooldown: { build: () => ix.startUsdqCooldown({ user, shares: 1n }) },
  swap: { build: () => ix.swap({ keeper, mint: spyx, buy: true, amountIn: 1n, route, ...priced }) },
  unpause: { build: () => ix.unpause({ admin, paths: 1 }) },
  unpauseCollateral: { build: () => ix.unpauseCollateral({ admin, mint: spyx }) },
  updateMaxVoterWeightRecord: { build: () => ix.updateMaxVoterWeightRecord({ realm, aequaMint: aequa.mint }) },
  updateVoterWeightRecord: { build: () => ix.updateVoterWeightRecord({ realm, aequaMint: aequa.mint, voter, withStake: false, action: { castVote: {} }, target: key() }) },
  withdrawAequa: { build: () => ix.withdrawAequa({ user, aequa }) },
};

const instructions = idl.instructions as unknown as IdlInstruction[];

test("one builder for every instruction in the IDL, and none besides", () => {
  const names = instructions.map((i) => camel(i.name)).sort();
  assert.equal(names.length, 37);
  assert.deepEqual(Object.keys(samples).sort(), names);
  const exported = Object.entries(ix)
    .filter(([, v]) => typeof v === "function")
    .map(([k]) => k)
    .sort();
  assert.deepEqual(exported, names);
});

const flatten = (list: IdlAccount[], prefix = ""): (IdlAccount & { path: string })[] =>
  list.flatMap((a) => (a.accounts ? flatten(a.accounts, `${prefix}${a.name}.`) : [{ ...a, path: prefix + a.name }]));

let derived = 0;
for (const i of instructions) {
  test(`${i.name}: discriminator, accounts, flags, addresses and seeds`, async () => {
    const sample = samples[camel(i.name)];
    const built = await sample.build();
    assert.ok(built.programId.equals(PROGRAM_ID));
    assert.deepEqual([...built.data.subarray(0, 8)], i.discriminator, "discriminator");
    const flat = flatten(i.accounts);
    assert.ok(built.keys.length >= flat.length, "every account the IDL names");
    const byName = new Map<string, PublicKey>();
    flat.forEach((a, k) => byName.set(a.name, built.keys[k].pubkey).set(a.path, built.keys[k].pubkey));
    const resolve = (s: Seed): Uint8Array | null => {
      if (s.kind === "const") return Uint8Array.from(s.value);
      if (s.kind === "arg") return sample.args?.[s.path]?.toBytes() ?? null;
      return s.path.includes(".") ? null : (byName.get(s.path)?.toBytes() ?? null);
    };
    flat.forEach((a, k) => {
      const meta = built.keys[k];
      const omitted = !!a.optional && meta.pubkey.equals(PROGRAM_ID);
      assert.equal(meta.isSigner, !omitted && !!a.signer, `${a.path} signer`);
      assert.equal(meta.isWritable, !omitted && !!a.writable, `${a.path} writable`);
      if (a.address) assert.equal(meta.pubkey.toBase58(), a.address, `${a.path} address`);
      if (a.pda && !omitted) {
        const seeds = a.pda.seeds.map(resolve);
        const program = a.pda.program ? resolve(a.pda.program) : PROGRAM_ID.toBytes();
        if (seeds.every((s) => s) && program) {
          const want = PublicKey.findProgramAddressSync(seeds as Uint8Array[], new PublicKey(program))[0];
          assert.equal(meta.pubkey.toBase58(), want.toBase58(), `${a.path} seeds`);
          derived++;
        }
      }
    });
    // A signed price travels as the first argument, at the offset the ed25519 check points to.
    if (i.args[0]?.name === "message") {
      assert.equal(built.data.readUInt32LE(8), message.length);
      assert.deepEqual(Uint8Array.from(built.data.subarray(12, 12 + message.length)), message);
    }
  });
}

// Seeds that read another account's data (`collateral.mint`, `config.aequa.mint`) are left to the localnet run.
test("the seed checks above derived the program's PDAs", () => assert.ok(derived >= 120, `only ${derived} PDAs derived`));

test("optional accounts: present when asked for, the program's id when not", async () => {
  const withStake = await ix.mintWithUsdc({ user, amount: 1n, minOut: 0n, withStake: true });
  const without = await ix.mintWithUsdc({ user, amount: 1n, minOut: 0n });
  assert.ok(!withStake.keys[9].pubkey.equals(PROGRAM_ID) && !withStake.keys[10].pubkey.equals(PROGRAM_ID));
  assert.ok(without.keys[9].pubkey.equals(PROGRAM_ID) && without.keys[10].pubkey.equals(PROGRAM_ID));
});

test("distribute names each listing's account, mint and vault, read only, in order", async () => {
  const built = await ix.distribute({ caller: user, collateral: [spyx, COLLATERAL.QQQx.mint], ...priced });
  const rest = built.keys.slice(flatten(instructions.find((x) => x.name === "distribute")!.accounts).length);
  assert.equal(rest.length, 6);
  assert.ok(rest.every((m) => !m.isSigner && !m.isWritable));
  assert.ok(rest[1].pubkey.equals(spyx) && rest[4].pubkey.equals(COLLATERAL.QQQx.mint));
});

test("the IDL the SDK loads is the IDL file", () => {
  assert.deepEqual(module, idl, "run the program's scripts/idl.sh");
  assert.equal(IDL, module);
});

const built = process.env.AEQUA_PROGRAM_DIR ? join(process.env.AEQUA_PROGRAM_DIR, "target/idl/aequa.json") : undefined;

test("the SDK's IDL is the program's current build", { skip: !built || !existsSync(built) }, () => {
  const program = readFileSync(built!, "utf8");
  const ours = readFileSync(new URL("../src/idl/aequa.json", import.meta.url), "utf8");
  assert.equal(ours, program, "run the program's scripts/idl.sh");
});
