"""Tests for the speech provider tooling in tools/tts.

These tests never contact a provider. They prove three things:

1. nothing the tooling writes or prints can contain a credential;
2. a blank optional key is handled as "not supplied" and never breaks a working
   setting or produces a false success;
3. an approved cached clip keeps its file name, so a fallback provider cannot
   overwrite reviewed audio.

Run with:
    python -m unittest discover -s tests/tts-tools -p "test_*.py"
"""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.tts import env_merge, probes, providers, redaction, smoke  # noqa: E402

# Credential-shaped strings are assembled from fragments so that this test file
# itself never contains something that looks like a live key.
FAKE_OPENROUTER_VALUE = "sk-" + "or-v1-" + ("0123456789abcdef" * 3)
FAKE_CARTESIA_VALUE = "sk_" + "car_" + ("abcdef0123456789" * 2)

# Everything this packet introduced. All of it must stay credential free,
# including every test file and the report that the check writes.
NEW_FILES = [
    *sorted((REPO_ROOT / "tools" / "tts").glob("*.py")),
    *sorted((REPO_ROOT / "tests" / "tts-tools").glob("*.py")),
    REPO_ROOT / "config" / "tts-providers.schema.json",
    REPO_ROOT / "docs" / "16-tts-provider-operations.md",
    REPO_ROOT / "research" / "tts-provider-smoke.json",
]

MINIMAL_PROCESS_ENV = {
    key: os.environ.get(key, "")
    for key in ("PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE")
    if os.environ.get(key)
}


def write_secret_files(directory: Path, shared: str, project: str) -> Path:
    (directory / env_merge.SHARED_FILE_NAME).write_text(shared, encoding="utf-8")
    (directory / env_merge.PROJECT_FILE_NAME).write_text(project, encoding="utf-8")
    return directory


class RedactionTests(unittest.TestCase):
    def test_fingerprint_is_not_the_value_and_is_stable(self) -> None:
        fingerprint = redaction.credential_fingerprint(FAKE_OPENROUTER_VALUE)
        self.assertTrue(fingerprint.startswith("fp:"))
        self.assertNotIn(FAKE_OPENROUTER_VALUE, fingerprint)
        self.assertNotIn(FAKE_OPENROUTER_VALUE[:12], fingerprint)
        self.assertEqual(fingerprint, redaction.credential_fingerprint(FAKE_OPENROUTER_VALUE))
        self.assertEqual(15, len(fingerprint))

    def test_describe_credential_never_returns_the_value(self) -> None:
        described = redaction.describe_credential("CARTESIA_API_KEY", FAKE_CARTESIA_VALUE)
        self.assertTrue(described["configured"])
        self.assertNotIn(FAKE_CARTESIA_VALUE, json.dumps(described))

    def test_blank_credential_is_described_as_not_configured(self) -> None:
        described = redaction.describe_credential("CARTESIA_API_KEY", "   ")
        self.assertFalse(described["configured"])
        self.assertNotIn("fingerprint", described)

    def test_personal_account_in_variable_name_is_masked(self) -> None:
        masked = redaction.redact_variable_name("OPENROUTER_API_KEY_SOMEONE_GMAIL_COM", index=2)
        self.assertEqual("OPENROUTER_API_KEY_<account-2>", masked)
        self.assertEqual("CARTESIA_API_KEY", redaction.redact_variable_name("CARTESIA_API_KEY"))

    def test_known_credential_shapes_are_detected(self) -> None:
        text = f"note: {FAKE_OPENROUTER_VALUE}"
        findings = redaction.scan_text_for_secrets(text, "example")
        self.assertTrue(findings)
        self.assertNotIn(FAKE_OPENROUTER_VALUE, findings[0].describe())

    def test_find_known_values_reports_names_only(self) -> None:
        exposed = redaction.find_known_values(
            f"leaked {FAKE_CARTESIA_VALUE}", {"CARTESIA_API_KEY": FAKE_CARTESIA_VALUE}
        )
        self.assertEqual(["CARTESIA_API_KEY"], exposed)


