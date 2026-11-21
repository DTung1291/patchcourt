#!/usr/bin/env bash
set -euo pipefail

mkdir -p dist/assets
bun build web/app.ts --outfile dist/app.js --target browser --minify
cp web/index.html web/styles.css dist/
cp web/assets/patchcourt-mark.svg dist/assets/
cp video/assets/internet-court.svg video/assets/arkhai.svg video/assets/genlayer.png dist/assets/
cp video/output/frames/frame-07.png dist/assets/case-escrow.png
cp video/output/frames/frame-13.png dist/assets/case-evidence.png
cp video/output/frames/frame-30.png dist/assets/case-verdict.png
cp video/output/frames/frame-37.png dist/assets/case-settlement.png
cp video/output/frames/frame-30.png dist/assets/demo-poster.png
cp video/patchcourt-demo-44s.mp4 dist/
