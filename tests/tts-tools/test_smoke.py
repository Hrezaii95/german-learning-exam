from __future__ import annotations

import json
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from tools.tts import env_merge, smoke


# Assembled from fragments so that no credential-shaped string is stored in a
# test artifact, while still exercising the leak detection.
FAKE_OPENROUTER_VALUE = "sk-" + "or-v1-" + ("ABCD1234" * 3)


def _write_env(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")


class SmokeTests(unittest.TestCase):
    def test_blank_optional_keys_are_safe_and_marked_not_configured(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            tmp_path = Path(directory)
            shared = tmp_path / ".secrets.env"
            project = tmp_path / "german-learning-tts.env"

            _write_env(shared, "GERMAN_TTS_PRIMARY=edge-tts\nGERMAN_TTS_EDGE_VOICE=de-DE-KatjaNeural\n")
            _write_env(
                project,
                "\n".join(
                    [
                        "OPENROUTER_API_KEY=",
                        "CARTESIA_API_KEY=",
                        "TTSFORFREE_API_KEY=",
                        "GERMAN_TTS_PRIMARY=edge-tts",
                        "",
                    ]
                ),
            )

            original_merge = env_merge.merge_environment

            def merge_from_tmp() -> env_merge.MergedEnvironment:
                return original_merge(shared_file=shared, project_file=project)

            with mock.patch.object(smoke.env_merge, "merge_environment", side_effect=merge_from_tmp):
                outcome = smoke.build_report(
                    report_path=tmp_path / "report.json",
                    offline=True,
                    allow_generation_check=False,
                    generation_text="Guten Tag.",
                    generation_ceiling=32,
                    timeout_seconds=1.0,
                )

            by_provider = {item["provider"]: item for item in outcome.report["providers"]}
            self.assertEqual(by_provider["openrouter"]["status"], "not_configured")
            self.assertEqual(by_provider["cartesia"]["status"], "not_configured")
            self.assertEqual(by_provider["ttsforfree"]["status"], "not_configured")
            self.assertIn(outcome.exit_code, {0, 2})

    def test_report_has_no_secret_shape_or_known_value(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            tmp_path = Path(directory)
            shared = tmp_path / ".secrets.env"
            project = tmp_path / "german-learning-tts.env"
            known_key = FAKE_OPENROUTER_VALUE

            _write_env(shared, "GERMAN_TTS_PRIMARY=edge-tts\n")
            _write_env(project, f"OPENROUTER_API_KEY={known_key}\nGERMAN_TTS_PRIMARY=edge-tts\n")

            original_merge = env_merge.merge_environment

            def merge_from_tmp() -> env_merge.MergedEnvironment:
                return original_merge(shared_file=shared, project_file=project)

            with mock.patch.object(smoke.env_merge, "merge_environment", side_effect=merge_from_tmp):
                outcome = smoke.build_report(
                    report_path=tmp_path / "report.json",
                    offline=True,
                    allow_generation_check=False,
                    generation_text="Guten Tag.",
                    generation_ceiling=32,
                    timeout_seconds=1.0,
                )
                smoke.write_report(outcome)

            report_text = (tmp_path / "report.json").read_text(encoding="utf-8")
            payload = json.loads(report_text)

            self.assertNotIn(known_key, report_text)
            self.assertEqual(payload["secretExposureCheck"]["status"], "passed")
