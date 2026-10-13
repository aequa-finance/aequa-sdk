// A route Jupiter built for the swap authority (captured from mainnet), as the program takes it.

import assert from "node:assert/strict";
import { test } from "node:test";
import { COLLATERAL, PDA, PROGRAM_ID, routeFromInstruction, transit } from "../src/index.js";
import captured from "./fixtures/jupiter_route.json" with { type: "json" };

test("Jupiter's instruction becomes the program's route", () => {
  const route = routeFromInstruction(captured.swapInstruction);
  assert.equal(route.accounts.length, captured.swapInstruction.accounts.length);
  assert.ok(route.accounts.every((a) => !a.isSigner), "the program signs for the swap authority");
  const authority = route.accounts.filter((a) => a.pubkey.equals(PDA.swapAuthority));
  assert.ok(authority.length > 0 && authority.every((a) => !a.isWritable), "the swap authority is never writable");
  for (const k of [PDA.transitUsdc, transit(COLLATERAL.SPYx.mint)]) assert.ok(route.accounts.some((a) => a.pubkey.equals(k)), "between the transit accounts");
  // What the program checks (jupiter.rs `check_route`): shared_accounts_route_v2, the exact amount, no fees.
  const data = Buffer.from(route.data);
  assert.equal(data.subarray(0, 8).toString("hex"), "d19853937cfed8e9");
  assert.equal(data.readBigUInt64LE(9), BigInt(captured.quote.inAmount));
  assert.deepEqual([data.readUInt16LE(27), data.readUInt16LE(29)], [0, 0]);
  assert.throws(() => routeFromInstruction({ ...captured.swapInstruction, programId: PROGRAM_ID.toBase58() }));
});