class NoSecretsInNewFilesTests(unittest.TestCase):
    def test_new_files_contain_no_credential_shaped_string(self) -> None:
        for path in NEW_FILES:
            if not path.exists():
                continue
            findings = redaction.scan_text_for_secrets(path.read_text(encoding="utf-8"), path.name)
            self.assertEqual([], [finding.describe() for finding in findings], f"{path.name} looks like it contains a key")

    def test_new_files_do_not_repeat_a_configured_credential(self) -> None:
        merged = env_merge.merge_environment()
        values = merged.credential_values()
        if not values:
            self.skipTest("No credential values are configured on this machine.")
        for path in NEW_FILES:
            if not path.exists():
                continue
            exposed = redaction.find_known_values(path.read_text(encoding="utf-8"), values)
            self.assertEqual([], exposed, f"{path.name} repeats a configured credential")


class EnvironmentMergeTests(unittest.TestCase):
    def test_blank_project_value_does_not_override_a_working_shared_value(self) -> None:
        with TemporaryDirectory() as raw:
            directory = write_secret_files(
                Path(raw),
                shared=f"OPENROUTER_API_KEY={FAKE_OPENROUTER_VALUE}\n",
                project="OPENROUTER_API_KEY=\nCARTESIA_API_KEY=\n",
            )
            merged = env_merge.merge_environment(process_env={}, secrets_dir=directory)
            self.assertTrue(merged.is_configured("OPENROUTER_API_KEY"))
            self.assertEqual(env_merge.SHARED_FILE_NAME, merged.source_of("OPENROUTER_API_KEY"))
            self.assertFalse(merged.is_configured("CARTESIA_API_KEY"))
            self.assertIn("CARTESIA_API_KEY", merged.blank_variables)
            self.assertEqual([], [p for p in merged.problems if p.severity == "error"])

    def test_project_file_overrides_shared_file_when_a_value_is_supplied(self) -> None:
        with TemporaryDirectory() as raw:
            directory = write_secret_files(
                Path(raw),
                shared="GERMAN_TTS_EDGE_RATE=+0%\n",
                project="GERMAN_TTS_EDGE_RATE=+4%\n",
            )
            merged = env_merge.merge_environment(process_env={}, secrets_dir=directory)
            self.assertEqual("+4%", merged.get("GERMAN_TTS_EDGE_RATE"))
            self.assertEqual(env_merge.PROJECT_FILE_NAME, merged.source_of("GERMAN_TTS_EDGE_RATE"))

    def test_process_environment_is_never_overwritten(self) -> None:
        with TemporaryDirectory() as raw:
            directory = write_secret_files(
                Path(raw),
                shared="GERMAN_TTS_EDGE_VOICE=de-DE-FromSharedFile\n",
                project="GERMAN_TTS_EDGE_VOICE=de-DE-FromProjectFile\n",
            )
            merged = env_merge.merge_environment(
                process_env={"GERMAN_TTS_EDGE_VOICE": "de-DE-AlreadySetInShell"}, secrets_dir=directory
            )
            self.assertEqual("de-DE-AlreadySetInShell", merged.get("GERMAN_TTS_EDGE_VOICE"))
            self.assertEqual("process-environment", merged.source_of("GERMAN_TTS_EDGE_VOICE"))

    def test_unreadable_line_is_reported_by_position_without_content(self) -> None:
        with TemporaryDirectory() as raw:
            directory = write_secret_files(
                Path(raw),
                shared="CARTESIA_VOICE_ID=\n",
                project="# comment\nthis line has no equals sign\n",
            )
            merged = env_merge.merge_environment(process_env={}, secrets_dir=directory)
            problems = [p for p in merged.problems if p.code == "malformed-line"]
            self.assertEqual(1, len(problems))
            self.assertEqual(f"{env_merge.PROJECT_FILE_NAME}:2", problems[0].location)
            self.assertEqual("error", problems[0].severity)
            self.assertNotIn("this line has no equals sign", problems[0].message)

    def test_prose_in_the_shared_machine_file_is_ignored_not_fatal(self) -> None:
        with TemporaryDirectory() as raw:
            directory = write_secret_files(
                Path(raw),
                shared="Notes to self about my machine\n---\nGERMAN_TTS_EDGE_RATE=+4%\n",
                project="CARTESIA_API_KEY=\n",
            )
            merged = env_merge.merge_environment(process_env={}, secrets_dir=directory)
            self.assertFalse(merged.has_errors())
            severities = {p.severity for p in merged.problems if p.code == "malformed-line"}
            self.assertEqual({"info"}, severities)
            self.assertEqual("+4%", merged.get("GERMAN_TTS_EDGE_RATE"))

    def test_missing_project_file_is_an_actionable_error(self) -> None:
        with TemporaryDirectory() as raw:
            (Path(raw) / env_merge.SHARED_FILE_NAME).write_text("", encoding="utf-8")
            merged = env_merge.merge_environment(process_env={}, secrets_dir=Path(raw))
            self.assertTrue(any(p.code == "missing-secret-file" for p in merged.problems))

    def test_commented_and_quoted_values_are_handled(self) -> None:
        with TemporaryDirectory() as raw:
            directory = write_secret_files(
                Path(raw),
                shared='GERMAN_TTS_EDGE_RATE="+4%"\nTTSFORFREE_API_KEY=# not filled in yet\n',
                project="export GERMAN_TTS_PRIMARY=edge-tts\n",
            )
            merged = env_merge.merge_environment(process_env={}, secrets_dir=directory)
            self.assertEqual("+4%", merged.get("GERMAN_TTS_EDGE_RATE"))
            self.assertFalse(merged.is_configured("TTSFORFREE_API_KEY"))
            self.assertEqual("edge-tts", merged.get("GERMAN_TTS_PRIMARY"))


class ProviderRegistryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.document = providers.registry_document()
        self.schema = json.loads((REPO_ROOT / "config" / "tts-providers.schema.json").read_text(encoding="utf-8"))

    def _validator(self):
        try:
            import jsonschema  # noqa: PLC0415
        except ImportError:  # pragma: no cover - environment without jsonschema
            self.skipTest("jsonschema is not installed.")
        return jsonschema

    def test_registry_matches_the_published_schema(self) -> None:
        jsonschema = self._validator()
        jsonschema.validate(self.document, self.schema)

    def test_schema_refuses_generation_for_a_paid_provider(self) -> None:
        jsonschema = self._validator()
        document = json.loads(json.dumps(self.document))
        for provider in document["providers"]:
            if provider["id"] == "cartesia":
                provider["liveGenerationAllowed"] = True
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(document, self.schema)

    def test_schema_refuses_a_credential_value_in_place_of_a_variable_name(self) -> None:
        jsonschema = self._validator()
        document = json.loads(json.dumps(self.document))
        for provider in document["providers"]:
            if provider["id"] == "cartesia":
                provider["credentialVariables"] = [FAKE_CARTESIA_VALUE]
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(document, self.schema)

    def test_only_edge_tts_is_primary_and_only_it_may_generate(self) -> None:
        primaries = [p for p in providers.PROVIDERS if p["role"] == "primary"]
        self.assertEqual(["edge-tts"], [str(p["id"]) for p in primaries])
        for provider in providers.PROVIDERS:
            if provider["id"] != "edge-tts":
                self.assertFalse(provider["liveGenerationAllowed"], f"{provider['id']} must not generate")
            self.assertTrue(provider["generationRequiresFlag"])

    def test_provider_hosts_are_assigned_to_the_correct_records(self) -> None:
        self.assertIsNone(providers.provider_by_id("edge-tts")["baseUrl"])
        self.assertEqual("https://api.ttsforfree.com", providers.provider_by_id("ttsforfree")["baseUrl"])

    def test_registry_document_carries_no_value_shaped_string(self) -> None:
        findings = redaction.scan_text_for_secrets(json.dumps(self.document, indent=2), "registry")
        self.assertEqual([], [finding.describe() for finding in findings])


