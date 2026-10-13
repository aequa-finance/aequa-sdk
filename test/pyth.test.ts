// Signed Pyth Pro updates read as the program reads them (pyth.rs tests), and the ed25519 check
// pointing at the right bytes of a real signature inside a built instruction.

import assert from "node:assert/strict";
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { test } from "node:test";
import { Keypair } from "@solana/web3.js";
import { AequaError, COLLATERAL, ED25519_PROGRAM, ed25519Instruction, feedPrice, instructions, isLive, parseEnvelope, requireFresh, withPrice } from "../src/index.js";
import { envelope, payload } from "./helpers.js";

const refuses = (f: () => unknown, code: string) => assert.throws(f, (e) => e instanceof AequaError && e.code === code);
const ts = 1_791_471_600_000_000n;

test("reads feeds and sessions", () => {
  const u = parseEnvelope(
    envelope(
      payload(ts, 3, [
        { id: 1398, price: 66_512_340n, session: 0, updatedUs: ts },
        { id: 1363, price: 59_001_000n, session: 3, updatedUs: ts - 100_000n },
      ]),
    ),
  );
  assert.equal(u.feeds.length, 2);
  requireFresh(u, 1_791_471_605, 10);
  refuses(() => requireFresh(u, 1_791_471_611, 10), "StalePrice");
  assert.deepEqual(feedPrice(u, 1398, 10), { priceE8: 66_512_340_000n, session: 0 });
  assert.equal(feedPrice(u, 1363, 10).session, 3);
  refuses(() => feedPrice(u, 1, 10), "CollateralNotLive");
  assert.equal(isLive(u, 1398, 1_791_471_605, 10), true);
  assert.equal(isLive(u, 1398, 1_791_471_611, 10), false);
});

test("closed sessions and prices carried forward aren't live", () => {
  const u = parseEnvelope(
    envelope(
      payload(ts, 3, [
        { id: 1398, price: 66_512_340n, session: 4, updatedUs: ts },
        { id: 1363, price: 59_001_000n, session: 0, updatedUs: ts - 60_000_000n },
      ]),
    ),
  );
  refuses(() => feedPrice(u, 1398, 10), "CollateralNotLive");
  refuses(() => feedPrice(u, 1363, 10), "CollateralNotLive");
});

test("refuses what the program refuses to read", () => {
  const body = payload(ts, 3, [{ id: 1398, price: 1n, session: 0, updatedUs: ts }]);
  refuses(() => parseEnvelope(Uint8Array.from([...envelope(body), 0])), "InvalidPythMessage");
  const unknown = Uint8Array.from(body);
  unknown[19] = 99;
  refuses(() => parseEnvelope(envelope(unknown)), "InvalidPythMessage");
  const u = parseEnvelope(envelope(payload(ts, 4, [{ id: 1398, price: 1n, session: 0, updatedUs: ts }])));
  refuses(() => requireFresh(u, 1_791_471_600, 10), "WrongPythChannel");
});

test("the ed25519 check covers the signature, signer and payload inside the priced instruction", async () => {
  // A real Ed25519 signature over a payload, as Pyth Pro's signer makes it.
  const seed = Buffer.alloc(32, 5);
  const priv = createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" });
  const pub = (createPublicKey(priv).export({ format: "der", type: "spki" }) as Buffer).subarray(-32);
  const body = payload(ts, 3, [{ id: 1398, price: 66_512_340n, session: 0, updatedUs: ts }]);
  const signed = envelope(body, sign(null, body, priv), pub);

  const user = Keypair.generate().publicKey;
  const before = [await instructions.landUsdc()];
  const ixs = await withPrice(signed, (ed25519Index) => instructions.mintWithCollateral({ user, mint: COLLATERAL.SPYx.mint, amount: 1n, minOut: 0n, message: signed, ed25519Index }), before);
  assert.equal(ixs.length, before.length + 2);
  const [check, priced] = ixs.slice(-2);
  assert.ok(check.programId.equals(ED25519_PROGRAM));
  // After the two compute-budget instructions and one before it: the check is #3, the priced one #4.
  assert.equal(priced.data.readUInt16LE(12 + signed.length), 3, "the program is told where the check is");
  const d = check.data;
  const field = (k: number) => d.readUInt16LE(2 + 2 * k);
  assert.equal(d[0], 1);
  for (const k of [1, 3, 6]) assert.equal(field(k), 4, "every offset points into the priced instruction");
  const sig = priced.data.subarray(field(0), field(0) + 64);
  const key = priced.data.subarray(field(2), field(2) + 32);
  const msg = priced.data.subarray(field(4), field(4) + field(5));
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), key]);
  assert.ok(verify(null, msg, createPublicKey({ key: spki, format: "der", type: "spki" }), sig), "the bytes the check reads verify");
  assert.deepEqual(Uint8Array.from(msg), body);
  assert.equal(ed25519Instruction(signed, 9).data.readUInt16LE(16 - 2), 9);
});
