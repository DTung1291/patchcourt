# PatchCourt

PatchCourt is an Internet Court partner demo connecting GenLayer semantic
adjudication to Arkhai Natural Language Agreement escrows.

## Rules

- Never fabricate deployment addresses, transaction hashes, escrow UIDs, or verdicts.
- GitHub evidence must be immutable and SHA-bound.
- INCONCLUSIVE never becomes an Arkhai arbitration decision.
- Keep the GenLayer contract, bridge schema, skill, tests and release manifest in sync.
- Do not put private keys or provider API keys in the repository or command history.

## Check

```bash
./scripts/check.sh
python3 scripts/arkhai_bridge.py examples/approved-instruction.json
bun test
```
