# PatchCourt mission video

[`patchcourt-demo-44s.mp4`](patchcourt-demo-44s.mp4) is the final 44-second Internet Court Partner Demo Lab cut.

It shows the complete verified flow: Arkhai escrow, commit-pinned GitHub evidence, GenLayer criterion-level consensus, the finalized `APPROVED 4/4` decision, and the successful `+1 PCT` Sepolia settlement.

The three marks are official assets downloaded from the Internet Court partner page and the GenLayer brand page. Rebuild the video on macOS with:

```bash
say -v Samantha -r 155 -o video/output/narration.aiff "<narration from docs/demo-script.md>"
swift scripts/render_demo_video.swift
```

The renderer uses AVFoundation and Core Graphics and produces a 1280×720 H.264 MP4.
