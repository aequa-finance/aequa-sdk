// Pyth Pro (Lazer) signed updates: where a priced instruction gets one, how the program reads
// it (pyth.rs, function for function), and the ed25519 instruction that verifies it in the same
// transaction. Layouts: pyth-network/pyth-lazer-public, protocol v0.46.0.

import { TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { ED25519_PROGRAM, PYTH, SESSION } from "./constants.js";
import { fail, priceE8 } from "./math.js";

const ENVELOPE_MAGIC = 2_182_742_457;
const PAYLOAD_MAGIC = 2_479_346_549;
const PAYLOAD_AT = 102;
/** The highest channel the program takes: 1 real time, 2 every 50 ms, 3 every 200 ms. */
const MAX_CHANNEL = 3;

export type FeedUpdate = {
  id: number;
  /** Mantissa: the price is `price × 10^exponent`. */
  price: bigint;
  exponent: number;
  /** 0 regular, 1 pre-market, 2 post-market, 3 overnight, 4 closed (`SESSION`). */
  session: number;
  /** When the feed's own price last changed, in microseconds; 0 when absent. */
  updatedUs: bigint;
  hasPrice: boolean;
  hasExponent: boolean;
  hasSession: boolean;
};

export type Update = { timestampUs: bigint; channel: number; feeds: FeedUpdate[] };

/** Reads a "solana" envelope's payload as the program does; fails where it would (`InvalidPythMessage`). */
export function parseEnvelope(envelope: Uint8Array): Update {
  const v = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
  let at = 0;
  const take = (n: number) => {
    if (at + n > envelope.length) fail("InvalidPythMessage");
    at += n;
    return at - n;
  };
  const u8 = () => v.getUint8(take(1));
  const u16 = () => v.getUint16(take(2), true);
  const i16 = () => v.getInt16(take(2), true);
  const u32 = () => v.getUint32(take(4), true);
  const u64 = () => v.getBigUint64(take(8), true);
  const i64 = () => v.getBigInt64(take(8), true);
  const optU64 = () => (u8() !== 0 ? u64() : null);

  if (u32() !== ENVELOPE_MAGIC) fail("InvalidPythMessage");
  take(64 + 32);
  if (envelope.length !== PAYLOAD_AT + u16()) fail("InvalidPythMessage");
  if (u32() !== PAYLOAD_MAGIC) fail("InvalidPythMessage");
  const timestampUs = u64();
  const channel = u8();
  const count = u8();
  const feeds: FeedUpdate[] = [];
  for (let i = 0; i < count; i++) {
    const f: FeedUpdate = { id: u32(), price: 0n, exponent: 0, session: 0, updatedUs: 0n, hasPrice: false, hasExponent: false, hasSession: false };
    const props = u8();
    for (let k = 0; k < props; k++) {
      const p = u8();
      if (p === 0) {
        f.price = i64();
        f.hasPrice = f.price !== 0n;
      } else if (p === 1 || p === 2 || p === 5 || p === 10 || p === 11) i64();
      else if (p === 3) u16();
      else if (p === 4) {
        f.exponent = i16();
        f.hasExponent = true;
      } else if (p === 6) {
        if (u8() !== 0) i64();
      } else if (p === 7 || p === 8) optU64();
      else if (p === 9) {
        f.session = i16();
        f.hasSession = true;
      } else if (p === 12) f.updatedUs = optU64() ?? 0n;
      else fail("InvalidPythMessage");
    }
    feeds.push(f);
  }
  if (at !== envelope.length) fail("InvalidPythMessage");
  return { timestampUs, channel, feeds };
}

/** The update is recent and on a fast channel at `now` (seconds); `WrongPythChannel` or `StalePrice` otherwise. */
export function requireFresh(u: Update, now: number, freshnessSecs: number) {
  if (u.channel < 1 || u.channel > MAX_CHANNEL) fail("WrongPythChannel");
  if (now - Number(u.timestampUs / 1_000_000n) > freshnessSecs) fail("StalePrice");
}

/**
 * A feed's price in an open session, as the xStock paths and `distribute` take it: a fresh price
 * of its own, in a session other than closed. `CollateralNotLive` or `InvalidPythPrice` otherwise.
 */
export function feedPrice(u: Update, feed: number, freshnessSecs: number): { priceE8: bigint; session: number } {
  const f = u.feeds.find((x) => x.id === feed) ?? fail("CollateralNotLive");
  if (!f.hasPrice || !f.hasExponent || !f.hasSession) fail("InvalidPythPrice");
  if (f.session < SESSION.REGULAR || f.session >= SESSION.CLOSED) fail("CollateralNotLive");
  if (f.updatedUs === 0n) fail("InvalidPythPrice");
  const carried = u.timestampUs > f.updatedUs ? u.timestampUs - f.updatedUs : 0n;
  if (carried > BigInt(freshnessSecs) * 1_000_000n) fail("CollateralNotLive");
  return { priceE8: priceE8(f.price, f.exponent), session: f.session };
}

/** A feed's latest price whatever its session (a non-dollar quote asset's feed). */
export function anyPrice(u: Update, feed: number): bigint {
  const f = u.feeds.find((x) => x.id === feed) ?? fail("CollateralNotLive");
  if (!f.hasPrice || !f.hasExponent) fail("InvalidPythPrice");
  return priceE8(f.price, f.exponent);
}

/** Whether the program would price `feed` from this update at `now`. */
export function isLive(u: Update, feed: number, now: number, freshnessSecs: number): boolean {
  try {
    requireFresh(u, now, freshnessSecs);
    feedPrice(u, feed, freshnessSecs);
    return true;
  } catch {
    return false;
  }
}

/** A feed's price as a number, for display. */
export const displayPrice = (f: FeedUpdate) => Number(f.price) * 10 ** f.exponent;

/**
 * The ed25519 instruction that verifies an envelope carried as the first argument of the
 * instruction at `instructionIndex` (Anchor's 8-byte discriminator and 4-byte length put it at
 * offset 12).
 */
export function ed25519Instruction(envelope: Uint8Array, instructionIndex: number, offset = 12): TransactionInstruction {
  const payloadLength = envelope[100] | (envelope[101] << 8);
  const d = new Uint8Array(16);
  const v = new DataView(d.buffer);
  d[0] = 1;
  [offset + 4, instructionIndex, offset + 68, instructionIndex, offset + PAYLOAD_AT, payloadLength, instructionIndex].forEach((x, i) => v.setUint16(2 + 2 * i, x, true));
  return new TransactionInstruction({ programId: ED25519_PROGRAM, keys: [], data: Buffer.from(d) });
}

/** Signed updates for the priced instructions. Any source of Pyth Pro "solana" envelopes fits. */
export interface PriceSource {
  /** The latest signed update covering `feeds`, as the envelope bytes. */
  signed(feeds: number[]): Promise<Uint8Array>;
}

/** Pyth Pro's REST endpoint under an access token (one with the US equity feeds). */
export function pythPro(o: { token: string; url?: string }): PriceSource {
  const url = (o.url ?? "https://pyth-lazer.dourolabs.app").replace(/\/$/, "");
  return {
    async signed(feeds) {
      const res = await fetch(`${url}/v1/latest_price`, {
        method: "POST",
        headers: { authorization: `Bearer ${o.token}`, "content-type": "application/json" },
        body: JSON.stringify({
          priceFeedIds: feeds,
          properties: ["price", "exponent", "confidence", "feedUpdateTimestamp", "marketSession"],
          formats: ["solana"],
          channel: PYTH.channel,
          jsonBinaryEncoding: "base64",
          parsed: false,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Pyth Pro answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as { solana?: { data?: string } };
      if (!body.solana?.data) throw new Error("Pyth Pro sent no solana payload");
      return Uint8Array.from(Buffer.from(body.solana.data, "base64"));
    },
  };
}
