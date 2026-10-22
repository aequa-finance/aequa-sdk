// Composing, sending and retrying, against an RPC scripted here: a landing, a refusal, an expiry,
// a landing seen only after the blockhash expired, an RPC that can't answer, a transaction a
// wallet sent itself, and fresh builds after a stale price.

import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { AddressLookupTableAccount, Keypair, PublicKey, type Connection, type SignatureStatus } from "@solana/web3.js";
import { AequaError, compose, COLLATERAL, confirmSignature, instructions, lookupTable, lookupTableAddresses, PROGRAM_ID, sendAndConfirm, sendFresh, withPrice } from "../src/index.js";

const payer = Keypair.generate();
const blockhash = "4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM";
const aequa = PROGRAM_ID.toBase58();
const stale = [`Program ${aequa} invoke [1]`, "Program log: AnchorError thrown in programs/aequa/src/pyth.rs:214. Error Code: StalePrice. Error Number: 6013. Error Message: x.", `Program ${aequa} failed: custom program error: 0x177d`];

/** Lets the code under test run its one-second sleeps without waiting for them. */
async function drive<T>(t: TestContext, run: () => Promise<T>): Promise<T> {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let settled = false;
  const p = run().finally(() => (settled = true));
  p.catch(() => undefined);
  try {
    while (!settled) {
      await new Promise((r) => setImmediate(r));
      t.mock.timers.tick(1_000);
    }
    return await p;
  } finally {
    t.mock.timers.reset();
  }
}

type Script = { status: (history: boolean, call: number) => Partial<SignatureStatus> | null | "throw"; height?: number; logs?: string[] };

function rpc(s: Script) {
  let calls = 0;
  const sends: number[] = [];
  const connection = {
    sendRawTransaction: async () => (sends.push(sends.length), "sig"),
    getSignatureStatuses: async (_: string[], o?: { searchTransactionHistory?: boolean }) => {
      const r = s.status(!!o?.searchTransactionHistory, ++calls);
      if (r === "throw") throw new Error("rpc down");
      return { context: { slot: 1 }, value: [r] };
    },
    getBlockHeight: async () => s.height ?? 0,
    getTransaction: async () => ({ meta: { logMessages: s.logs ?? [] } }),
    getLatestBlockhash: async () => ({ blockhash, lastValidBlockHeight: 100 }),
  };
  return { connection: connection as unknown as Connection, sends };
}

const signed = async () => {
  const tx = compose({ payer: payer.publicKey, instructions: [await instructions.landUsdc()], recentBlockhash: blockhash });
  tx.sign([payer]);
  return tx;
};
const confirmed = { confirmationStatus: "confirmed", err: null } as const;

