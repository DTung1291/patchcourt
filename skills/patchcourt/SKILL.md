---
name: patchcourt
description: Create, submit, adjudicate, and settle an Arkhai Git escrow using a finalized PatchCourt GenLayer verdict. Use for reproducible Internet Court code-delivery disputes.
metadata:
  author: PatchCourt
  version: "0.1.0"
compatibility: Requires Python 3.10+. Live settlement requires GenLayer Studio access and the Arkhai nla CLI configured with the escrow oracle wallet.
allowed-tools: Bash(python3:*) Bash(nla:*) Read
---

# PatchCourt

PatchCourt connects an Arkhai Natural Language Agreement escrow to GenLayer
adjudication of commit-pinned GitHub evidence.

## Safety boundary

- Never accept a branch, tag, pull-request page, repository root, or short SHA as evidence.
- Never relay `INCONCLUSIVE` to Arkhai.
- Read `get_arbitration_instruction(case_id)` from the deployed PatchCourt contract only after the adjudication transaction is finalized.
- The NLA wallet must be the oracle declared by the escrow.
- Show the user the escrow UID, network, decision, and command before any on-chain arbitration.

## Reproduce locally

```bash
./scripts/check.sh
python3 scripts/arkhai_bridge.py examples/approved-instruction.json
bun test
```

The second command is a dry-run and does not submit a transaction.

## Live flow

1. Create an Arkhai NLA escrow on Sepolia or Base Sepolia. Record its EAS escrow UID.
2. Call `create_case` using the same UID, network, worker, demand, and acceptance criteria.
3. The worker creates an Arkhai fulfillment and calls `submit_fulfillment` with its UID, an immutable GitHub file URL, and the matching full commit SHA.
4. A party calls `adjudicate`. Wait for GenLayer finalization.
5. Use the live bridge. It reads `get_arbitration_instruction` from GenLayer's
   `latest-final` state and stops if the call reverts or the schema is not final.
6. Dry-run the exact instruction:

```bash
bun run bridge -- --contract 0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583 --case-id 1
```

7. After explicit user approval, repeat with `--execute`.
8. Verify with `nla escrow:status --escrow-uid <uid>` and preserve both chain transaction links in the release manifest.