class ConfigurationValidationTests(unittest.TestCase):
    def _merged(self, project: str, shared: str = "") -> env_merge.MergedEnvironment:
        self._temporary = TemporaryDirectory()
        directory = write_secret_files(Path(self._temporary.name), shared=shared, project=project)
        return env_merge.merge_environment(process_env={}, secrets_dir=directory)

    def tearDown(self) -> None:
        temporary = getattr(self, "_temporary", None)
        if temporary is not None:
            temporary.cleanup()

    def test_approved_configuration_has_no_problems(self) -> None:
        merged = self._merged(
            "GERMAN_TTS_PRIMARY=edge-tts\nGERMAN_TTS_EDGE_VOICE=de-DE-KatjaNeural\n"
            "GERMAN_TTS_EDGE_RATE=+4%\nGERMAN_TTS_FALLBACK_ORDER=cartesia,openrouter,ttsforfree\n"
        )
        self.assertEqual([], providers.validate_configuration(merged))

    def test_unknown_provider_in_fallback_order_is_an_error(self) -> None:
        merged = self._merged("GERMAN_TTS_FALLBACK_ORDER=cartesia,does-not-exist\n")
        codes = [problem.code for problem in providers.validate_configuration(merged)]
        self.assertIn("unknown-fallback-provider", codes)

    def test_replacing_the_approved_primary_is_an_error(self) -> None:
        merged = self._merged("GERMAN_TTS_PRIMARY=cartesia\n")
        codes = [problem.code for problem in providers.validate_configuration(merged)]
        self.assertIn("primary-not-approved", codes)

    def test_unknown_primary_is_an_error(self) -> None:
        merged = self._merged("GERMAN_TTS_PRIMARY=some-new-service\n")
        codes = [problem.code for problem in providers.validate_configuration(merged)]
        self.assertIn("unknown-primary-provider", codes)

    def test_changed_baseline_voice_is_a_warning_not_a_silent_change(self) -> None:
        merged = self._merged("GERMAN_TTS_EDGE_VOICE=de-DE-ConradNeural\n")
        problems = providers.validate_configuration(merged)
        self.assertEqual(["baseline-voice-overridden"], [p.code for p in problems])
        self.assertEqual("warning", problems[0].severity)