test("a transaction too large for the wire is named, and fits through the lookup table", async () => {
  // `distribute` with a third listing and its price, without the program's lookup table.
  const mints = [COLLATERAL.SPYx.mint, COLLATERAL.QQQx.mint, Keypair.generate().publicKey];
  const envelope = new Uint8Array(102 + 14 + 3 * 30);
  const ixs = await withPrice(envelope, (ed25519Index) => instructions.distribute({ caller: payer.publicKey, collateral: mints, message: envelope, ed25519Index }));
  assert.throws(() => compose({ payer: payer.publicKey, instructions: ixs, recentBlockhash: blockhash }), (e) => e instanceof AequaError && e.code === "TooLarge");
  const addresses = lookupTableAddresses(mints.map((mint) => ({ mint, tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") })));
  const table = new AddressLookupTableAccount({ key: Keypair.generate().publicKey, state: { deactivationSlot: 2n ** 64n - 1n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: undefined, addresses } });
  assert.ok(compose({ payer: payer.publicKey, instructions: ixs, recentBlockhash: blockhash, lookupTables: [table] }).serialize().length <= 1_232);
});

test("lands: the signature once it's confirmed", async (t) => {
  const { connection } = rpc({ status: (_, call) => (call < 3 ? null : confirmed) });
  assert.equal(await drive(t, async () => sendAndConfirm(connection, await signed(), { lastValidBlockHeight: 100 })), "sig");
});

test("refused on chain: the program's error, from the landed transaction's logs", async (t) => {
  const { connection } = rpc({ status: () => ({ confirmationStatus: "confirmed", err: { InstructionError: [2, { Custom: 6013 }] } }), logs: stale });
  await assert.rejects(
    drive(t, async () => sendAndConfirm(connection, await signed(), { lastValidBlockHeight: 100 })),
    (e) => e instanceof AequaError && e.is("StalePrice"),
  );
});

test("expired: never seen, even through history, once the blockhash ran out", async (t) => {
  const { connection, sends } = rpc({ status: () => null, height: 101 });
  await assert.rejects(
    drive(t, async () => sendAndConfirm(connection, await signed(), { lastValidBlockHeight: 100 })),
    (e) => e instanceof AequaError && e.code === "Expired",
  );
  assert.equal(sends.length, 1, "nothing is resent past the blockhash");
});

test("landed in the last blocks: found through history, never called expired", async (t) => {
  const { connection } = rpc({ status: (history) => (history ? confirmed : null), height: 101 });
  assert.equal(await drive(t, async () => sendAndConfirm(connection, await signed(), { lastValidBlockHeight: 100 })), "sig");
});

test("a status that can't be read is unconfirmed, not expired", async (t) => {
  const { connection } = rpc({ status: (history) => (history ? "throw" : null), height: 101 });
  await assert.rejects(
    drive(t, async () => sendAndConfirm(connection, await signed(), { lastValidBlockHeight: 100 })),
    (e) => e instanceof AequaError && e.code === "Unconfirmed",
  );
});

test("sendFresh builds again after a stale price, and only then", async (t) => {
  let builds = 0;
  let simulations = 0;
  const { connection } = rpc({ status: () => confirmed });
  const sim = (err: unknown, logs: string[]) => ({ context: { slot: 1 }, value: { err, logs, unitsConsumed: 10_000 } });
  Object.assign(connection, { simulateTransaction: async () => (++simulations === 1 ? sim({ InstructionError: [2, { Custom: 6013 }] }, stale) : sim(null, [])) });
  const build = async () => (builds++, [await instructions.landUsdc()]);
  assert.equal(await drive(t, () => sendFresh(connection, { signers: [payer], build })), "sig");
  assert.equal(builds, 2);

  const paused = [`Program ${aequa} invoke [1]`, "Program log: AnchorError occurred. Error Code: Paused. Error Number: 6035. Error Message: x.", `Program ${aequa} failed: custom program error: 0x178b`];
  Object.assign(connection, { simulateTransaction: async () => sim({ InstructionError: [2, { Custom: 6035 }] }, paused) });
  builds = 0;
  await assert.rejects(
    drive(t, () => sendFresh(connection, { signers: [payer], build })),
    (e) => e instanceof AequaError && e.is("Paused"),
  );
  assert.equal(builds, 1, "a refusal other than a stale price isn't retried");
});

test("a transaction the wallet sent itself is waited for, never sent again", async (t) => {
  const { connection, sends } = rpc({ status: (_, call) => (call < 4 ? null : confirmed) });
  assert.equal(await drive(t, () => confirmSignature(connection, "sig", { lastValidBlockHeight: 100 })), "sig");
  assert.equal(sends.length, 0);

  const refused = rpc({ status: () => ({ confirmationStatus: "confirmed", err: { InstructionError: [2, { Custom: 6013 }] } }), logs: stale });
  await assert.rejects(
    drive(t, () => confirmSignature(refused.connection, "sig")),
    (e) => e instanceof AequaError && e.is("StalePrice"),
  );
});

test("a lookup table that isn't there is named", async () => {
  const connection = { getAddressLookupTable: async () => ({ context: { slot: 1 }, value: null }) } as unknown as Connection;
  await assert.rejects(lookupTable(connection, Keypair.generate().publicKey), (e) => e instanceof AequaError && e.code === "NoLookupTable");
});
