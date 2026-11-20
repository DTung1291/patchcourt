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
PatchCourt bridge -> Arkhai NLA oracle -> EAS arbitration attestation
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
