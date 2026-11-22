# Project Explorer submission kit

Prepared for the GenLayer **Projects** category on 2026-11-22.

## Identity

- Project logo: [`assets/patchcourt-logo-512.png`](../assets/patchcourt-logo-512.png)
- Project name: `PatchCourt`
- Primary tag: `Dispute Resolution`
- Tag 1: `Evidence Assessment`
- Tag 2: `Escrow Claims`

## Project summary

### One-liner

> PatchCourt verifies commit-pinned GitHub milestones through GenLayer consensus, then settles Arkhai escrow from the finalized verdict.

### Description

> PatchCourt is an AI-adjudicated milestone and escrow app for clients and freelancers. A client defines acceptance criteria and locks a reward in an Arkhai Natural Language Agreement. The freelancer submits public GitHub evidence pinned to one full commit SHA. PatchCourt's GenLayer Intelligent Contract fetches that immutable evidence, asks validators to judge every criterion independently, compares leader and validator decisions, and stores APPROVED, REJECTED, or INCONCLUSIVE. Only a finalized verdict can be relayed to the exact Arkhai demand context, allowing an approved escrow to be collected. Mutable refs, SHA mismatches, GitHub errors, malformed outputs, and inconclusive rounds fail closed. The public Sepolia demo includes an OKX wallet workflow, deployed contract evidence, tests, a threat model, and a reproducible bridge. The current release uses test assets and is not a mainnet payment product.

## Demo video

The application field accepts a direct YouTube video or X post, not the hosted
MP4 URL. Upload [`video/patchcourt-demo-44s.mp4`](../video/patchcourt-demo-44s.mp4)
and paste the resulting public or unlisted post URL into the form.

### YouTube title

> PatchCourt — GenLayer consensus settles GitHub milestone escrow

### YouTube description

> PatchCourt connects commit-pinned GitHub evidence, GenLayer validator consensus, and Arkhai Natural Language Agreement escrow. This 44-second demo shows a 1 PCT Sepolia reward, immutable evidence verification, a finalized APPROVED 4/4 verdict, and successful collection.\
>\
> Live app: https://patchcourt.vercel.app\
> Source: https://github.com/DTung1291/patchcourt\
> GenLayer contract: https://explorer-studio.genlayer.com/address/0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583

### X post

> PatchCourt turns commit-pinned GitHub delivery evidence into a GenLayer validator verdict, then settles the matching Arkhai escrow. The demo shows immutable evidence, APPROVED 4/4 consensus, and a collected 1 PCT Sepolia reward. https://patchcourt.vercel.app

## How-to

Enter these as separate ordered instructions in the application.

### Open the working demo

> Visit https://patchcourt.vercel.app. Watch the embedded 44-second walkthrough to see the complete escrow, evidence, consensus, and settlement path.

### Test the immutable evidence policy

> In “Try the evidence gate,” select Valid commit and click Check evidence. Then select Mutable main and HTTP error. The valid full SHA must pass; mutable or failed evidence must fail closed.

### Inspect the finalized GenLayer case

> Open the GenLayer contract link in “Finalized on public testnets.” Inspect Case 1, round 2 and its adjudication transaction. The finalized outcome is APPROVED with four of four criteria met.

### Connect the wallet flow

> Install or unlock OKX Wallet, select Ethereum Sepolia, and fund the wallet with test Sepolia ETH. In “Run the Sepolia flow,” click Connect OKX and approve the network connection.

### Reproduce the escrow path

> Follow the console in order: deploy the PCT test token, create the 1 PCT escrow, commit and reveal the fulfillment, request court arbitration, record the finalized decision, and collect the approved escrow. Confirm each testnet transaction in OKX Wallet.

### Verify the public evidence

> Compare the displayed case result with the immutable release manifest and the linked Sepolia settlement transaction. The repository README contains the exact contract, adjudication, and collection URLs.

## Review verification

### Expected verification outcome

> The steward should see SHA MATCH for the immutable full commit and FAIL CLOSED for mutable or failed evidence. GenLayer Case 1, round 2 should show APPROVED with 4/4 criteria met. The release manifest binds that verdict to the recorded Arkhai fulfillment, and the linked Sepolia transaction confirms collection of the approved 1 PCT escrow.

### Contract link

https://explorer-studio.genlayer.com/address/0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583

## Project links

- Website: https://patchcourt.vercel.app
- GitHub: https://github.com/DTung1291/patchcourt
- Required evidence type: `GitHub Repository`
- Evidence URL: https://github.com/DTung1291/patchcourt

## Additional evidence

- GenLayer adjudication: https://explorer-studio.genlayer.com/tx/0x3a1e8a216cf728389508774039269538c1c2b8a3a704e6ecaf42cbd966e30ba1
- Arkhai oracle decision: https://sepolia.etherscan.io/tx/0xcec3da3524ffb0c7fe3456cb9ebaffcafb02d6e744c6ae27afdd75d5cbbb0ddf
- Arkhai collection: https://sepolia.etherscan.io/tx/0x43f09f4ca015b0f1625358967a83086fcb60e84cd6990a78e2d129b608082487
- Immutable deployment record: [`deployments/studionet/release-manifest.json`](../deployments/studionet/release-manifest.json)
- Final settlement record: [`evidence/final-settlement.json`](../evidence/final-settlement.json)

## Disclosure

> PatchCourt was originally produced as an Internet Court Partner Demo Lab integration. This Project Explorer application presents the complete working product and its deployed GenLayer workflow; it does not claim the same artifact as a separate new milestone.