class CacheKeyTests(unittest.TestCase):
    def test_baseline_spec_keeps_the_existing_clip_file_name(self) -> None:
        record = providers.clip_cache_key(providers.ClipSpec(text="  die   Köchin  "))
        self.assertTrue(record["isApprovedBaseline"])
        self.assertEqual(providers.legacy_clip_filename("die Köchin"), record["fileName"])

    def test_a_different_provider_writes_a_different_file(self) -> None:
        baseline = providers.clip_cache_key(providers.ClipSpec(text="die Köchin"))
        fallback = providers.clip_cache_key(
            providers.ClipSpec(text="die Köchin", provider="cartesia", model="cartesia/sonic/2026-03")
        )
        self.assertNotEqual(baseline["cacheKey"], fallback["cacheKey"])
        self.assertNotEqual(baseline["fileName"], fallback["fileName"])
        self.assertFalse(fallback["isApprovedBaseline"])
        self.assertTrue(str(fallback["fileName"]).startswith("tts-cartesia-"))

    def test_every_speaking_control_participates_in_the_key(self) -> None:
        baseline = providers.clip_cache_key(providers.ClipSpec(text="die Köchin"))["cacheKey"]
        for changed in (
            providers.ClipSpec(text="die Köchin", rate="+0%"),
            providers.ClipSpec(text="die Köchin", pitch="+5Hz"),
            providers.ClipSpec(text="die Köchin", volume="-10%"),
            providers.ClipSpec(text="die Köchin", voice="de-DE-ConradNeural"),
            providers.ClipSpec(text="die Köchin", model="edge-tts/de-DE-neural/v2"),
            providers.ClipSpec(text="die Köchin", locale="de-AT"),
            providers.ClipSpec(text="die Köchin", format="opus"),
            providers.ClipSpec(text="der Koch"),
        ):
            self.assertNotEqual(baseline, providers.clip_cache_key(changed)["cacheKey"])

    def test_whitespace_only_differences_reuse_the_same_clip(self) -> None:
        first = providers.clip_cache_key(providers.ClipSpec(text="Guten Tag."))["cacheKey"]
        second = providers.clip_cache_key(providers.ClipSpec(text="  Guten\tTag.  "))["cacheKey"]
        self.assertEqual(first, second)

    def test_cache_key_reproduces_the_existing_approved_clip_names(self) -> None:
        manifest_path = REPO_ROOT / providers.BASELINE_MANIFEST_PATH
        if not manifest_path.exists():
            self.skipTest("The approved audio manifest is not present in this checkout.")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assets = manifest.get("assets", [])
        self.assertTrue(assets, "The approved audio manifest is empty.")
        mismatched = [
            asset["id"]
            for asset in assets
            if not str(asset.get("path", "")).endswith(providers.legacy_clip_filename(asset.get("spokenText", "")))
        ]
        self.assertEqual([], mismatched)
        self.assertEqual(providers.BASELINE_PROFILE["voice"], manifest.get("voice"))
        self.assertEqual(providers.BASELINE_PROFILE["rate"], manifest.get("rate"))


