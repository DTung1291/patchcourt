"""Deterministic state-machine and consensus-boundary tests for PatchCourt."""
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest


CLIENT = "0x1111111111111111111111111111111111111111"
WORKER = "0x2222222222222222222222222222222222222222"
OUTSIDER = "0x3333333333333333333333333333333333333333"
ESCROW_UID = "0x" + "e" * 64
FULFILLMENT_UID = "0x" + "f" * 64
SHA = "a" * 40


class UserError(Exception):
    pass


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class ConsensusDisagreement(Exception):
    pass


class Address:
    def __init__(self, value):
        self.as_hex = value.lower()


class Runtime:
    def __init__(self):
        self.sender = Address(CLIENT)
        self.llm_results = []
        self.web_status = 200
        self.web_requests = []
        self.web_body = json.dumps({
            "type": "file",
            "encoding": "base64",
            "content": "IyBEZWxpdmVyeVxuXG4tIFRlc3RzOiBwYXNzaW5nXG4=",
            "html_url": f"https://github.com/example/repo/blob/{SHA}/REPORT.md",
        }).encode()

    def run_nondet_unsafe(self, leader_fn, validator_fn):
        leader = leader_fn()
        if not validator_fn(Return(leader)):
            raise ConsensusDisagreement("validator rejected leader")
        return leader


