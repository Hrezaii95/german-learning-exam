"""Redacted provider smoke check for German Learning OS pronunciation.

Run it with:

    python -m tools.tts.smoke

It answers one question: which speech providers are usable right now, without
spending money, without generating learner audio and without ever showing a key.

The module is deliberately conservative:

* it reads only the two approved settings files, through ``env_merge``;
* it contacts only harmless account or catalogue endpoints;
* it never prints a response body or a credential;
* it scans its own report and console text before either is released, and
  replaces the report with a refusal note if anything key-shaped is found.

Exit codes:

    0  the check completed and wrote its report
    1  only with --strict, when the result is not fully healthy
    2  the configuration is malformed or contradicts the approved voice decision
    3  the check found a credential-shaped string in its own output and refused
       to publish it
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__ in (None, ""):  # allows "python tools/tts/smoke.py" as well as -m
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from tools.tts import env_merge, probes, providers, redaction
else:
    from . import env_merge, probes, providers, redaction

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REPORT_PATH = REPO_ROOT / "research" / "tts-provider-smoke.json"
DEFAULT_GENERATION_TEXT = "Guten Tag."
DEFAULT_GENERATION_CEILING = 40
CARTESIA_DEFAULT_API_VERSION = "2026-03-01"

EXIT_OK = 0
EXIT_STRICT_NOT_HEALTHY = 1
EXIT_BAD_CONFIGURATION = 2
EXIT_CONFIGURATION_ERROR = EXIT_BAD_CONFIGURATION  # readable alias
EXIT_SECRET_EXPOSURE = 3

_HEALTHY_STATUSES = {probes.AVAILABLE}
_BENIGN_STATUSES = {probes.AVAILABLE, probes.NOT_CONFIGURED, probes.SKIPPED_OFFLINE}


@dataclass
class CheckOptions:
    """Everything that changes what the check is allowed to do."""

    offline: bool = False
    allow_generation: bool = False
    generation_text: str = DEFAULT_GENERATION_TEXT
    generation_ceiling: int = DEFAULT_GENERATION_CEILING
    timeout: float = probes.DEFAULT_TIMEOUT_SECONDS
    timestamp: str | None = None
    secrets_dir: Path | None = None
    strict: bool = False


@dataclass
class SmokeOutcome:
    """The result of one run: what to publish, where, and with which exit code."""

    exit_code: int
    report: dict[str, Any]
    report_path: Path
    console_text: str = ""
    exposure: list[str] = field(default_factory=list)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _missing_credential_result(resolved: providers.ResolvedProvider) -> probes.ProbeResult:
    variables = [slot.reported_variable for slot in resolved.credentials]
    optional = list(resolved.optional_settings)
    wanted = ", ".join(variables) if variables else "a provider key"
    extra = f" Optional settings for this provider: {', '.join(optional)}." if optional else ""
    return probes.ProbeResult(
        status=probes.NOT_CONFIGURED,
        endpoint="not checked",
        error_category=probes.CATEGORY_MISSING_CREDENTIAL,
        summary=(
            f"No key supplied, so nothing was contacted. To include this provider, put a value next to "
            f"{wanted} in german-learning-tts.env.{extra}"
        ),
    )


def _skipped_offline_result(endpoint: str) -> probes.ProbeResult:
    return probes.ProbeResult(
        status=probes.SKIPPED_OFFLINE,
        endpoint=endpoint,
        error_category=probes.CATEGORY_SKIPPED,
        summary="A key is present but the check ran offline, so nothing was contacted.",
    )


def _worst(results: list[probes.ProbeResult]) -> probes.ProbeResult:
    """Pick the result that best represents a provider that has several keys."""
    for result in results:
        if result.status == probes.AVAILABLE:
            return result
    return results[0]


def _check_edge_tts(
    resolved: providers.ResolvedProvider,
    merged: env_merge.MergedEnvironment,
    options: CheckOptions,
) -> dict[str, Any]:
    approved_voice = merged.get("GERMAN_TTS_EDGE_VOICE") or providers.BASELINE_PROFILE["voice"]
    result = probes.probe_edge_tts(approved_voice, offline=options.offline, timeout=options.timeout)
    generation: dict[str, Any] | None = None
    if options.allow_generation and options.offline:
        generation = probes.ProbeResult(
            status=probes.SKIPPED_OFFLINE,
            endpoint="local: edge_tts synthesis of a short sample",
            error_category=probes.CATEGORY_SKIPPED,
            summary="Speaking a sample needs the internet, so it was skipped for this offline check.",
        ).to_dict()
    elif options.allow_generation:
        generation = probes.edge_tts_generation_check(
            options.generation_text, options.generation_ceiling, timeout=options.timeout
        ).to_dict()
    return {"result": result, "keyChecks": [], "generationCheck": generation, "discovery": None}


def _check_openrouter(
    resolved: providers.ResolvedProvider,
    merged: env_merge.MergedEnvironment,
    options: CheckOptions,
) -> dict[str, Any]:
    base_url = str(resolved.record["baseUrl"])
    slots = resolved.configured_slots()
    if not slots:
        return {
            "result": _missing_credential_result(resolved),
            "keyChecks": [],
            "generationCheck": None,
            "discovery": None,
        }
    if options.offline:
        return {
            "result": _skipped_offline_result(f"{base_url}/key"),
            "keyChecks": [],
            "generationCheck": None,
            "discovery": {
                "kind": "model_discovery",
                "status": probes.SKIPPED_OFFLINE,
                "checkedEndpoint": f"{base_url}/models",
                "errorCategory": probes.CATEGORY_SKIPPED,
                "summary": "Speech-model discovery was skipped because the check ran offline.",
                "metadata": {},
            },
        }

    key_checks: list[dict[str, Any]] = []
    results: list[probes.ProbeResult] = []
    for slot in slots:
        result = probes.probe_openrouter_key(merged.get(slot.variable), base_url, timeout=options.timeout)
        results.append(result)
        entry = result.to_dict()
        entry["variable"] = slot.reported_variable
        key_checks.append(entry)

    combined = _worst(results)
    discovery = probes.discover_openrouter_speech_models(base_url, timeout=options.timeout)
    discovery_block = {"kind": "model_discovery", **discovery.to_dict()}
    metadata = dict(combined.metadata)
    metadata["speechModelDiscovery"] = discovery.to_dict()
    metadata["keysChecked"] = len(slots)
    summary = combined.summary
    if discovery.status == probes.AVAILABLE:
        summary = f"{summary} {discovery.summary}"
    return {
        "result": probes.ProbeResult(
            status=combined.status,
            endpoint=combined.endpoint,
            error_category=combined.error_category,
            http_status_class=combined.http_status_class,
            summary=summary,
            metadata=metadata,
        ),
        "keyChecks": key_checks,
        "generationCheck": None,
        "discovery": discovery_block,
    }


def _check_cartesia(
    resolved: providers.ResolvedProvider,
    merged: env_merge.MergedEnvironment,
    options: CheckOptions,
) -> dict[str, Any]:
    slots = resolved.configured_slots()
    base_url = str(resolved.record["baseUrl"])
    if not slots:
        return {
            "result": _missing_credential_result(resolved),
            "keyChecks": [],
            "generationCheck": None,
            "discovery": None,
        }
    if options.offline:
        return {
            "result": _skipped_offline_result(f"{base_url}/voices?limit=1"),
            "keyChecks": [],
            "generationCheck": None,
            "discovery": None,
        }
    api_version = merged.get("CARTESIA_API_VERSION") or CARTESIA_DEFAULT_API_VERSION
    result = probes.probe_cartesia(merged.get(slots[0].variable), base_url, api_version, timeout=options.timeout)
    return {"result": result, "keyChecks": [], "generationCheck": None, "discovery": None}


def _check_ttsforfree(
    resolved: providers.ResolvedProvider,
    merged: env_merge.MergedEnvironment,
    options: CheckOptions,
) -> dict[str, Any]:
    slots = resolved.configured_slots()
    if not slots:
        return {
            "result": _missing_credential_result(resolved),
            "keyChecks": [],
            "generationCheck": None,
            "discovery": None,
        }
    base_url = merged.get("TTSFORFREE_API_BASE") or None
    if options.offline:
        return {
            "result": _skipped_offline_result(
                f"{base_url or 'https://api.ttsforfree.com'}/api/Common/GetListLanguage"
            ),
            "keyChecks": [],
            "generationCheck": None,
            "discovery": None,
        }
    result = probes.probe_ttsforfree(merged.get(slots[0].variable), base_url, timeout=options.timeout)
    return {"result": result, "keyChecks": [], "generationCheck": None, "discovery": None}


_CHECKS = {
    "edge-tts": _check_edge_tts,
    "openrouter": _check_openrouter,
    "cartesia": _check_cartesia,
    "ttsforfree": _check_ttsforfree,
}


def _unknown_provider_result(provider_id: str) -> probes.ProbeResult:
    return probes.ProbeResult(
        status=probes.UNEXPECTED_RESPONSE,
        endpoint="registry",
        error_category=probes.CATEGORY_UNEXPECTED_RESPONSE,
        summary=f"The registry lists '{provider_id}', which this tool has no check for. Nothing was contacted.",
    )


def _next_action(provider_id: str, result: probes.ProbeResult, role: str) -> str:
    if result.status == probes.AVAILABLE:
        if provider_id == providers.APPROVED_PRIMARY:
            return "Nothing to do. Keep using the cached clips produced by this provider."
        return "Usable for a quality comparison or an outage, once Codex approves the voice."
    if result.status == probes.NOT_CONFIGURED:
        return f"Optional. Alpha does not need this {role} provider."
    if result.status == probes.SKIPPED_OFFLINE:
        return "Re-run without --offline to contact this provider."
    if result.status == probes.UNAUTHORIZED:
        return "Replace the key with a current one, then run the check again."
    if result.status == probes.QUOTA_LIMITED:
        return "Wait for the allowance to reset or add credit. Do not add a second key to get past the limit."
    if result.status == probes.ENDPOINT_UNKNOWN:
        return "Record the service address from the provider's documentation before relying on it."
    if result.status == probes.TOOL_MISSING:
        return "Install the missing package for this Python interpreter, then run the check again."
    return "Read the summary above and re-run the check after fixing the cause."


def inspect_approved_audio() -> dict[str, Any]:
    """Read-only evidence that the approved clips are intact and reproducibly addressed."""
    clip_directory = REPO_ROOT / providers.BASELINE_CLIP_DIRECTORY
    manifest_path = REPO_ROOT / providers.BASELINE_MANIFEST_PATH
    evidence: dict[str, Any] = {
        "clipDirectory": providers.BASELINE_CLIP_DIRECTORY,
        "clipsOnDisk": len(list(clip_directory.glob("*.mp3"))) if clip_directory.exists() else 0,
        "manifestPresent": manifest_path.exists(),
        "regeneratedByThisCheck": False,
    }
    if not manifest_path.exists():
        return evidence

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        evidence["manifestReadable"] = False
        return evidence

    assets = manifest.get("assets", [])
    reproduced = sum(
        1
        for asset in assets
        if asset.get("spokenText")
        and str(asset.get("path", "")).endswith(providers.legacy_clip_filename(asset["spokenText"]))
    )
    evidence.update(
        {
            "manifestReadable": True,
            "manifestVoice": manifest.get("voice"),
            "manifestRate": manifest.get("rate"),
            "manifestAssetCount": len(assets),
            "fileNamesReproducedByCacheKey": reproduced,
            "fileNameReproductionComplete": bool(assets) and reproduced == len(assets),
        }
    )
    return evidence


def assemble_report(merged: env_merge.MergedEnvironment, options: CheckOptions) -> dict[str, Any]:
    """Run every check and assemble the redacted report."""
    all_problems = list(merged.problems) + providers.validate_configuration(merged)

    provider_entries: list[dict[str, Any]] = []
    discovery_entries: list[dict[str, Any]] = []
    statuses: dict[str, str] = {}

    for resolved in providers.resolve_all(merged):
        provider_id = resolved.provider_id
        check = _CHECKS.get(provider_id)
        if check is None:
            outcome = {
                "result": _unknown_provider_result(provider_id),
                "keyChecks": [],
                "generationCheck": None,
                "discovery": None,
            }
        else:
            outcome = check(resolved, merged, options)

        result: probes.ProbeResult = outcome["result"]
        statuses[provider_id] = result.status
        entry: dict[str, Any] = {
            "provider": provider_id,
            "displayName": resolved.record["displayName"],
            "role": resolved.record["role"],
            "enabled": bool(resolved.record.get("enabled", True)),
            "requiresCredential": resolved.record["requiresCredential"],
            "configured": resolved.configured,
            "liveGenerationAllowed": bool(resolved.record.get("liveGenerationAllowed", False)),
            "generationRequiresFlag": bool(resolved.record.get("generationRequiresFlag", True)),
            "credentials": [slot.to_dict() for slot in resolved.credentials],
            "optionalSettings": resolved.optional_settings,
            "nextAction": _next_action(provider_id, result, str(resolved.record["role"])),
        }
        entry.update(result.to_dict())
        if outcome["keyChecks"]:
            entry["keyChecks"] = outcome["keyChecks"]
        if outcome["generationCheck"] is not None:
            entry["generationCheck"] = outcome["generationCheck"]
        provider_entries.append(entry)

        if outcome["discovery"] is not None:
            discovery_entries.append({"provider": provider_id, **outcome["discovery"]})

    primary_status = statuses.get(providers.APPROVED_PRIMARY, probes.TOOL_MISSING)
    recommended = providers.APPROVED_PRIMARY
    recommendation_reason = (
        "Approved Alpha voice with reviewed cached clips. Learner playback uses those files, not a live call."
    )
    if primary_status not in _HEALTHY_STATUSES:
        recommended = "none-available"
        recommendation_reason = (
            "The approved primary generator is not usable right now. Existing cached clips still play; "
            "new clips must wait for Codex, and no fallback voice may be substituted silently."
        )
        for candidate in providers.fallback_order(merged):
            if statuses.get(candidate) == probes.AVAILABLE:
                recommended = candidate
                recommendation_reason = (
                    "Proposed comparison lane while the primary is unavailable. Any clip it produces is stored "
                    "under a separate file name and needs a listening review before use."
                )
                break

    if any(problem.severity == "error" for problem in all_problems):
        overall = "configuration-error"
    elif primary_status not in _HEALTHY_STATUSES:
        overall = "failed"
    elif any(entry["status"] not in _BENIGN_STATUSES for entry in provider_entries):
        overall = "degraded"
    elif any(problem.severity == "warning" for problem in all_problems):
        overall = "degraded"
    else:
        overall = "ok"

    return {
        "schemaVersion": 1,
        "report": "tts-provider-smoke",
        "checkedAt": options.timestamp or _now_iso(),
        "mode": {
            "offline": bool(options.offline),
            "generationChecksAllowed": bool(options.allow_generation),
            "generationCharacterCeiling": options.generation_ceiling,
            "networkTimeoutSeconds": options.timeout,
        },
        "policy": {
            "approvedPrimary": providers.APPROVED_PRIMARY,
            "configuredPrimary": merged.get("GERMAN_TTS_PRIMARY") or providers.APPROVED_PRIMARY,
            "fallbackOrder": providers.fallback_order(merged),
            "paidGenerationCallsMade": False,
            "learnerPlayback": "pre-generated cached files served as static assets",
            "credentialsInBrowser": False,
            "publisherAudioTouched": False,
            "rotation": providers.ROTATION_POLICY,
            "productionStrategy": (
                "For this three-user Alpha, every learner clip is generated once, reviewed, cached on disk and "
                "served as a static file. No provider key is ever used at learner run time."
            ),
        },
        "configuration": {
            "files": [env_file.summary() for env_file in merged.files],
            "variablesLeftBlank": sorted(merged.blank_variables),
            "problems": [problem.to_dict() for problem in all_problems],
        },
        "primary": {"provider": providers.APPROVED_PRIMARY, "status": primary_status},
        "recommendedProvider": {"provider": recommended, "reason": recommendation_reason},
        "overall": overall,
        "providers": provider_entries,
        "openrouterModelDiscovery": discovery_entries,
        "approvedAudio": inspect_approved_audio(),
        "cacheKeyDesign": providers.cache_key_design(),
    }


def render_console(report: dict[str, Any]) -> str:
    """A plain-language summary. No value-shaped string can appear here."""
    lines: list[str] = []
    mode = report["mode"]
    lines.append("German Learning OS - speech provider check")
    lines.append(
        f"Checked at {report['checkedAt']} "
        f"(network: {'off' if mode['offline'] else 'on'}, "
        f"sample generation: {'on' if mode['generationChecksAllowed'] else 'off'})"
    )
    files = ", ".join(
        f"{entry['file']} ({'found' if entry['found'] else 'not found'})" for entry in report["configuration"]["files"]
    )
    lines.append(f"Settings read from: {files}")
    lines.append("")

    for entry in report["providers"]:
        lines.append(f"{entry['provider']:<12} {str(entry['role']):<11} {entry['status']:<16} {entry['summary']}")
    lines.append("")

    problems = report["configuration"]["problems"]
    for problem in [entry for entry in problems if entry["severity"] in {"error", "warning"}]:
        lines.append(f"{problem['severity'].upper()} [{problem['code']}] {problem['location']}: {problem['message']}")
    ignored = [entry for entry in problems if entry["severity"] == "info"]
    if ignored:
        files = sorted({entry["location"].split(":")[0] for entry in ignored})
        lines.append(
            f"NOTE {len(ignored)} line(s) in {', '.join(files)} were not settings and were ignored. "
            "Nothing in this project depends on them."
        )
    if problems:
        lines.append("")

    audio = report["approvedAudio"]
    lines.append(
        f"Approved cached clips on disk: {audio['clipsOnDisk']} "
        f"(reproduced by the cache key: {audio.get('fileNamesReproducedByCacheKey', 'not checked')})"
    )
    lines.append(
        f"Use for new audio: {report['recommendedProvider']['provider']} - {report['recommendedProvider']['reason']}"
    )
    lines.append(f"Secret exposure check: {report.get('secretExposureCheck', {}).get('status', 'not run')}")
    lines.append(f"Overall result: {report['overall']}")
    return "\n".join(lines)


def _render_console(outcome: SmokeOutcome) -> str:
    return outcome.console_text or render_console(outcome.report)


def _find_exposure(text: str, location: str, merged: env_merge.MergedEnvironment) -> list[str]:
    findings = [finding.describe() for finding in redaction.scan_text_for_secrets(text, location)]
    findings.extend(
        f"{location} repeats the value of {name}"
        for name in redaction.find_known_values(text, merged.credential_values())
    )
    return findings


def _refusal_report(report: dict[str, Any], exposure: list[str]) -> dict[str, Any]:
    """Replace the report with an honest refusal, so no misleading artifact survives."""
    return {
        "schemaVersion": 1,
        "report": "tts-provider-smoke",
        "checkedAt": report.get("checkedAt"),
        "overall": "secret-exposure-detected",
        "providers": [],
        "secretExposureCheck": {
            "status": "failed",
            "findingCount": len(exposure),
            "findings": exposure,
        },
        "explanation": (
            "The check found something credential-shaped in its own output and refused to publish the result. "
            "No provider status is reported here on purpose. Fix the cause and run the check again."
        ),
    }


def build_report(
    *,
    report_path: Path = DEFAULT_REPORT_PATH,
    offline: bool = False,
    allow_generation_check: bool = False,
    generation_text: str = DEFAULT_GENERATION_TEXT,
    generation_ceiling: int = DEFAULT_GENERATION_CEILING,
    timeout_seconds: float = probes.DEFAULT_TIMEOUT_SECONDS,
    strict: bool = False,
    timestamp: str | None = None,
    secrets_dir: Path | None = None,
) -> SmokeOutcome:
    """Run the whole check and return a publishable outcome.

    The report is scanned for credential-shaped content before it is returned. If
    anything is found, the outcome carries a refusal note instead of the report.
    """
    options = CheckOptions(
        offline=offline,
        allow_generation=allow_generation_check,
        generation_text=generation_text,
        generation_ceiling=generation_ceiling,
        timeout=timeout_seconds,
        timestamp=timestamp,
        secrets_dir=secrets_dir,
        strict=strict,
    )

    merged = (
        env_merge.merge_environment()
        if secrets_dir is None
        else env_merge.merge_environment(secrets_dir=secrets_dir)
    )
    report = assemble_report(merged, options)
    console_text = render_console(report)

    exposure = _find_exposure(
        json.dumps(report, ensure_ascii=False, indent=2), "report", merged
    ) + _find_exposure(console_text, "console", merged)
    if exposure:
        refusal = _refusal_report(report, exposure)
        return SmokeOutcome(
            exit_code=EXIT_SECRET_EXPOSURE,
            report=refusal,
            report_path=report_path,
            console_text=(
                "Refusing to publish the report: the output contains something that looks like a credential.\n"
                + "\n".join(f"  - {finding}" for finding in exposure)
            ),
            exposure=exposure,
        )

    report["secretExposureCheck"] = {
        "status": "passed",
        "patternsChecked": len(redaction.SECRET_PATTERNS),
        "findings": [],
    }
    console_text = render_console(report)

    if report["overall"] == "configuration-error":
        exit_code = EXIT_BAD_CONFIGURATION
    elif strict and report["overall"] != "ok":
        exit_code = EXIT_STRICT_NOT_HEALTHY
    else:
        exit_code = EXIT_OK
    return SmokeOutcome(exit_code=exit_code, report=report, report_path=report_path, console_text=console_text)


def write_report(outcome: SmokeOutcome) -> None:
    """Write the outcome to disk, replacing any earlier result at that path."""
    outcome.report_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(outcome.report, ensure_ascii=False, indent=2) + "\n"
    outcome.report_path.write_text(payload, encoding="utf-8")


def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m tools.tts.smoke",
        description="Report which German speech providers are usable, without exposing any key.",
    )
    parser.add_argument("--offline", action="store_true", help="Do not contact any provider; check local setup only.")
    parser.add_argument("--strict", action="store_true", help="Exit with code 1 when the result is not fully healthy.")
    parser.add_argument(
        "--report",
        "--report-path",
        dest="report",
        type=Path,
        default=DEFAULT_REPORT_PATH,
        help="Where to write the redacted JSON report (default: research/tts-provider-smoke.json).",
    )
    parser.add_argument("--no-report", action="store_true", help="Print the summary without writing a report file.")
    parser.add_argument(
        "--allow-generation",
        "--allow-generation-check",
        dest="allow_generation",
        action="store_true",
        help="Also generate one very short free local sample to prove real audio comes back.",
    )
    parser.add_argument(
        "--generation-text",
        default=DEFAULT_GENERATION_TEXT,
        help=f"Sample text for --allow-generation (default: {DEFAULT_GENERATION_TEXT!r}).",
    )
    parser.add_argument(
        "--max-generation-chars",
        "--generation-character-ceiling",
        dest="max_generation_chars",
        type=int,
        default=DEFAULT_GENERATION_CEILING,
        help=f"Character ceiling for the sample (default: {DEFAULT_GENERATION_CEILING}).",
    )
    parser.add_argument(
        "--timeout",
        "--timeout-seconds",
        dest="timeout",
        type=float,
        default=probes.DEFAULT_TIMEOUT_SECONDS,
        help="Network timeout in seconds.",
    )
    parser.add_argument("--secrets-dir", type=Path, default=None, help="Override the secrets folder (testing only).")
    parser.add_argument("--timestamp", default=None, help="Fixed timestamp for reproducible runs (testing only).")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_arguments(argv)

    if args.max_generation_chars < 1 or args.max_generation_chars > 200:
        print("Configuration error: the generation character ceiling must be between 1 and 200.", file=sys.stderr)
        return EXIT_BAD_CONFIGURATION

    outcome = build_report(
        report_path=args.report,
        offline=bool(args.offline),
        allow_generation_check=bool(args.allow_generation),
        generation_text=str(args.generation_text),
        generation_ceiling=int(args.max_generation_chars),
        timeout_seconds=float(args.timeout),
        strict=bool(args.strict),
        timestamp=args.timestamp,
        secrets_dir=args.secrets_dir,
    )

    stream = sys.stderr if outcome.exit_code == EXIT_SECRET_EXPOSURE else sys.stdout
    print(outcome.console_text, file=stream)

    if not args.no_report:
        write_report(outcome)
        try:
            shown = outcome.report_path.relative_to(REPO_ROOT)
        except ValueError:
            shown = outcome.report_path
        print(f"Report written: {shown}", file=stream)

    if outcome.exit_code == EXIT_BAD_CONFIGURATION:
        print("Configuration error: fix the problems listed above before relying on this result.", file=sys.stderr)
    return outcome.exit_code


if __name__ == "__main__":
    sys.exit(main())
