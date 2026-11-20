# PatchCourt

Public source: https://github.com/DTung1291/patchcourt

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

### OKX browser-wallet flow

The reproducible Sepolia interface signs exclusively through the OKX injected
provider. It never accepts, reads or stores a seed phrase or private key.

```bash
bun install
bun run okx
# Open http://127.0.0.1:4188 and enable OKX site access.
```

The numbered interface deploys an Alkahest test ERC-20, creates the NLA escrow,
runs commit/reveal fulfillment, requests arbitration, records the finalized
PatchCourt decision and collects an approved escrow. Flow identifiers and the
random reveal salt stay in browser local storage so a wallet reload can resume
safely.

The bridge is dry-run by default. Live relay requires the official Arkhai `nla`
CLI and an oracle wallet:

```bash
npm install -g nla
nla network
bun run bridge -- --contract 0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583 --case-id 1
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
- `deployments/studionet/release-manifest.json` — immutable source and finalized deployment evidence.

## Status

The contract is finalized on StudioNet at
[`0x6504…2583`](https://explorer-studio.genlayer.com/address/0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583),
deployed by `0xea8704…7AA1` in
[`0xfda252…590e`](https://explorer-studio.genlayer.com/tx/0xfda25293d7dac8e7cc6cfea12109db477e53c4ad1c3c9b4696c922dd5cbf590e).
The deployed schema exposes five read methods and three consensus-backed write
methods. A live Arkhai Sepolia escrow and commit/reveal fulfillment are recorded
in [`deployments/sepolia/arkhai-demo.json`](deployments/sepolia/arkhai-demo.json).
The arbitration request is pending the finalized PatchCourt verdict and relay;
the final 45-second video then remains before mission submission.

## Partner sources

- Internet Court: https://internetcourt.org/
- Arkhai NLA: https://github.com/arkhai-io/natural-language-agreements
- GenLayer docs: https://docs.genlayer.com/
