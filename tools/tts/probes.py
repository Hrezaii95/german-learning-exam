"""Harmless availability checks for each provider.

What these checks do:

* ask whether the local ``edge-tts`` package and the approved German voice exist;
* ask a provider whether a supplied key is accepted, using an account or catalogue
  endpoint that does not produce audio and does not spend credit;
* read only a short list of named fields from a response.

What these checks never do:

* print or store a response body;
* print or store a credential, or the provider's own partially masked key label;
* generate speech, unless the operator passes the explicit generation flag, and
  then only through the free local ``edge-tts`` path within a character ceiling.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import shutil
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any

DEFAULT_TIMEOUT_SECONDS = 12.0
USER_AGENT = "german-learning-os-tts-smoke/1.0 (local operations check)"

# Provider status vocabulary used in the report and on the console.
AVAILABLE = "available"
NOT_CONFIGURED = "not_configured"
UNAUTHORIZED = "unauthorized"
QUOTA_LIMITED = "quota_limited"
ENDPOINT_UNKNOWN = "endpoint_unknown"
NETWORK_UNREACHABLE = "network_unreachable"
PROVIDER_ERROR = "provider_error"
UNEXPECTED_RESPONSE = "unexpected_response"
SKIPPED_OFFLINE = "skipped_offline"
TOOL_MISSING = "tool_missing"

# Error categories, kept coarse on purpose so a report never carries detail.
CATEGORY_NONE = "none"
CATEGORY_MISSING_CREDENTIAL = "missing_credential"
CATEGORY_CREDENTIAL_REJECTED = "credential_rejected"
CATEGORY_QUOTA = "quota_or_rate_limit"
CATEGORY_ENDPOINT_NOT_CONFIGURED = "endpoint_not_configured"
CATEGORY_NETWORK = "network"
CATEGORY_UNEXPECTED_RESPONSE = "unexpected_response"
CATEGORY_TOOL_MISSING = "tool_missing"
CATEGORY_POLICY_BLOCKED = "policy_blocked"
CATEGORY_SKIPPED = "skipped"


@dataclass
class ProbeResult:
    """The outcome of one check, already safe to publish."""

    status: str
    endpoint: str
    error_category: str = CATEGORY_NONE
    http_status_class: str = ""
    summary: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "checkedEndpoint": self.endpoint,
            "httpStatusClass": self.http_status_class,
            "errorCategory": self.error_category,
            "summary": self.summary,
            "metadata": self.metadata,
        }


def _status_class(code: int) -> str:
    return f"{code // 100}xx"


def _get_json(
    url: str,
    headers: dict[str, str] | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> tuple[int | None, Any, str | None]:
    """Perform a GET and return (status code, parsed payload, transport error kind).

    The raw body is parsed here and never returned to the caller as text, so a
    response cannot be echoed by accident.
    """
    request = urllib.request.Request(url, method="GET")
    request.add_header("User-Agent", USER_AGENT)
    request.add_header("Accept", "application/json")
    for name, value in (headers or {}).items():
        request.add_header(name, value)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - fixed https hosts
            raw = response.read(1_000_000)
            try:
                return response.status, json.loads(raw.decode("utf-8", errors="replace")), None
            except json.JSONDecodeError:
                return response.status, None, "non-json-response"
    except urllib.error.HTTPError as error:
        return error.code, None, None
    except urllib.error.URLError:
        return None, None, "network-unreachable"
    except TimeoutError:
        return None, None, "timeout"
    except OSError:
        return None, None, "network-unreachable"


def _http_failure(code: int | None, transport_error: str | None, endpoint: str) -> ProbeResult | None:
    """Translate a non-success transport result into a safe ProbeResult."""
    if transport_error in {"network-unreachable", "timeout"}:
        return ProbeResult(
            status=NETWORK_UNREACHABLE,
            endpoint=endpoint,
            error_category=CATEGORY_NETWORK,
            summary="The provider could not be reached. Check the internet connection and try again.",
        )
    if code is None:
        return ProbeResult(
            status=NETWORK_UNREACHABLE,
            endpoint=endpoint,
            error_category=CATEGORY_NETWORK,
            summary="No response was received from the provider.",
        )
    if code in {401, 403}:
        return ProbeResult(
            status=UNAUTHORIZED,
            endpoint=endpoint,
            http_status_class=_status_class(code),
            error_category=CATEGORY_CREDENTIAL_REJECTED,
            summary="The provider rejected the supplied key. Replace it with a current key.",
        )
    if code in {402, 429}:
        return ProbeResult(
            status=QUOTA_LIMITED,
            endpoint=endpoint,
            http_status_class=_status_class(code),
            error_category=CATEGORY_QUOTA,
            summary="The key is recognised but out of credit or temporarily rate limited.",
        )
    if code >= 500:
        return ProbeResult(
            status=PROVIDER_ERROR,
            endpoint=endpoint,
            http_status_class=_status_class(code),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The provider reported a server-side problem. Retry later.",
        )
    if code >= 300:
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            http_status_class=_status_class(code),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The provider answered with an unexpected status for a read-only check.",
        )
    if transport_error == "non-json-response":
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            http_status_class=_status_class(code),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The endpoint did not return the expected structured answer.",
        )
    return None


# --------------------------------------------------------------------------- #
# edge-tts (primary, local, no credential)
# --------------------------------------------------------------------------- #


def probe_edge_tts(approved_voice: str, offline: bool = False, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> ProbeResult:
    """Confirm the primary generator is installed and offers the approved voice."""
    endpoint = "local: python package edge_tts"
    spec = importlib.util.find_spec("edge_tts")
    if spec is None:
        return ProbeResult(
            status=TOOL_MISSING,
            endpoint=endpoint,
            error_category=CATEGORY_TOOL_MISSING,
            summary="The edge-tts package is not installed for this Python interpreter.",
        )

    import edge_tts  # noqa: PLC0415 - imported only after the package is known to exist

    metadata: dict[str, Any] = {
        "packageVersion": getattr(edge_tts, "__version__", "unknown"),
        "commandLineToolFound": shutil.which("edge-tts") is not None,
        "approvedVoice": approved_voice,
    }

    if offline:
        metadata["voiceCatalogueChecked"] = False
        return ProbeResult(
            status=AVAILABLE,
            endpoint=endpoint,
            summary="Package present. The online voice list was skipped because the check ran offline.",
            metadata=metadata,
        )

    try:
        voices = asyncio.run(asyncio.wait_for(edge_tts.list_voices(), timeout=timeout))
        names = {str(voice.get("ShortName", "")) for voice in voices}
        metadata["voiceCatalogueChecked"] = True
        metadata["germanVoiceCount"] = len([name for name in names if name.startswith("de-DE-")])
        metadata["approvedVoiceAvailable"] = approved_voice in names
        if not metadata["approvedVoiceAvailable"]:
            return ProbeResult(
                status=UNEXPECTED_RESPONSE,
                endpoint="public Microsoft voice catalogue",
                error_category=CATEGORY_UNEXPECTED_RESPONSE,
                summary=f"The approved voice {approved_voice} was not offered by the voice list.",
                metadata=metadata,
            )
        return ProbeResult(
            status=AVAILABLE,
            endpoint=endpoint,
            summary="Package present and the approved German voice is offered.",
            metadata=metadata,
        )
    except (TimeoutError, asyncio.TimeoutError):
        metadata["voiceCatalogueChecked"] = False
        return ProbeResult(
            status=NETWORK_UNREACHABLE,
            endpoint=endpoint,
            error_category=CATEGORY_NETWORK,
            summary="Package present, but the online voice list timed out. Cached clips are unaffected.",
            metadata=metadata,
        )
    except Exception:  # noqa: BLE001 - any client failure is reported without detail
        metadata["voiceCatalogueChecked"] = False
        return ProbeResult(
            status=NETWORK_UNREACHABLE,
            endpoint=endpoint,
            error_category=CATEGORY_NETWORK,
            summary="Package present, but the online voice list could not be read. Cached clips are unaffected.",
            metadata=metadata,
        )


def edge_tts_generation_check(text: str, character_ceiling: int, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> ProbeResult:
    """Synthesize a very short sample with the free local generator, into a temporary file.

    This runs only when the operator passes the explicit generation flag. Nothing
    is written into the media folders and the sample is deleted immediately.
    """
    endpoint = "local: edge_tts synthesis of a short sample"
    if len(text) > character_ceiling:
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            error_category=CATEGORY_POLICY_BLOCKED,
            summary=(
                f"The sample text is {len(text)} characters, above the ceiling of {character_ceiling}. "
                "Shorten the text or raise the ceiling deliberately."
            ),
        )

    if importlib.util.find_spec("edge_tts") is None:
        return ProbeResult(
            status=TOOL_MISSING,
            endpoint=endpoint,
            error_category=CATEGORY_TOOL_MISSING,
            summary="The edge-tts package is not installed for this Python interpreter.",
        )

    import tempfile  # noqa: PLC0415
    from pathlib import Path  # noqa: PLC0415

    import edge_tts  # noqa: PLC0415

    from . import providers  # noqa: PLC0415

    temporary = Path(tempfile.gettempdir()) / "german-learning-tts-generation-check.mp3"
    try:
        communicate = edge_tts.Communicate(
            text=text,
            voice=providers.BASELINE_PROFILE["voice"],
            rate=providers.BASELINE_PROFILE["rate"],
        )
        asyncio.run(asyncio.wait_for(communicate.save(str(temporary)), timeout=timeout))
        data = temporary.read_bytes()
    except Exception:  # noqa: BLE001
        return ProbeResult(
            status=PROVIDER_ERROR,
            endpoint=endpoint,
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The short sample could not be generated. Existing approved clips are unaffected.",
        )
    finally:
        temporary.unlink(missing_ok=True)

    looks_like_audio = data.startswith(b"ID3") or (len(data) > 2 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0)
    if not looks_like_audio or len(data) < 512:
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The generator returned something that is not recognisable audio.",
            metadata={"bytesReturned": len(data)},
        )
    return ProbeResult(
        status=AVAILABLE,
        endpoint=endpoint,
        summary="A short sample was generated, verified as audio and deleted.",
        metadata={"characterCount": len(text), "characterCeiling": character_ceiling, "bytesReturned": len(data)},
    )


# --------------------------------------------------------------------------- #
# OpenRouter
# --------------------------------------------------------------------------- #


def probe_openrouter_key(api_key: str, base_url: str, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> ProbeResult:
    """Ask OpenRouter whether one key is usable. No model is called and no credit is spent."""
    endpoint = f"{base_url}/key"
    code, payload, transport_error = _get_json(
        endpoint, headers={"Authorization": f"Bearer {api_key}"}, timeout=timeout
    )
    failure = _http_failure(code, transport_error, endpoint)
    if failure is not None:
        return failure

    data = (payload or {}).get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            http_status_class=_status_class(code or 0),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The key endpoint answered without the expected account block.",
        )

    # Only these fields are copied. The provider's own "label" field contains a
    # partially masked key and is deliberately dropped, as is any account id.
    metadata = {
        "isFreeTier": bool(data.get("is_free_tier")),
        "isManagementKey": bool(data.get("is_management_key")),
        "isProvisioningKey": bool(data.get("is_provisioning_key")),
        "spendLimitSet": data.get("limit") is not None,
        "spendLimitRemaining": data.get("limit_remaining"),
        "limitResetPeriod": data.get("limit_reset"),
        "usageAllTime": data.get("usage"),
        "usageToday": data.get("usage_daily"),
    }
    if metadata["isManagementKey"] or metadata["isProvisioningKey"]:
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            http_status_class=_status_class(code or 0),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="This key manages the account rather than calling models, so it cannot produce speech.",
            metadata=metadata,
        )
    return ProbeResult(
        status=AVAILABLE,
        endpoint=endpoint,
        http_status_class=_status_class(code or 0),
        summary="The key was accepted by the account endpoint.",
        metadata=metadata,
    )


def _pricing_is_free(model: dict[str, Any]) -> bool:
    pricing = model.get("pricing")
    if not isinstance(pricing, dict) or not pricing:
        return False
    for value in pricing.values():
        try:
            if float(value) != 0.0:
                return False
        except (TypeError, ValueError):
            return False
    return True


def discover_openrouter_speech_models(
    base_url: str,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    sample_size: int = 12,
) -> ProbeResult:
    """List which OpenRouter models can actually return audio, and which of those are free.

    Model names are public catalogue information, so they are safe to record.
    A free text model is counted separately because it cannot produce speech.
    """
    endpoint = f"{base_url}/models"
    code, payload, transport_error = _get_json(endpoint, timeout=timeout)
    failure = _http_failure(code, transport_error, endpoint)
    if failure is not None:
        failure.endpoint = endpoint
        return failure

    models = (payload or {}).get("data") if isinstance(payload, dict) else None
    if not isinstance(models, list):
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            http_status_class=_status_class(code or 0),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The model catalogue answered in an unexpected shape.",
        )

    speech_models: list[str] = []
    free_speech_models: list[str] = []
    free_text_models: list[str] = []
    for model in models:
        if not isinstance(model, dict):
            continue
        model_id = str(model.get("id", ""))
        architecture = model.get("architecture") if isinstance(model.get("architecture"), dict) else {}
        outputs = architecture.get("output_modalities") or []
        produces_audio = "audio" in [str(item).lower() for item in outputs]
        free = model_id.endswith(":free") or _pricing_is_free(model)
        if produces_audio:
            speech_models.append(model_id)
            if free:
                free_speech_models.append(model_id)
        elif free:
            free_text_models.append(model_id)

    metadata = {
        "catalogueSize": len(models),
        "audioOutputModelCount": len(speech_models),
        "freeAudioOutputModelCount": len(free_speech_models),
        "freeAudioOutputModels": sorted(free_speech_models)[:sample_size],
        "audioOutputModelSample": sorted(speech_models)[:sample_size],
        "freeTextOnlyModelCount": len(free_text_models),
        "freeTextOnlyModelsCannotProduceSpeech": True,
        "audioOutputIsNotProofOfGermanSpeech": (
            "This list only says a model can return audio. Some of them generate music or general sound rather "
            "than read German text aloud. Whether a model is usable for A1 German pronunciation is a separate "
            "listening judgement that belongs to Codex."
        ),
    }
    summary = (
        f"{len(speech_models)} models can return audio, {len(free_speech_models)} of them free, but audio output "
        f"alone does not mean a model reads German aloud well. {len(free_text_models)} free models are text only "
        "and cannot be used for pronunciation at all."
    )
    return ProbeResult(
        status=AVAILABLE,
        endpoint=endpoint,
        http_status_class=_status_class(code or 0),
        summary=summary,
        metadata=metadata,
    )


# --------------------------------------------------------------------------- #
# Cartesia
# --------------------------------------------------------------------------- #


def probe_cartesia(
    api_key: str,
    base_url: str,
    api_version: str,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> ProbeResult:
    """Ask Cartesia for a single voice entry. Listing voices produces no audio and no charge."""
    endpoint = f"{base_url}/voices?limit=1"
    code, payload, transport_error = _get_json(
        endpoint,
        headers={"Authorization": f"Bearer {api_key}", "Cartesia-Version": api_version},
        timeout=timeout,
    )
    failure = _http_failure(code, transport_error, endpoint)
    if failure is not None:
        return failure

    entries = (payload or {}).get("data") if isinstance(payload, dict) else None
    if not isinstance(entries, list):
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint=endpoint,
            http_status_class=_status_class(code or 0),
            error_category=CATEGORY_UNEXPECTED_RESPONSE,
            summary="The voice listing answered in an unexpected shape.",
        )
    return ProbeResult(
        status=AVAILABLE,
        endpoint=endpoint,
        http_status_class=_status_class(code or 0),
        summary="The key was accepted by the voice listing endpoint.",
        metadata={"apiVersion": api_version, "voiceEntriesReturned": len(entries)},
    )


# --------------------------------------------------------------------------- #
# TTSForFree
# --------------------------------------------------------------------------- #


def probe_ttsforfree(api_key: str, base_url: str | None, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> ProbeResult:
    """Validate a TTSForFree key through its documented read-only language list."""
    approved_base = "https://api.ttsforfree.com"
    requested_base = (base_url or approved_base).rstrip("/")
    if requested_base != approved_base:
        return ProbeResult(
            status=UNEXPECTED_RESPONSE,
            endpoint="blocked unapproved TTSForFree host",
            error_category=CATEGORY_POLICY_BLOCKED,
            summary="TTSFORFREE_API_BASE did not exactly match the approved provider host; the key was not sent.",
        )
    endpoint = f"{approved_base}/api/Common/GetListLanguage"
    code, _payload, transport_error = _get_json(
        endpoint, headers={"X-API-Key": api_key}, timeout=timeout
    )
    failure = _http_failure(code, transport_error, endpoint)
    if failure is not None:
        return failure
    return ProbeResult(
        status=AVAILABLE,
        endpoint=endpoint,
        http_status_class=_status_class(code or 0),
        summary="The documented language-list endpoint accepted the key.",
    )
