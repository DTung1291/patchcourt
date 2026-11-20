#!/usr/bin/env bash
set -euo pipefail

python3 -m py_compile contracts/patchcourt.py scripts/arkhai_bridge.py
python3 -m unittest discover -s tests -p 'test_*.py'

if [[ -x .venv/bin/genvm-lint ]]; then
  .venv/bin/genvm-lint check contracts/patchcourt.py
elif command -v genvm-lint >/dev/null 2>&1; then
  genvm-lint check contracts/patchcourt.py
else
  echo "genvm-lint is not installed; Python compilation and local tests passed."
fi
