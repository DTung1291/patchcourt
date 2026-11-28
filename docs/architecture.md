# Architecture

```text
GitHub commit-pinned evidence
             |
             v
PatchCourt on GenLayer StudioNet
  - binds Arkhai escrow + fulfillment UIDs
  - fetches evidence through GitHub Contents API at the submitted SHA
  - leader produces criterion-level judgments
  - validators independently re-evaluate and compare semantic decisions
  - stores APPROVED / REJECTED / INCONCLUSIVE
             |
             v final APPROVED or REJECTED only
get_arbitration_instruction(case_id)
             |
             v
Browser / PatchCourt bridge
  - reads GenLayer latest-final state
  - matches network + escrow + fulfillment + demand context
             |
             v
Arkhai NLA oracle -> EAS arbitration attestation
             |
             v
Arkhai escrow collect / refund path
```

## Why GenLayer is necessary

Tests can prove deterministic behavior, but they cannot reliably decide whether
a patch satisfies a natural-language requirement such as “the migration is
backward compatible and documented.” PatchCourt places that semantic judgment
inside GenLayer consensus. The Arkhai escrow consumes only the finalized binary
instruction; it does not trust a single off-chain LLM.

## Integration boundary

PatchCourt never holds funds. Arkhai owns the escrow, fulfillment and settlement
attestations. PatchCourt owns the evidence policy and semantic verdict. Their
immutable UIDs are stored together before adjudication so the bridge cannot
silently substitute another escrow or fulfillment.

The browser re-runs those checks immediately before both arbitration and
collection. Its verdict is not a user input: it is the boolean in the matching
latest-final instruction. The trusted oracle key remains a documented trust
boundary; see [`threat-model.md`](threat-model.md).
