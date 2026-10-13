// Mints and token accounts read from raw data: mainnet's own SPYx, QQQx and USDC mints, and
// mints edited to carry each extension the program refuses or checks.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Keypair } from "@solana/web3.js";
import { ata, ATA_PROGRAM, createAtaIdempotent, mintSupply, multiplierE12, readMint, SYSTEM_PROGRAM, TOKEN_2022_PROGRAM, tokenAmount } from "../src/index.js";

const fixture = (name: string) => {
  const a = JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as { account: { data: [string, string] } };
  return Uint8Array.from(Buffer.from(a.account.data[0], "base64"));
};
const spyx = fixture("spyx_mint.json");
const window = { before: 86_400, after: 3_600 };

/** The offset of an extension's value in a Token-2022 mint. */
function extension(data: Uint8Array, type: number): number {
  const v = new DataView(data.buffer, data.byteOffset);
  for (let i = 166; i + 4 <= data.length; ) {
    if (v.getUint16(i, true) === type) return i + 4;
    i += 4 + v.getUint16(i + 2, true);
  }
  throw new Error(`no extension ${type}`);
}

test("mainnet's SPYx: its multiplier in force, not paused, admissible", () => {
  const m = readMint(spyx, 1_791_500_000, window);
  assert.equal(m.decimals, 8);
  assert.equal(m.supply, mintSupply(spyx));
  assert.equal(m.scaledUiAmount?.next, 1.005714560286254);
  assert.equal(m.multiplierE12, multiplierE12(1.005714560286254));
  assert.equal(m.paused, false);
  assert.equal(m.window, null);
  assert.equal(m.admissible, true);
  // Before the change took effect, the earlier multiplier counted, inside the window around it.
  const at = m.scaledUiAmount!.effectiveAt;
  const before = readMint(spyx, at - 3_600, window);
  assert.equal(before.multiplierE12, multiplierE12(m.scaledUiAmount!.multiplier));
  assert.deepEqual(before.window, { from: at - 86_400, to: at + 3_600 });
  assert.equal(readMint(spyx, at + 3_600, window).window, null);
  assert.equal(readMint(fixture("qqqx_mint.json"), 1_791_500_000, window).admissible, true);
});

test("a classic SPL mint has no extensions", () => {
  const usdc = readMint(fixture("usdc_mint.json"), 0);
  assert.equal(usdc.decimals, 6);
  assert.equal(usdc.multiplierE12, 1_000_000_000_000n);
  assert.equal(usdc.admissible, true);
});

test("the issuer's pause, a transfer hook and auto-approved confidential transfers", () => {
  const paused = Uint8Array.from(spyx);
  paused[extension(paused, 26) + 32] = 1;
  assert.equal(readMint(paused, 0).paused, true);
  const hooked = Uint8Array.from(spyx);
  hooked[extension(hooked, 14) + 40] = 7;
  assert.equal(readMint(hooked, 0).admissible, false);
  const approving = Uint8Array.from(spyx);
  approving[extension(approving, 4) + 32] = 1;
  assert.equal(readMint(approving, 0).admissible, false);
  const zeroMultiplier = Uint8Array.from(spyx);
  new DataView(zeroMultiplier.buffer).setFloat64(extension(zeroMultiplier, 25) + 48, 0, true);
  assert.equal(readMint(zeroMultiplier, 1_791_500_000).admissible, false);
});

/** A Token-2022 mint carrying `extensions` (type, value bytes). */
function mintWith(extensions: [number, Uint8Array][]): Uint8Array {
  const d = new Uint8Array(166 + extensions.reduce((n, [, v]) => n + 4 + v.length, 0));
  const v = new DataView(d.buffer);
  d[44] = 6;
  d[45] = 1;
  d[165] = 1;
  let at = 166;
  for (const [type, value] of extensions) {
    v.setUint16(at, type, true);
    v.setUint16(at + 2, value.length, true);
    d.set(value, at + 4);
    at += 4 + value.length;
  }
  return d;
}

test("transfer fees, non-transferable and interest-bearing mints aren't admissible", () => {
  const fee = (older: number, newer: number) => {
    const value = new Uint8Array(108);
    new DataView(value.buffer).setUint16(88, older, true);
    new DataView(value.buffer).setUint16(106, newer, true);
    return value;
  };
  assert.equal(readMint(mintWith([[1, fee(0, 0)]]), 0).admissible, true, "a fee extension at zero");
  assert.equal(readMint(mintWith([[1, fee(0, 5)]]), 0).admissible, false, "the newer fee");
  assert.equal(readMint(mintWith([[1, fee(5, 0)]]), 0).admissible, false, "the older fee");
  assert.equal(readMint(mintWith([[9, new Uint8Array(0)]]), 0).admissible, false, "non-transferable");
  assert.equal(readMint(mintWith([[10, new Uint8Array(52)]]), 0).admissible, false, "interest-bearing");
  assert.equal(readMint(mintWith([[18, new Uint8Array(64)]]), 0).admissible, true, "a metadata pointer");
});

test("token account balances", () => {
  const account = new Uint8Array(165);
  new DataView(account.buffer).setBigUint64(64, 123_456_789n, true);
  assert.equal(tokenAmount(account), 123_456_789n);
  assert.equal(tokenAmount(null), 0n);
});

test("creating an associated account is idempotent and names it", () => {
  const [payer, owner, mint] = [Keypair.generate().publicKey, Keypair.generate().publicKey, Keypair.generate().publicKey];
  const i = createAtaIdempotent(payer, owner, mint, TOKEN_2022_PROGRAM);
  assert.ok(i.programId.equals(ATA_PROGRAM));
  assert.deepEqual([...i.data], [1]);
  assert.ok(i.keys[1].pubkey.equals(ata(mint, owner, TOKEN_2022_PROGRAM)));
  assert.ok(i.keys[4].pubkey.equals(SYSTEM_PROGRAM) && i.keys[5].pubkey.equals(TOKEN_2022_PROGRAM));
});
