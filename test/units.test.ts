// Decimal strings to raw units and back, exactly, at the decimals the tokens carry.

import assert from "node:assert/strict";
import { test } from "node:test";
import { formatUnits, parseUnits } from "../src/index.js";

test("parses what people type, exactly", () => {
  assert.equal(parseUnits("1250.5", 6), 1_250_500_000n);
  assert.equal(parseUnits("0.000001", 6), 1n);
  assert.equal(parseUnits(".5", 6), 500_000n);
  assert.equal(parseUnits("7.", 6), 7_000_000n);
  assert.equal(parseUnits(" 42 ", 8), 4_200_000_000n);
  assert.equal(parseUnits("1.50000000", 6), 1_500_000n, "zeros past the precision change nothing");
  assert.equal(parseUnits("18446744073709.551615", 6), (1n << 64n) - 1n, "no floating point on the way");
  assert.equal(parseUnits("3", 0), 3n);
});

test("refuses what isn't an amount, or is finer than the token", () => {
  for (const text of ["", ".", "1,250", "-1", "1e6", "0x10", "1.2.3", "one"]) assert.throws(() => parseUnits(text, 6), /not an amount/, text);
  assert.throws(() => parseUnits("0.0000001", 6), /more than 6 decimals/);
  assert.throws(() => parseUnits("1.5", 0), /more than 0 decimals/);
});

test("formats raw units with every digit, trailing zeros dropped", () => {
  assert.equal(formatUnits(1_250_500_000n, 6), "1250.5");
  assert.equal(formatUnits(1n, 6), "0.000001");
  assert.equal(formatUnits(0n, 6), "0");
  assert.equal(formatUnits(4_200_000_000n, 8), "42");
  assert.equal(formatUnits(-7_500_000n, 6), "-7.5", "a shortfall reads as negative");
  assert.equal(formatUnits(12n, 0), "12");
  assert.equal(formatUnits((1n << 64n) - 1n, 6), "18446744073709.551615");
});

test("parse and format undo each other", () => {
  for (const raw of [0n, 1n, 999_999n, 1_000_000n, 123_456_789_012n]) assert.equal(parseUnits(formatUnits(raw, 6), 6), raw);
});
