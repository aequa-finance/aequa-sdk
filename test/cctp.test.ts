// The bridge route's hook and fee arithmetic (state.rs `BridgeRoute::to_hypercore`, bridge.rs).

import assert from "node:assert/strict";
import { test } from "node:test";
import { bridgeArgs, circleMaxFee, evmAddress, feeFits, hyperCoreHook } from "../src/index.js";

const account = "0x23c01769707134a1c0cff5fedb94e87f3bdc2aea";

test("the forwarding hook names the HyperCore account", () => {
  const hook = hyperCoreHook(account);
  assert.equal(hook.length, 56);
  assert.equal(Buffer.from(hook.subarray(0, 12)).toString(), "cctp-forward");
  assert.ok(hook.subarray(12, 28).every((b) => b === 0));
  assert.equal(new DataView(hook.buffer).getUint32(28, false), 24);
  assert.equal(Buffer.from(hook.subarray(32, 52)).toString("hex"), account.slice(2));
  assert.ok(hook.subarray(52).every((b) => b === 0));
});

test("set_bridge_route's arguments", () => {
  assert.deepEqual(bridgeArgs(account, 1, 1_000_000n), { recipient: evmAddress(account), maxFeeBps: 1, maxFeeFlat: 1_000_000n });
  assert.throws(() => evmAddress("0x1234"));
});

test("the fee a burn allows: Circle's bps rounded up, plus its forwarding fee", () => {
  const fees = { fastBps: 1.3, standardBps: 0, forwardFee: { low: 100_000, med: 200_000, high: 400_000 } };
  assert.equal(circleMaxFee(1_000_000_000n, fees, true), 130_000n + 200_000n);
  assert.equal(circleMaxFee(1_000_000_000n, fees, false), 200_000n);
  assert.equal(circleMaxFee(1n, fees, true), 1n + 200_000n);
  const route = { maxFeeBps: 1, maxFeeFlat: 1_000_000n };
  assert.equal(feeFits(1_000_000_000n, 1_100_000n, route), true);
  assert.equal(feeFits(1_000_000_000n, 1_100_001n, route), false);
});
