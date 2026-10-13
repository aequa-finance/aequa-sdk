// The program's events, read from transaction or simulation logs, with bigint amounts.

import { EventParser } from "@anchor-lang/core";
import type { Connection, TransactionSignature } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants.js";
import { plain, program, type EventData, type EventName } from "./program.js";

/** One event the program emitted: `name` is the event's name in camelCase ("minted", "usdqStaked"). */
export type AequaEvent = { [N in EventName]: { name: N; data: EventData<N> } }[EventName];

/** The events in a transaction's or a simulation's logs, in order. */
export function parseEvents(logs: readonly string[] | null | undefined): AequaEvent[] {
  if (!logs?.length) return [];
  const parser = new EventParser(PROGRAM_ID, program().coder);
  return [...parser.parseLogs([...logs])].map((e) => ({ name: e.name, data: plain(e.data) }) as AequaEvent);
}

/** The first event of a kind in a list. */
export const findEvent = <N extends EventName>(events: readonly AequaEvent[], name: N) =>
  events.find((e): e is Extract<AequaEvent, { name: N }> => e.name === name)?.data as EventData<N> | undefined;

/** The events of a confirmed transaction. */
export async function transactionEvents(connection: Connection, signature: TransactionSignature): Promise<AequaEvent[]> {
  const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  return parseEvents(tx?.meta?.logMessages);
}
