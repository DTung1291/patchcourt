# PatchCourt

**AI-adjudicated Git escrow for Internet Court.** PatchCourt connects Arkhai
Natural Language Agreement escrows to GenLayer consensus over immutable GitHub
evidence.

An Arkhai escrow defines the obligation and locks the reward. A worker submits a
fulfillment attestation plus a commit-pinned GitHub evidence file. GenLayer
validators independently decide whether every natural-language acceptance
criterion is satisfied. Only a finalized APPROVED or REJECTED verdict can be
relayed to the Arkhai oracle.

## Why this is not a thin LLM wrapper

- Arkhai escrow and fulfillment UIDs are bound on-chain before review.
- Evidence is fetched from GitHub's Contents API using the submitted full SHA.
- Mutable URLs, SHA mismatches, HTTP failures and canonical-ref mismatches fail closed.
- Leader and validators independently evaluate the evidence and compare ordered criterion decisions.
- Deterministic state separates revision, terminal verdict and settlement-instruction states.
- The bridge refuses malformed, contradictory or inconclusive instructions.

## Local verification

```bash
chmod +x scripts/check.sh
./scripts/check.sh
python3 scripts/arkhai_bridge.py examples/approved-instruction.json
bun install
bun test
```

The bridge is dry-run by default. Live relay requires the official Arkhai `nla`
CLI and an oracle wallet:

```bash
npm install -g nla
nla network
bun run bridge -- --contract 0xPATCHCOURT --case-id 1
# Review the latest-final instruction, then explicitly add --execute.
```

## Repository map

- `contracts/patchcourt.py` — deployable GenLayer Intelligent Contract.
- `scripts/arkhai_bridge.py` — strict PatchCourt-to-Arkhai relay.
- `skills/patchcourt/SKILL.md` — reproducible agent interface.
- `tests/` — state, consensus, evidence and bridge guard tests.
- `docs/architecture.md` — trust and data-flow boundaries.
- `docs/threat-model.md` — attacks and fail-closed behavior.
- `docs/demo-script.md` — polished 45-second video storyboard.
- `deployments/studionet/release-manifest.json` — honest deployment evidence; currently not deployed.

## Status

The contract, bridge, local tests, skill and demo plan are implemented. StudioNet
deployment, live Arkhai Sepolia escrow transactions and the final video remain
before mission submission.

## Partner sources

- Internet Court: https://internetcourt.org/
- Arkhai NLA: https://github.com/arkhai-io/natural-language-agreements
- GenLayer docs: https://docs.genlayer.com/