def load_contract(runtime):
    module = types.ModuleType("genlayer")

    class Public:
        @staticmethod
        def write(fn):
            return fn

        @staticmethod
        def view(fn):
            return fn

    class Contract:
        pass

    class U32(int):
        pass

    class Web:
        @staticmethod
        def request(url, method="GET"):
            runtime.web_requests.append((url, method))
            return types.SimpleNamespace(body=runtime.web_body, status_code=runtime.web_status)

    def exec_prompt(_prompt, response_format=None):
        assert response_format == "json"
        return runtime.llm_results.pop(0)

    gl = types.SimpleNamespace(
        Contract=Contract,
        public=Public(),
        message=types.SimpleNamespace(sender_address=runtime.sender),
        message_raw={"datetime": "2026-11-20T03:00:00+00:00"},
        nondet=types.SimpleNamespace(web=Web(), exec_prompt=exec_prompt),
        vm=types.SimpleNamespace(
            UserError=UserError,
            Return=Return,
            run_nondet_unsafe=runtime.run_nondet_unsafe,
        ),
    )
    module.gl = gl
    module.u32 = U32
    module.TreeMap = dict
    module.Address = Address
    module.__all__ = ["gl", "u32", "TreeMap", "Address"]
    sys.modules["genlayer"] = module
    path = Path(__file__).parents[2] / "contracts" / "patchcourt.py"
    spec = importlib.util.spec_from_file_location("patchcourt_under_test", path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded, gl


class PatchCourtTests(unittest.TestCase):
    def setUp(self):
        self.runtime = Runtime()
        self.module, self.gl = load_contract(self.runtime)
        self.contract = self.module.PatchCourt()
        self.contract.cases_json = {}
        self.contract.escrow_cases = {}

    def set_sender(self, value):
        self.runtime.sender = Address(value)
        self.gl.message.sender_address = self.runtime.sender

    def create_case(self):
        return self.contract.create_case(
            "Patch delivery",
            "Deliver a tested patch matching the immutable acceptance criteria.",
            Address(WORKER),
            json.dumps(["The report states that the tests pass"]),
            "sepolia",
            ESCROW_UID,
        )

    def submit(self, case_id):
        self.set_sender(WORKER)
        self.contract.submit_fulfillment(
            case_id,
            FULFILLMENT_UID,
            f"https://github.com/example/repo/blob/{SHA}/REPORT.md",
            SHA,
        )

    @staticmethod
    def verdict(met, reason="Evidence is clear"):
        return {
            "criteria_results": [{"criterion_index": 0, "met": met, "reason": reason}],
            "summary": reason,
        }

    def test_approved_flow_outputs_arkhai_instruction(self):
        case_id = self.create_case()
        self.submit(case_id)
        approved = self.verdict(True)
        self.runtime.llm_results = [approved, approved]
        self.contract.adjudicate(case_id)

        case = self.contract.get_case(case_id)
        instruction = self.contract.get_arbitration_instruction(case_id)
        self.assertEqual(case["status"], "APPROVED")
        self.assertEqual(instruction["protocol"], "arkhai-nla-v1")
        self.assertTrue(instruction["decision"])
        self.assertEqual(instruction["escrow_uid"], ESCROW_UID)
        self.assertEqual(instruction["fulfillment_uid"], FULFILLMENT_UID)
        self.assertEqual(self.contract.get_case_by_escrow(ESCROW_UID), case_id)
        self.assertEqual(
            self.runtime.web_requests[0],
            (f"https://api.github.com/repos/example/repo/contents/REPORT.md?ref={SHA}", "GET"),
        )

    def test_rejected_flow_outputs_false_decision(self):
        case_id = self.create_case()
        self.submit(case_id)
        rejected = self.verdict(False, "The evidence contradicts the criterion")
        self.runtime.llm_results = [rejected, rejected]
        self.contract.adjudicate(case_id)
        instruction = self.contract.get_arbitration_instruction(case_id)
        self.assertEqual(instruction["outcome"], "REJECTED")
        self.assertFalse(instruction["decision"])

    def test_inconclusive_does_not_create_settlement_instruction(self):
        case_id = self.create_case()
        self.submit(case_id)
        unclear = self.verdict("unclear", "Evidence is insufficient")
        self.runtime.llm_results = [unclear, unclear]
        self.contract.adjudicate(case_id)
        self.assertEqual(self.contract.get_case(case_id)["status"], "REVISION_REQUIRED")
        with self.assertRaisesRegex(UserError, "no final arbitration"):
            self.contract.get_arbitration_instruction(case_id)

    def test_validator_disagreement_preserves_pending_state(self):
        case_id = self.create_case()
        self.submit(case_id)
        self.runtime.llm_results = [self.verdict(True), self.verdict(False)]
        with self.assertRaises(ConsensusDisagreement):
            self.contract.adjudicate(case_id)
        self.assertEqual(self.contract.get_case(case_id)["status"], "SUBMITTED")
        self.assertEqual(self.contract.get_case(case_id)["rounds_used"], 0)

    def test_only_worker_can_submit(self):
        case_id = self.create_case()
        self.set_sender(OUTSIDER)
        with self.assertRaisesRegex(UserError, "only worker"):
            self.contract.submit_fulfillment(
                case_id, FULFILLMENT_UID,
                f"https://github.com/example/repo/blob/{SHA}/REPORT.md", SHA,
            )

    def test_duplicate_escrow_and_mutable_evidence_fail_closed(self):
        case_id = self.create_case()
        with self.assertRaisesRegex(UserError, "already registered"):
            self.create_case()
        self.set_sender(WORKER)
        with self.assertRaisesRegex(UserError, "immutable GitHub"):
            self.contract.submit_fulfillment(
                case_id, FULFILLMENT_UID, "https://github.com/example/repo", SHA
            )
        with self.assertRaisesRegex(UserError, "ref must match"):
            self.contract.submit_fulfillment(
                case_id, FULFILLMENT_UID,
                "https://github.com/example/repo/blob/main/REPORT.md", SHA,
            )

    def test_github_error_is_inconclusive_without_llm(self):
        case_id = self.create_case()
        self.submit(case_id)
        self.runtime.web_status = 404
        self.runtime.web_body = b'{"message":"Not Found"}'
        self.contract.adjudicate(case_id)
        verdict = self.contract.get_verdict(case_id, 1)
        self.assertEqual(verdict["outcome"], "INCONCLUSIVE")
        self.assertIn("GitHub API HTTP status 404", verdict["summary"])
        self.assertEqual(self.runtime.llm_results, [])

    def test_github_canonical_ref_mismatch_is_inconclusive(self):
        case_id = self.create_case()
        self.submit(case_id)
        payload = json.loads(self.runtime.web_body)
        payload["html_url"] = "https://github.com/example/repo/blob/" + "b" * 40 + "/REPORT.md"
        self.runtime.web_body = json.dumps(payload).encode()
        self.contract.adjudicate(case_id)
        verdict = self.contract.get_verdict(case_id, 1)
        self.assertEqual(verdict["outcome"], "INCONCLUSIVE")
        self.assertIn("response ref does not match", verdict["summary"])


if __name__ == "__main__":
    unittest.main()
