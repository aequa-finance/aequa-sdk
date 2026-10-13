// Events out of logs, refusals out of whatever they arrive as, and the program's lookup table.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Keypair, SendTransactionError } from "@solana/web3.js";
import BN from "bn.js";
import idl from "../src/idl/aequa.json" with { type: "json" };
import {
  AequaError,
  codeFromLogs,
  codeFromTransactionError,
  ERRORS,
  errorName,
  failureFromLogs,
  findEvent,
  lookupTableAddresses,
  parseEvents,
  PDA,
  program,
  PROGRAM_ID,
  refusal,
  toAequaError,
  USDC_MINT,
} from "../src/index.js";

test("events come out of logs by name, with bigint amounts", async () => {
  const user = Keypair.generate().publicKey;
  const minted = { user, asset: USDC_MINT, amountIn: new BN(1_000_000), usdqOut: new BN(999_000), fee: new BN(1_000), feeTo: 0, feeBps: 10, priceE8: new BN(0), session: 0 };
  const staked = { user, usdq: new BN(5), shares: new BN(4) };
  const line = (name: string, data: object) => {
    const disc = idl.events.find((e) => e.name.toLowerCase() === name.toLowerCase())!.discriminator;
    return `Program data: ${Buffer.concat([Buffer.from(disc), program().coder.types.encode(name, data)]).toString("base64")}`;
  };
  const logs = [
    `Program ${PROGRAM_ID} invoke [1]`,
    "Program log: Instruction: MintWithUsdc",
    line("minted", minted),
    line("usdqStaked", staked),
    `Program ${PROGRAM_ID} consumed 21000 of 200000 compute units`,
    `Program ${PROGRAM_ID} success`,
  ];
  const events = parseEvents(logs);
  assert.deepEqual(
    events.map((e) => e.name),
    ["minted", "usdqStaked"],
  );
  const m = findEvent(events, "minted")!;
  assert.equal(m.usdqOut, 999_000n);
  assert.ok(m.user.equals(user));
  assert.equal(findEvent(events, "usdqStaked")!.shares, 4n);
  assert.equal(findEvent(events, "redeemed"), undefined);
  assert.deepEqual(parseEvents(null), []);
});

test("every program error by name and number", () => {
  assert.equal(Object.keys(ERRORS).length, idl.errors.length);
  assert.equal(ERRORS.StalePrice.code, 6013);
  assert.equal(errorName(6040), "ReportTimeOutOfRange");
  for (const e of idl.errors) assert.equal(ERRORS[e.name as keyof typeof ERRORS].code, e.code);
});

test("a refusal's name, from logs, a transaction error or a send error", () => {
  const aequa = PROGRAM_ID.toBase58();
  const jupiter = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
  const token = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  // This program's own refusal.
  const own = [
    `Program ${aequa} invoke [1]`,
    "Program log: AnchorError thrown in programs/aequa/src/pyth.rs:214. Error Code: StalePrice. Error Number: 6013. Error Message: The signed price is older than the freshness limit.",
    `Program ${aequa} failed: custom program error: 0x177d`,
  ];
  assert.deepEqual(failureFromLogs(own), { code: "StalePrice", program: aequa });
  const r = refusal({ InstructionError: [3, { Custom: 6013 }] }, own, "mint_with_collateral");
  assert.ok(r.is("StalePrice"));
  assert.match(r.message, /^mint_with_collateral refused: StalePrice \(The signed price/);
  // A program it calls failing with a number from the same range is that program's.
  const called = [
    `Program ${aequa} invoke [1]`,
    `Program ${jupiter} invoke [2]`,
    "Program log: AnchorError occurred. Error Code: SlippageToleranceExceeded. Error Number: 6001. Error Message: Slippage tolerance exceeded.",
    `Program ${jupiter} failed: custom program error: 0x1771`,
    `Program ${aequa} failed: custom program error: 0x1771`,
  ];
  const c = refusal({ InstructionError: [3, { Custom: 6001 }] }, called);
  assert.equal(c.code, "SlippageToleranceExceeded");
  assert.equal(c.program, jupiter);
  assert.equal(c.is("InsufficientFunds"), false);
  // A program without Anchor's logs: its number, named as its own.
  const plain = [`Program ${aequa} invoke [1]`, `Program ${token} invoke [2]`, "Program log: Error: insufficient funds", `Program ${token} failed: custom program error: 0x1`, `Program ${aequa} failed: custom program error: 0x1`];
  assert.deepEqual(failureFromLogs(plain), { code: "Custom1", program: token });
  // Without logs a number can't be placed.
  assert.equal(codeFromTransactionError({ InstructionError: [3, { Custom: 6035 }] }), "Custom6035");
  assert.equal(errorName(6035), "Paused");
  assert.equal(codeFromTransactionError({ InstructionError: [0, "InvalidAccountData"] }), "InvalidAccountData");
  assert.equal(codeFromTransactionError("BlockhashNotFound"), "BlockhashNotFound");
  assert.equal(codeFromTransactionError({ InsufficientFundsForRent: { account_index: 0 } } as never), "InsufficientFundsForRent");
  assert.equal(codeFromLogs(["Program log: hello"]), undefined);
  // web3.js's send errors: the logs when they come, the RPC's words when they don't.
  const sent = (transactionMessage: string, logs: string[] = []) => new SendTransactionError({ action: "send", signature: "", transactionMessage, logs });
  assert.equal(toAequaError(sent("Transaction simulation failed: Error processing Instruction 3: custom program error: 0x1772", own)).code, "StalePrice");
  assert.equal(toAequaError(sent("Transaction simulation failed: Error processing Instruction 3: custom program error: 0x1772")).code, "Custom6002");
  assert.equal(toAequaError(sent("Transaction simulation failed: Blockhash not found")).code, "BlockhashNotFound");
  assert.equal(toAequaError(sent("Transaction simulation failed: Insufficient funds for fee")).code, "InsufficientFundsForFee");
  assert.equal(toAequaError(sent("Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.")).code, "AccountNotFound");
});

test("the lookup table holds every address the transactions reuse, once", () => {
  const list = lookupTableAddresses().map((k) => k.toBase58());
  assert.equal(new Set(list).size, list.length);
  assert.ok(list.length <= 256);
  for (const k of [PROGRAM_ID, ...Object.values(PDA)]) assert.ok(list.includes(k.toBase58()), k.toBase58());
});
