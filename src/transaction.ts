// Transactions for the program: v0 messages over its lookup table, a compute budget first, a
// priced instruction right after the ed25519 check of its update, simulated before signing, and
// sent with a confirmation that polls the signature and resends until the blockhash expires.

import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type AddressLookupTableAccount,
  type Commitment,
  type Connection,
  type Signer,
  type TransactionInstruction,
} from "@solana/web3.js";
import { AequaError, refusal, toAequaError } from "./errors.js";
import { parseEvents, type AequaEvent } from "./events.js";
import { ed25519Instruction } from "./pyth.js";

/** Every transaction built here starts with these two: the compute unit limit, then its price. */
export const BUDGET_INSTRUCTIONS = 2;
/** The most a transaction may weigh on the wire. */
export const MAX_TRANSACTION_BYTES = 1_232;
const MAX_UNITS = 1_400_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The instructions of a priced transaction after the compute budget: `before`, the ed25519
 * check, then the instruction `build` makes for that check's index. Wallets keep a compute
 * budget that is there and add their own instructions after the last one, so the index holds.
 */
export async function withPrice(
  envelope: Uint8Array,
  build: (ed25519Index: number) => Promise<TransactionInstruction>,
  before: TransactionInstruction[] = [],
): Promise<TransactionInstruction[]> {
  const ed25519Index = BUDGET_INSTRUCTIONS + before.length;
  return [...before, ed25519Instruction(envelope, ed25519Index + 1), await build(ed25519Index)];
}

export type Compose = {
  payer: PublicKey;
  /** Everything after the compute budget. */
  instructions: TransactionInstruction[];
  recentBlockhash: string;
  /** Compute units; the most a transaction may use when omitted. */
  units?: number;
  /** Micro-lamports per compute unit. */
  priorityFee?: number;
  lookupTables?: AddressLookupTableAccount[];
};

/** A v0 transaction with the compute budget first, unsigned. `TooLarge` when it can't fit on the wire. */
export function compose(o: Compose): VersionedTransaction {
  const budget = [ComputeBudgetProgram.setComputeUnitLimit({ units: o.units ?? MAX_UNITS }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: o.priorityFee ?? 0 })];
  const message = new TransactionMessage({ payerKey: o.payer, recentBlockhash: o.recentBlockhash, instructions: [...budget, ...o.instructions] }).compileToV0Message(o.lookupTables ?? []);
  const tx = new VersionedTransaction(message);
  let bytes = Infinity;
  try {
    bytes = tx.serialize().length;
  } catch {
    // web3.js can't even encode a message past the limit.
  }
  if (bytes > MAX_TRANSACTION_BYTES) {
    throw new AequaError("TooLarge", `the transaction needs more than ${MAX_TRANSACTION_BYTES} bytes: give it the program's lookup table (lookupTableAddresses)`);
  }
  return tx;
}

export type Simulation = { units: number; logs: string[]; events: AequaEvent[] };

/** Simulates without signatures; throws an `AequaError` naming the refusal. */
export async function simulate(connection: Connection, tx: VersionedTransaction, what = "transaction"): Promise<Simulation> {
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
  const logs = sim.value.logs ?? [];
  if (sim.value.err) throw refusal(sim.value.err, logs, what);
  return { units: sim.value.unitsConsumed ?? 0, logs, events: parseEvents(logs) };
}

export type Prepared = { transaction: VersionedTransaction; simulation: Simulation; blockhash: { blockhash: string; lastValidBlockHeight: number } };

/**
 * Builds, simulates, and builds again with the compute units the simulation used (plus room),
 * ready to sign. `signers`, when given, sign it.
 */
export async function prepare(
  connection: Connection,
  o: Omit<Compose, "recentBlockhash" | "units"> & { signers?: Signer[]; label?: string },
): Promise<Prepared> {
  const blockhash = await connection.getLatestBlockhash("confirmed");
  const simulation = await simulate(connection, compose({ ...o, recentBlockhash: blockhash.blockhash }), o.label);
  const units = Math.min(MAX_UNITS, Math.ceil(simulation.units * 1.2) + 10_000);
  const transaction = compose({ ...o, recentBlockhash: blockhash.blockhash, units });
  if (o.signers?.length) transaction.sign(o.signers);
  return { transaction, simulation, blockhash };
}

/**
 * Sends a signed transaction and waits for it: the node checks it first, so a refusal comes
 * back at once with its name; then `confirmSignature` waits for it, resending it every two
 * seconds while its blockhash lives.
 */
