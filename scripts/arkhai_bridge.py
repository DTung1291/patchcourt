#!/usr/bin/env python3
"""Validate a PatchCourt instruction and relay it to Arkhai's NLA CLI.

Dry-run is the default. --execute performs an on-chain Arkhai arbitration and
therefore expects the configured NLA wallet to be the escrow's oracle.
"""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


UID_RE = re.compile(r"^0x[0-9a-fA-F]{64}$")
SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$")
NETWORKS = {"sepolia", "base-sepolia"}
EXPECTED_KEYS = {
    "protocol", "network", "escrow_uid", "fulfillment_uid", "decision",
    "outcome", "case_id", "round", "commit_sha",
}


def validate_instruction(value):
    if not isinstance(value, dict) or set(value) != EXPECTED_KEYS:
        raise ValueError("instruction must contain exactly the PatchCourt settlement fields")
    if value["protocol"] != "arkhai-nla-v1":
        raise ValueError("unsupported protocol")
    if value["network"] not in NETWORKS:
        raise ValueError("unsupported Arkhai network")
    for key in ("escrow_uid", "fulfillment_uid"):
        if not isinstance(value[key], str) or not UID_RE.fullmatch(value[key]):
            raise ValueError(f"{key} must be a 32-byte UID")
    if type(value["decision"]) is not bool:
        raise ValueError("decision must be boolean")
    if value["outcome"] not in ("APPROVED", "REJECTED"):
        raise ValueError("outcome must be final")
    if value["decision"] != (value["outcome"] == "APPROVED"):
        raise ValueError("decision does not match outcome")
    if type(value["case_id"]) is not int or value["case_id"] < 1:
        raise ValueError("case_id must be positive")
    if type(value["round"]) is not int or value["round"] < 1:
        raise ValueError("round must be positive")
    if not isinstance(value["commit_sha"], str) or not SHA_RE.fullmatch(value["commit_sha"]):
        raise ValueError("commit_sha must be a full SHA")
    return value


def arbitration_command(instruction):
    return ["nla", "escrow:arbitrate", "--escrow-uid", instruction["escrow_uid"]]


def load_instruction(path):
    raw = sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")
    return validate_instruction(json.loads(raw))


def execute(instruction):
    if not shutil.which("nla"):
        raise RuntimeError("nla CLI is not installed; run: npm install -g nla")
    network = subprocess.run(
        ["nla", "network"], capture_output=True, text=True, check=True
    ).stdout.lower()
    if instruction["network"] not in network:
        raise RuntimeError(
            f"nla is not configured for {instruction['network']}; switch it explicitly before retrying"
        )
    answer = "approve\n" if instruction["decision"] else "reject\n"
    return subprocess.run(arbitration_command(instruction), input=answer, text=True, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("instruction", help="JSON exported from get_arbitration_instruction, or - for stdin")
    parser.add_argument(
        "--execute", action="store_true",
        help="submit the decision through the configured NLA oracle wallet",
    )
    args = parser.parse_args()
    try:
        instruction = load_instruction(args.instruction)
        command = arbitration_command(instruction)
        print(json.dumps({
            "validated": True,
            "mode": "execute" if args.execute else "dry-run",
            "network": instruction["network"],
            "decision": instruction["outcome"],
            "escrow_uid": instruction["escrow_uid"],
            "command": command,
        }, indent=2))
        if args.execute:
            execute(instruction)
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"PatchCourt bridge error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
