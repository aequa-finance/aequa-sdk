// The Realms voter-weight plugin: votes are active stAEQUA. A voter's record is valid for the
// slot it was updated in, so `updateVoterWeightRecord` goes in the same transaction as the vote
// or proposal it backs.

import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { SYSTEM_PROGRAM } from "../constants.js";
import { aequaStake, maxVoterWeightRecord, PDA, voterWeightRecord } from "../pda.js";
import { program, type VoterWeightAction } from "../program.js";

/** `realm` and `aequaMint` name the record; the mint is `Config.aequa.mint`. */
type Realm = { realm: PublicKey; aequaMint: PublicKey };

export function createVoterWeightRecord(a: Realm & { payer: PublicKey; voter: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.createVoterWeightRecord(a.realm)
    .accountsStrict({ payer: a.payer, config: PDA.config, voter: a.voter, record: voterWeightRecord(a.realm, a.aequaMint, a.voter), systemProgram: SYSTEM_PROGRAM })
    .instruction();
}

/**
 * Sets the voter's weight to their active stAEQUA for this slot. `withStake`: the voter has a
 * stAEQUA position (without one the weight is zero). `action` and `target` scope the weight to
 * one governance action, as spl-governance's addin API defines them.
 */
export function updateVoterWeightRecord(
  a: Realm & { voter: PublicKey; withStake: boolean; action?: VoterWeightAction | null; target?: PublicKey | null },
): Promise<TransactionInstruction> {
  return program()
    .methods.updateVoterWeightRecord(a.action ?? null, a.target ?? null)
    .accountsStrict({
      config: PDA.config,
      aequaPool: PDA.aequaPool,
      record: voterWeightRecord(a.realm, a.aequaMint, a.voter),
      aequaStake: a.withStake ? aequaStake(a.voter) : null,
    })
    .instruction();
}

export function createMaxVoterWeightRecord(a: Realm & { payer: PublicKey }): Promise<TransactionInstruction> {
  return program()
    .methods.createMaxVoterWeightRecord(a.realm)
    .accountsStrict({ payer: a.payer, config: PDA.config, record: maxVoterWeightRecord(a.realm, a.aequaMint), systemProgram: SYSTEM_PROGRAM })
    .instruction();
}

/** Sets the max voter weight to the whole stAEQUA pool, for this slot. */
export function updateMaxVoterWeightRecord(a: Realm): Promise<TransactionInstruction> {
  return program()
    .methods.updateMaxVoterWeightRecord()
    .accountsStrict({ config: PDA.config, aequaPool: PDA.aequaPool, record: maxVoterWeightRecord(a.realm, a.aequaMint) })
    .instruction();
}
