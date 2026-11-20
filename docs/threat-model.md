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
| Claiming settlement without an Arkhai tx | PatchCourt never records or claims cross-chain settlement. Evidence must include the Arkhai attestation transaction. |

## Current limitation

The first release uses an operator bridge because GenLayer StudioNet and Arkhai
testnets do not share a native messaging layer. The operator cannot choose the
verdict, but it can delay relay. Production use should add a permissionless
relayer with finalized-state proofs.
