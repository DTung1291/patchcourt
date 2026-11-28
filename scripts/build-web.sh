#!/usr/bin/env bash
set -euo pipefail

mkdir -p dist/assets
bun build web/app.ts --outfile dist/app.js --target browser --minify
cp web/index.html web/styles.css dist/
cp web/assets/patchcourt-mark.svg web/assets/case-escrow.png web/assets/case-evidence.png web/assets/case-verdict.png web/assets/case-settlement.png dist/assets/
cp video/assets/internet-court.svg video/assets/arkhai.svg video/assets/genlayer.png dist/assets/
cp video/patchcourt-demo-44s.mp4 dist/
