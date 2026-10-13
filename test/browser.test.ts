// The SDK in a browser: its sources use nothing of Node's, and a browser bundle of it builds
// instructions, composes a transaction and decodes accounts with no global Buffer.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const src = fileURLToPath(new URL("../src", import.meta.url));
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []));

test("the sources use nothing of Node's", () => {
  for (const file of files(src)) {
    const code = readFileSync(file, "utf8");
    assert.doesNotMatch(code, /from "node:|require\(|process\.|__dirname|import\.meta\.url/, file);
    if (/\bBuffer\./.test(code)) assert.match(code, /import \{ Buffer \} from "buffer";/, `${file} takes Buffer from "buffer"`);
  }
});

test("a browser bundle runs without a global Buffer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aequa-sdk-browser-"));
  const entry = `
    import { Keypair } from "@solana/web3.js";
    import { COLLATERAL, compose, decodeAccount, instructions, parseEnvelope, withPrice } from ${JSON.stringify(join(src, "index.ts").replace(/\\/g, "/"))};
    const user = Keypair.generate().publicKey;
    const mint = await instructions.mintWithUsdc({ user, amount: 1_000_000n, minOut: 0n, withStake: true });
    const envelope = new Uint8Array(102);
    new DataView(envelope.buffer).setUint32(0, 2182742457, true);
    const priced = await withPrice(envelope, (ed25519Index) => instructions.mintWithCollateral({ user, mint: COLLATERAL.SPYx.mint, amount: 1n, minOut: 0n, message: envelope, ed25519Index }));
    const tx = compose({ payer: user, instructions: [mint, ...priced], recentBlockhash: "4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM" });
    let decoded = "refused";
    try { decodeAccount("config", new Uint8Array(16)); decoded = "read"; } catch {}
    let parsed = "refused";
    try { parseEnvelope(envelope); parsed = "read"; } catch {}
    globalThis.result = [tx.message.compiledInstructions.length, mint.data.length, decoded, parsed].join(" ");
  `;
  const bundle = join(dir, "bundle.mjs");
  await build({ stdin: { contents: entry, resolveDir: fileURLToPath(new URL("..", import.meta.url)), loader: "ts" }, bundle: true, platform: "browser", format: "esm", outfile: bundle, logLevel: "error" });
  assert.doesNotMatch(readFileSync(bundle, "utf8"), /from "node:|require\("(fs|path|crypto|os)"\)/);
  const runner = join(dir, "run.mjs");
  writeFileSync(runner, `delete globalThis.Buffer;\nawait import(${JSON.stringify(pathToFileURL(bundle).href)});\nconsole.log(globalThis.result);\n`);
  const out = execFileSync(process.execPath, [runner], { encoding: "utf8" }).trim();
  assert.equal(out, "5 24 refused refused");
});