class ProbeBehaviourTests(unittest.TestCase):
    def test_generation_sample_above_the_ceiling_is_refused_before_any_call(self) -> None:
        result = probes.edge_tts_generation_check("Ein viel zu langer Beispielsatz für den Test.", character_ceiling=5)
        self.assertEqual(probes.CATEGORY_POLICY_BLOCKED, result.error_category)
        self.assertNotEqual(probes.AVAILABLE, result.status)

    def test_ttsforfree_uses_documented_default_endpoint_and_api_key_header(self) -> None:
        with mock.patch.object(probes, "_get_json", return_value=(200, [], None)) as get_json:
            result = probes.probe_ttsforfree(FAKE_OPENROUTER_VALUE, base_url=None)
        self.assertEqual(probes.AVAILABLE, result.status)
        get_json.assert_called_once_with(
            "https://api.ttsforfree.com/api/Common/GetListLanguage",
            headers={"X-API-Key": FAKE_OPENROUTER_VALUE},
            timeout=probes.DEFAULT_TIMEOUT_SECONDS,
        )
        self.assertNotIn(FAKE_OPENROUTER_VALUE, json.dumps(result.to_dict()))

    def test_ttsforfree_rejects_an_unapproved_host_without_sending_the_key(self) -> None:
        with mock.patch.object(probes, "_get_json") as get_json:
            result = probes.probe_ttsforfree(FAKE_OPENROUTER_VALUE, base_url="https://example.invalid")
        get_json.assert_not_called()
        self.assertEqual(probes.CATEGORY_POLICY_BLOCKED, result.error_category)
        self.assertNotIn(FAKE_OPENROUTER_VALUE, json.dumps(result.to_dict()))

    def test_openrouter_key_check_drops_the_provider_key_label(self) -> None:
        payload = {
            "data": {
                "label": "sk-or-v1-abc...789",
                "creator_user_id": "user_00000000000000000000000000",
                "is_free_tier": True,
                "is_management_key": False,
                "is_provisioning_key": False,
                "limit": None,
                "limit_remaining": None,
                "limit_reset": "monthly",
                "usage": 1.5,
                "usage_daily": 0.25,
            }
        }
        with mock.patch.object(probes, "_get_json", return_value=(200, payload, None)):
            result = probes.probe_openrouter_key(FAKE_OPENROUTER_VALUE, "https://openrouter.ai/api/v1")
        serialized = json.dumps(result.to_dict())
        self.assertEqual(probes.AVAILABLE, result.status)
        self.assertNotIn("label", serialized)
        self.assertNotIn("creator_user_id", serialized)
        self.assertNotIn(FAKE_OPENROUTER_VALUE, serialized)
        self.assertEqual([], [f.describe() for f in redaction.scan_text_for_secrets(serialized, "openrouter-result")])

    def test_account_management_key_cannot_pass_as_a_speech_key(self) -> None:
        payload = {"data": {"is_management_key": True, "is_provisioning_key": False, "is_free_tier": False}}
        with mock.patch.object(probes, "_get_json", return_value=(200, payload, None)):
            result = probes.probe_openrouter_key(FAKE_OPENROUTER_VALUE, "https://openrouter.ai/api/v1")
        self.assertNotEqual(probes.AVAILABLE, result.status)

    def test_rejected_key_and_exhausted_quota_are_different_categories(self) -> None:
        with mock.patch.object(probes, "_get_json", return_value=(401, None, None)):
            rejected = probes.probe_openrouter_key(FAKE_OPENROUTER_VALUE, "https://openrouter.ai/api/v1")
        with mock.patch.object(probes, "_get_json", return_value=(429, None, None)):
            limited = probes.probe_openrouter_key(FAKE_OPENROUTER_VALUE, "https://openrouter.ai/api/v1")
        self.assertEqual((probes.UNAUTHORIZED, probes.CATEGORY_CREDENTIAL_REJECTED), (rejected.status, rejected.error_category))
        self.assertEqual((probes.QUOTA_LIMITED, probes.CATEGORY_QUOTA), (limited.status, limited.error_category))

    def test_model_discovery_separates_free_speech_models_from_free_text_models(self) -> None:
        payload = {
            "data": [
                {
                    "id": "vendor/speech-free:free",
                    "architecture": {"output_modalities": ["audio"]},
                    "pricing": {"prompt": "0", "completion": "0"},
                },
                {
                    "id": "vendor/speech-paid",
                    "architecture": {"output_modalities": ["audio"]},
                    "pricing": {"prompt": "0.0001", "completion": "0.0002"},
                },
                {
                    "id": "vendor/text-free:free",
                    "architecture": {"output_modalities": ["text"]},
                    "pricing": {"prompt": "0", "completion": "0"},
                },
            ]
        }
        with mock.patch.object(probes, "_get_json", return_value=(200, payload, None)):
            result = probes.discover_openrouter_speech_models("https://openrouter.ai/api/v1")
        metadata = result.metadata
        self.assertEqual(2, metadata["audioOutputModelCount"])
        self.assertEqual(["vendor/speech-free:free"], metadata["freeAudioOutputModels"])
        self.assertEqual(1, metadata["freeTextOnlyModelCount"])
        self.assertTrue(metadata["freeTextOnlyModelsCannotProduceSpeech"])
        self.assertIn("Codex", str(metadata["audioOutputIsNotProofOfGermanSpeech"]))

    def test_unreachable_provider_is_reported_as_a_network_problem(self) -> None:
        with mock.patch.object(probes, "_get_json", return_value=(None, None, "network-unreachable")):
            result = probes.probe_cartesia(FAKE_CARTESIA_VALUE, "https://api.cartesia.ai", "2026-03-01")
        self.assertEqual(probes.NETWORK_UNREACHABLE, result.status)
        self.assertEqual(probes.CATEGORY_NETWORK, result.error_category)


