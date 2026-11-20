import unittest

from scripts.arkhai_bridge import arbitration_command, validate_instruction


def instruction(**updates):
    value = {
        "protocol": "arkhai-nla-v1",
        "network": "sepolia",
        "escrow_uid": "0x" + "e" * 64,
        "fulfillment_uid": "0x" + "f" * 64,
        "decision": True,
        "outcome": "APPROVED",
        "case_id": 1,
        "round": 1,
        "commit_sha": "a" * 40,
    }
    value.update(updates)
    return value


class ArkhaiBridgeTests(unittest.TestCase):
    def test_valid_instruction_builds_nla_command(self):
        value = validate_instruction(instruction())
        self.assertEqual(
            arbitration_command(value),
            ["nla", "escrow:arbitrate", "--escrow-uid", value["escrow_uid"]],
        )

    def test_inconsistent_decision_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_instruction(instruction(decision=False))

    def test_inconclusive_cannot_reach_arkhai(self):
        with self.assertRaisesRegex(ValueError, "final"):
            validate_instruction(instruction(outcome="INCONCLUSIVE", decision=False))

    def test_unknown_fields_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "exactly"):
            validate_instruction(instruction(untrusted_override=True))


if __name__ == "__main__":
    unittest.main()
