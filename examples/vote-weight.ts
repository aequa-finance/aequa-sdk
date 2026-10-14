// Realms voting with stAEQUA: the voter's weight record is valid for the slot it was updated in,
// so the update goes in the same transaction as the vote. This builds the instructions that go
// before spl-governance's own CastVote (or CreateProposal) instruction.
//
//   RPC_URL=<rpc> npx tsx examples/vote-weight.ts <realm> <voter> <proposal>

import { Connection, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { fetchPosition, fetchProtocol, instructions, voterWeightRecord } from "@aequa-finance/sdk";

const [realm, voter, proposal] = process.argv.slice(2).map((a) => new PublicKey(a));
const connection = new Connection(process.env.RPC_URL!, "confirmed");

const p = await fetchProtocol(connection);
if (!p.aequa) throw new Error("AEQUA isn't set on the program yet");
const aequaMint = p.aequa.mint;
const w = await fetchPosition(connection, p, voter);
const record = voterWeightRecord(realm, aequaMint, voter);

const before: TransactionInstruction[] = [];
if (!(await connection.getAccountInfo(record))) before.push(await instructions.createVoterWeightRecord({ payer: voter, realm, aequaMint, voter }));
before.push(await instructions.updateVoterWeightRecord({ realm, aequaMint, voter, withStake: !!w.aequaStake, action: { castVote: {} }, target: proposal }));

console.log(`voter weight record ${record.toBase58()}`);
console.log(`${before.length === 1 ? "one instruction goes" : `${before.length} instructions go`} ahead of CastVote, which names that record as its voter weight record`);