class SmokeCommandTests(unittest.TestCase):
    APPROVED_PROJECT_FILE = (
        "CARTESIA_API_KEY=\n"
        "CARTESIA_VOICE_ID=\n"
        "OPENROUTER_API_KEY=\n"
        "OPENROUTER_TTS_MODEL=\n"
        "TTSFORFREE_API_KEY=\n"
        "GERMAN_TTS_PRIMARY=edge-tts\n"
        "GERMAN_TTS_EDGE_VOICE=de-DE-KatjaNeural\n"
        "GERMAN_TTS_EDGE_RATE=+4%\n"
        "GERMAN_TTS_FALLBACK_ORDER=cartesia,openrouter,ttsforfree\n"
    )

    def _run(self, shared: str, project: str, extra_arguments: list[str] | None = None):
        with TemporaryDirectory() as raw:
            directory = write_secret_files(Path(raw), shared=shared, project=project)
            report_path = directory / "report.json"
            arguments = [
                "--offline",
                "--secrets-dir",
                str(directory),
                "--report",
                str(report_path),
                "--timestamp",
                "2026-08-07T00:00:00Z",
            ]
            arguments.extend(extra_arguments or [])
            with mock.patch.dict(os.environ, MINIMAL_PROCESS_ENV, clear=True):
                exit_code = smoke.main(arguments)
            report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else None
            return exit_code, report

    def test_default_run_selects_edge_tts_and_marks_optional_providers_not_configured(self) -> None:
        exit_code, report = self._run(shared="", project=self.APPROVED_PROJECT_FILE)
        self.assertEqual(smoke.EXIT_OK, exit_code)
        self.assertIsNotNone(report)
        assert report is not None
        self.assertEqual("edge-tts", report["recommendedProvider"]["provider"])
        self.assertEqual("edge-tts", report["primary"]["provider"])
        statuses = {entry["provider"]: entry["status"] for entry in report["providers"]}
        self.assertEqual(probes.AVAILABLE, statuses["edge-tts"])
        for optional in ("cartesia", "openrouter", "ttsforfree"):
            self.assertEqual(probes.NOT_CONFIGURED, statuses[optional], f"{optional} should be not_configured")
        self.assertFalse(report["policy"]["paidGenerationCallsMade"])
        self.assertFalse(report["mode"]["generationChecksAllowed"])
        self.assertFalse(report["approvedAudio"]["regeneratedByThisCheck"])

    def test_report_describes_a_supplied_key_without_containing_it(self) -> None:
        exit_code, report = self._run(
            shared=f"OPENROUTER_API_KEY={FAKE_OPENROUTER_VALUE}\n", project=self.APPROVED_PROJECT_FILE
        )
        self.assertEqual(smoke.EXIT_OK, exit_code)
        assert report is not None
        serialized = json.dumps(report, ensure_ascii=False)
        self.assertNotIn(FAKE_OPENROUTER_VALUE, serialized)
        self.assertEqual([], [f.describe() for f in redaction.scan_text_for_secrets(serialized, "report")])
        openrouter = next(entry for entry in report["providers"] if entry["provider"] == "openrouter")
        self.assertTrue(openrouter["configured"])
        self.assertEqual(probes.SKIPPED_OFFLINE, openrouter["status"])
        credential = openrouter["credentials"][0]
        self.assertEqual("OPENROUTER_API_KEY", credential["variable"])
        self.assertTrue(credential["configured"])
        self.assertTrue(str(credential["fingerprint"]).startswith("fp:"))

    def test_configured_ttsforfree_key_is_never_contacted_offline(self) -> None:
        project = self.APPROVED_PROJECT_FILE.replace(
            "TTSFORFREE_API_KEY=", f"TTSFORFREE_API_KEY={FAKE_OPENROUTER_VALUE}"
        )
        with mock.patch.object(probes, "probe_ttsforfree") as probe:
            exit_code, report = self._run(shared="", project=project)
        self.assertEqual(smoke.EXIT_OK, exit_code)
        probe.assert_not_called()
        assert report is not None
        entry = next(item for item in report["providers"] if item["provider"] == "ttsforfree")
        self.assertEqual(probes.SKIPPED_OFFLINE, entry["status"])

    def test_blank_optional_keys_produce_actionable_guidance_and_no_error(self) -> None:
        exit_code, report = self._run(shared="", project=self.APPROVED_PROJECT_FILE)
        self.assertEqual(smoke.EXIT_OK, exit_code)
        assert report is not None
        self.assertEqual([], report["configuration"]["problems"])
        cartesia = next(entry for entry in report["providers"] if entry["provider"] == "cartesia")
        self.assertIn("CARTESIA_API_KEY", cartesia["summary"])
        self.assertIn("german-learning-tts.env", cartesia["summary"])
        self.assertEqual(probes.CATEGORY_MISSING_CREDENTIAL, cartesia["errorCategory"])

    def test_unknown_fallback_provider_stops_the_check(self) -> None:
        exit_code, report = self._run(
            shared="", project=self.APPROVED_PROJECT_FILE.replace("cartesia,openrouter,ttsforfree", "cartesia,mystery-tts")
        )
        self.assertEqual(smoke.EXIT_BAD_CONFIGURATION, exit_code)
        assert report is not None
        self.assertEqual("configuration-error", report["overall"])

    def test_replacing_the_approved_primary_stops_the_check(self) -> None:
        exit_code, _ = self._run(
            shared="", project=self.APPROVED_PROJECT_FILE.replace("GERMAN_TTS_PRIMARY=edge-tts", "GERMAN_TTS_PRIMARY=openrouter")
        )
        self.assertEqual(smoke.EXIT_BAD_CONFIGURATION, exit_code)

    def test_unreadable_project_settings_file_stops_the_check(self) -> None:
        exit_code, _ = self._run(shared="", project=self.APPROVED_PROJECT_FILE + "not a setting\n")
        self.assertEqual(smoke.EXIT_BAD_CONFIGURATION, exit_code)

    def test_prose_in_the_shared_machine_file_does_not_stop_the_check(self) -> None:
        exit_code, report = self._run(shared="Some notes, not a setting\n", project=self.APPROVED_PROJECT_FILE)
        self.assertEqual(smoke.EXIT_OK, exit_code)
        assert report is not None
        self.assertEqual("ok", report["overall"])
        self.assertEqual(["info"], [p["severity"] for p in report["configuration"]["problems"]])

    def test_console_summary_is_readable_and_credential_free(self) -> None:
        exit_code, report = self._run(
            shared=f"OPENROUTER_API_KEY={FAKE_OPENROUTER_VALUE}\n", project=self.APPROVED_PROJECT_FILE
        )
        self.assertEqual(smoke.EXIT_OK, exit_code)
        assert report is not None
        console = smoke.render_console(report)
        self.assertIn("Overall result:", console)
        self.assertIn("Use for new audio: edge-tts", console)
        self.assertNotIn(FAKE_OPENROUTER_VALUE, console)
        self.assertEqual([], [f.describe() for f in redaction.scan_text_for_secrets(console, "console")])

    def test_generation_checks_are_off_unless_explicitly_requested(self) -> None:
        arguments = smoke.parse_arguments([])
        self.assertFalse(arguments.allow_generation)
        self.assertEqual(smoke.DEFAULT_GENERATION_CEILING, arguments.max_generation_chars)

    def test_absurd_generation_ceiling_is_refused(self) -> None:
        with mock.patch.dict(os.environ, MINIMAL_PROCESS_ENV, clear=True):
            exit_code = smoke.main(["--offline", "--no-report", "--max-generation-chars", "5000"])
        self.assertEqual(smoke.EXIT_BAD_CONFIGURATION, exit_code)


if __name__ == "__main__":
    unittest.main()