export async function sendAndConfirm(
  connection: Connection,
  tx: VersionedTransaction,
  o: { lastValidBlockHeight?: number; commitment?: Commitment; skipPreflight?: boolean } = {},
): Promise<string> {
  const raw = tx.serialize();
  let signature: string;
  try {
    signature = await connection.sendRawTransaction(raw, { skipPreflight: o.skipPreflight ?? false, preflightCommitment: "confirmed", maxRetries: 0 });
  } catch (e) {
    throw toAequaError(e);
  }
  return confirmSignature(connection, signature, { lastValidBlockHeight: o.lastValidBlockHeight, commitment: o.commitment, resend: raw });
}

/**
 * Waits for a transaction already sent, here or by a wallet that sends itself: the signature
 * is polled every second and `resend`, its signed bytes when they are at hand, sent again every
 * two. Once its blockhash has expired it can no longer land, and its status is read through
 * history before it is called `Expired`; a status that can't be read is `Unconfirmed`. A
 * transaction that failed on chain comes back as an `AequaError` naming the refusal.
 */
export async function confirmSignature(
  connection: Connection,
  signature: string,
  o: { lastValidBlockHeight?: number; commitment?: Commitment; resend?: Uint8Array } = {},
): Promise<string> {
  const want = o.commitment ?? "confirmed";
  const last = o.lastValidBlockHeight ?? (await connection.getLatestBlockhash("confirmed")).lastValidBlockHeight;

  const look = async (searchTransactionHistory: boolean): Promise<"landed" | "pending" | "absent" | "unknown"> => {
    let status;
    try {
      status = (await connection.getSignatureStatuses([signature], { searchTransactionHistory })).value[0];
    } catch {
      return "unknown";
    }
    if (!status) return "absent";
    if (status.err) {
      const t = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
      throw refusal(status.err, t?.meta?.logMessages);
    }
    return status.confirmationStatus === want || status.confirmationStatus === "finalized" ? "landed" : "pending";
  };

  for (let i = 1; ; i++) {
    await sleep(1_000);
    if ((await look(false)) === "landed") return signature;
    if (i % 2 !== 0) continue;
    const height = await connection.getBlockHeight("confirmed").catch(() => 0);
    if (height <= last) {
      if (o.resend) await connection.sendRawTransaction(o.resend, { skipPreflight: true, maxRetries: 0 }).catch(() => undefined);
      continue;
    }
    // Past its blockhash's life: landed in one of the last blocks, or never will.
    let absent = 0;
    for (let k = 0; k < 10; k++) {
      const seen = await look(true);
      if (seen === "landed") return signature;
      absent = seen === "absent" ? absent + 1 : 0;
      if (absent >= 2) throw new AequaError("Expired", `${signature} did not land before its blockhash expired`);
      await sleep(1_000);
    }
    throw new AequaError("Unconfirmed", `${signature}'s status couldn't be settled: look it up before sending the action again`);
  }
}

/**
 * Prepares, signs, sends and confirms what `build` returns, building again for each attempt: a
 * transaction carrying a signed price fetches a fresh one each time. A refusal for a stale price
 * is tried again, and so is a transaction whose blockhash expired without it landing; nothing
 * else is. The first signer pays.
 */
export async function sendFresh(
  connection: Connection,
  o: Omit<Compose, "recentBlockhash" | "units" | "instructions" | "payer"> & {
    signers: Signer[];
    build: () => Promise<TransactionInstruction[]>;
    attempts?: number;
    label?: string;
  },
): Promise<string> {
  const attempts = o.attempts ?? 3;
  for (let attempt = 1; ; attempt++) {
    try {
      const { transaction, blockhash } = await prepare(connection, { ...o, payer: o.signers[0].publicKey, instructions: await o.build() });
      return await sendAndConfirm(connection, transaction, { lastValidBlockHeight: blockhash.lastValidBlockHeight });
    } catch (e) {
      const again = e instanceof AequaError && (e.is("StalePrice") || e.code === "Expired");
      if (!again || attempt >= attempts) throw e;
    }
  }
}

/** A lookup table's current contents. */
export async function lookupTable(connection: Connection, address: PublicKey): Promise<AddressLookupTableAccount> {
  const res = await connection.getAddressLookupTable(address);
  if (!res.value) throw new Error(`no lookup table at ${address.toBase58()}`);
  return res.value;
}
