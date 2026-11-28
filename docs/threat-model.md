# Threat model

| Threat | Control |
| --- | --- |
| Branch or tag changes after submission | Only full 40-character SHA file URLs are accepted. |
| URL SHA differs from submitted SHA | Submission reverts before state is written. |
| GitHub returns an error or different canonical ref | Verdict becomes INCONCLUSIVE; no Arkhai instruction exists. |
| Evidence contains prompt injection | Evidence is bounded and explicitly treated as untrusted data. |
| One LLM approves incorrectly | Validators independently evaluate; only criterion decisions are compared. |
| Malformed LLM JSON | Strict shape normalization fails closed to INCONCLUSIVE. |
| Reuse of one escrow in multiple cases | `escrow_cases` enforces a unique escrow UID. |
| Bridge flips APPROVE to REJECT | Schema requires `decision` to match the final `outcome`. |
| Bridge settles an unclear case | INCONCLUSIVE and revision states cannot produce an instruction. |
| Browser reads pending or stale GenLayer state | Settlement reads `get_arbitration_instruction` with `LATEST_FINAL`; a non-final case produces no instruction and fails closed. |
| Instruction belongs to another flow | Before relay and collection, the browser re-fetches both attestations and requires the instruction network, escrow UID, fulfillment UID, fulfillment `refUID`, and unrevoked status to match. |
| Escrow demand or signer changes | The live encoded demand and its inner decision context must equal the context saved when arbitration was requested, and the connected wallet must be the oracle named in that demand. |
| Claiming settlement without an Arkhai tx | PatchCourt never records or claims cross-chain settlement. Evidence must include the Arkhai attestation transaction. |

## Current limitation

The first release uses a trusted-oracle wallet because GenLayer StudioNet and
Arkhai testnets do not share a native messaging layer. The supplied CLI and
browser remove the verdict input and derive it only from matching GenLayer
latest-final state. However, these are application-level controls: the holder
of the oracle wallet still has Arkhai authority to withhold or delay a relay and
can bypass the supplied clients to submit an arbitration transaction directly.
A compromised oracle key therefore remains able to record a conflicting
decision for a demand it controls. Production use must replace this authority
with a permissionless relayer plus finalized-state proof verification (or an
Arkhai arbiter contract that verifies the GenLayer result on-chain).
