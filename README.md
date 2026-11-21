# PatchCourt

Public source: https://github.com/DTung1291/patchcourt

Live demo: https://patchcourt.vercel.app

Final 44-second video: https://patchcourt.vercel.app/patchcourt-demo-44s.mp4

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
- `video/patchcourt-demo-44s.mp4` — final 44-second mission video with
  Internet Court, GenLayer, and Arkhai branding.
- `deployments/studionet/release-manifest.json` — immutable source and finalized deployment evidence.

## Status

The contract is finalized on StudioNet at
[`0x6504…2583`](https://explorer-studio.genlayer.com/address/0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583),
deployed by `0xea8704…7AA1` in
[`0xfda252…590e`](https://explorer-studio.genlayer.com/tx/0xfda25293d7dac8e7cc6cfea12109db477e53c4ad1c3c9b4696c922dd5cbf590e).
The deployed schema exposes five read methods and three consensus-backed write
methods. A live Arkhai Sepolia escrow and commit/reveal fulfillment are recorded
in [`deployments/sepolia/arkhai-demo.json`](deployments/sepolia/arkhai-demo.json).
Case 1 reached a finalized 4/4 `APPROVED` verdict in round 2. The corrected
oracle decision was recorded in Sepolia transaction `0xcec3da…b0ddf`, and the
approved 1 PCT escrow was collected in `0x43f09f…82487`. The complete immutable
execution record is in [`evidence/final-settlement.json`](evidence/final-settlement.json).
The final 44-second demo is available both in
[`video/patchcourt-demo-44s.mp4`](video/patchcourt-demo-44s.mp4) and on the
[live PatchCourt website](https://patchcourt.vercel.app). It shows the three
required partner logos, the immutable evidence gate, GenLayer criterion-level
consensus, the finalized 4/4 verdict, and the successful Sepolia settlement.

## Mission evidence

- Live interface: https://patchcourt.vercel.app
- Final video: https://patchcourt.vercel.app/patchcourt-demo-44s.mp4
- GenLayer contract: https://explorer-studio.genlayer.com/address/0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583
- GenLayer adjudication: https://explorer-studio.genlayer.com/tx/0x3a1e8a216cf728389508774039269538c1c2b8a3a704e6ecaf42cbd966e30ba1
- Arkhai settlement: https://sepolia.etherscan.io/tx/0x43f09f4ca015b0f1625358967a83086fcb60e84cd6990a78e2d129b608082487

## Partner sources

- Internet Court: https://internetcourt.org/
- Arkhai NLA: https://github.com/arkhai-io/natural-language-agreements
- GenLayer docs: https://docs.genlayer.com/
