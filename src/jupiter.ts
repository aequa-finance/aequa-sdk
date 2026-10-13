// Routes from Jupiter's swap API for `swap`, `buyback` and `sell_slashed`. Each runs between the
// swap authority's transit accounts, which Jupiter fills in itself when the swap authority is
// the user. The program takes `shared_accounts_route_v2` or `route_v2` spending exactly the
// amount, with no platform or positive-slippage fee, and checks what comes out.

import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { JUPITER_PROGRAM } from "./constants.js";
import type { Route } from "./instructions/shared.js";
import { PDA } from "./pda.js";

export type JupiterQuote = {
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  routePlan: { swapInfo: { label: string; inputMint: string; outputMint: string } }[];
};

/** A route, the quote behind it, and the lookup tables its transaction needs alongside the program's. */
export type JupiterRoute = Route & { quote: JupiterQuote; lookupTables: PublicKey[] };

/** An instruction as Jupiter's API returns it. */
export type JupiterInstruction = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };

/**
 * A route from the swap instruction Jupiter built for the swap authority: its data, and its
 * accounts with nothing signing and the swap authority read-only (the program signs for it).
 */
export function routeFromInstruction(ix: JupiterInstruction): Route {
  if (ix.programId !== JUPITER_PROGRAM.toBase58()) throw new Error(`Jupiter returned an instruction for ${ix.programId}`);
  const authority = PDA.swapAuthority.toBase58();
  return {
    data: Uint8Array.from(Buffer.from(ix.data, "base64")),
    accounts: ix.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: false, isWritable: a.isWritable && a.pubkey !== authority })),
  };
}

/**
 * A route spending exactly `amount` of `inputMint` from the swap authority's transit account
 * into its transit account for `outputMint`. Keyless calls are rate limited; `apiKey` lifts that.
 */
export async function jupiterRoute(o: {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: bigint;
  slippageBps?: number;
  maxAccounts?: number;
  apiKey?: string;
  api?: string;
}): Promise<JupiterRoute> {
  const api = o.api ?? "https://api.jup.ag";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (o.apiKey) headers["x-api-key"] = o.apiKey;
  const call = async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(api + path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Jupiter ${path.split("?")[0]} answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  };
  const q = new URLSearchParams({
    inputMint: o.inputMint.toBase58(),
    outputMint: o.outputMint.toBase58(),
    amount: o.amount.toString(),
    slippageBps: String(o.slippageBps ?? 50),
    instructionVersion: "V2",
    maxAccounts: String(o.maxAccounts ?? 30),
    restrictIntermediateTokens: "true",
  });
  const quote = await call<JupiterQuote>(`/swap/v1/quote?${q}`);
  const built = await call<{ swapInstruction: JupiterInstruction; addressLookupTableAddresses: string[] }>("/swap/v1/swap-instructions", {
    quoteResponse: quote,
    userPublicKey: PDA.swapAuthority.toBase58(),
    useSharedAccounts: true,
    wrapAndUnwrapSol: false,
    skipUserAccountsRpcCalls: true,
  });
  return { quote, ...routeFromInstruction(built.swapInstruction), lookupTables: built.addressLookupTableAddresses.map((a) => new PublicKey(a)) };
}
