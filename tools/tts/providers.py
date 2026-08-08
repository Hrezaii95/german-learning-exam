"""Provider registry, credential resolution and the clip cache key.

`edge-tts` is the approved primary voice for Alpha (ADR-005). The other three
providers exist only to compare quality or to cover a temporary outage. Provider
rotation is a resilience measure; it must never be used to work around a quota,
an account limit or a provider's terms.

The clip cache key is the safeguard that lets a fallback exist at all: a clip is
addressed by normalized text plus locale, voice, provider, model version and
speaking controls, so audio produced by a different provider always lands on a
different file name and can never silently replace an approved clip.
"""

from __future__ import annotations

import hashlib
import json
import unicodedata
from dataclasses import asdict, dataclass, field

from . import env_merge, redaction

REGISTRY_SCHEMA_VERSION = 1
APPROVED_PRIMARY = "edge-tts"

# The approved Alpha generation profile. The 327 existing clips were produced
# with exactly these settings and must not be regenerated.
BASELINE_PROFILE: dict[str, str] = {
    "provider": "edge-tts",
    "locale": "de-DE",
    "voice": "de-DE-KatjaNeural",
    "model": "edge-tts/de-DE-neural/v1",
    "rate": "+4%",
    "pitch": "+0Hz",
    "volume": "+0%",
    "format": "mp3",
}

BASELINE_CLIP_DIRECTORY = "media/generated/tts-de-de-v1"
BASELINE_MANIFEST_PATH = "media/manifests/alpha-tts-manifest.json"

ROTATION_POLICY: dict[str, object] = {
    "purpose": "resilience-only",
    "quotaEvasionForbidden": True,
    "statement": (
        "A second provider may be used when the primary is unavailable or when Codex is comparing "
        "voice quality. Keys must not be cycled to obtain more free capacity than a provider grants "
        "to one account, and each provider's terms apply to its own key."
    ),
    "learnerPlayback": "cached static files only; no provider credential ever reaches the browser",
}

PROVIDERS: tuple[dict[str, object], ...] = (
    {
        "id": "edge-tts",
        "displayName": "edge-tts (Microsoft neural voices through an unofficial client)",
        "role": "primary",
        "enabled": True,
        "requiresCredential": False,
        "credentialVariables": [],
        "optionalVariables": ["GERMAN_TTS_EDGE_VOICE", "GERMAN_TTS_EDGE_RATE"],
        "baseUrl": None,
        "verification": {
            "kind": "local-package",
            "method": "LOCAL",
            "endpoint": "python package edge_tts, then the public de-DE voice catalogue",
            "authStyle": "none",
        },
        "liveGenerationAllowed": True,
        "generationRequiresFlag": True,
        "costClass": "free-unofficial",
        "productionAuthority": False,
        "notes": (
            "Approved Alpha voice. 327 reviewed clips already exist and must not be regenerated. "
            "Production migration target is official Azure Speech with server-side caching."
        ),
    },
    {
        "id": "cartesia",
        "displayName": "Cartesia (paid hosted speech API)",
        "role": "comparison",
        "enabled": True,
        "requiresCredential": True,
        "credentialVariables": ["CARTESIA_API_KEY"],
        "optionalVariables": ["CARTESIA_VOICE_ID", "CARTESIA_API_VERSION"],
        "baseUrl": "https://api.cartesia.ai",
        "verification": {
            "kind": "account-listing",
            "method": "GET",
            "endpoint": "/voices?limit=1",
            "authStyle": "bearer",
            "requiredHeaders": ["Cartesia-Version"],
        },
        "liveGenerationAllowed": False,
        "generationRequiresFlag": True,
        "costClass": "paid",
        "productionAuthority": False,
        "notes": "Comparison lane. Listing voices costs nothing; speech generation is billable and stays off.",
    },
    {
        "id": "openrouter",
        "displayName": "OpenRouter (multi-model gateway, some free speech models)",
        "role": "failover",
        "enabled": True,
        "requiresCredential": True,
        "credentialVariables": ["OPENROUTER_API_KEY"],
        "credentialVariablePrefix": "OPENROUTER_API_KEY_",
        "excludedVariableSubstrings": ["MANAGEMENT", "PROVISIONING"],
        "optionalVariables": ["OPENROUTER_TTS_MODEL", "OPENROUTER_TTS_VOICE"],
        "baseUrl": "https://openrouter.ai/api/v1",
        "verification": {
            "kind": "account-key-status",
            "method": "GET",
            "endpoint": "/key",
            "authStyle": "bearer",
        },
        "discovery": {
            "kind": "model-catalogue",
            "method": "GET",
            "endpoint": "/models",
            "authStyle": "none",
        },
        "liveGenerationAllowed": False,
        "generationRequiresFlag": True,
        "costClass": "mixed-free-and-paid",
        "productionAuthority": False,
        "notes": (
            "Failover lane. The key endpoint reports remaining credit without spending any. "
            "Only models that declare audio output can produce speech; a free text model cannot."
        ),
    },
    {
        "id": "ttsforfree",
        "displayName": "TTSForFree (free-tier speech service)",
        "role": "comparison",
        "enabled": True,
        "requiresCredential": True,
        "credentialVariables": ["TTSFORFREE_API_KEY"],
        "optionalVariables": ["TTSFORFREE_API_BASE"],
        "baseUrl": "https://api.ttsforfree.com",
        "verification": {
            "kind": "account-listing",
            "method": "GET",
            "endpoint": "/api/Common/GetListLanguage",
            "authStyle": "header-key",
            "requiredHeaders": ["X-API-Key"],
            "documented": True,
        },
        "liveGenerationAllowed": False,
        "generationRequiresFlag": True,
        "costClass": "free-tier",
        "productionAuthority": False,
        "notes": (
            "Comparison lane. The published language-list endpoint is read-only; speech generation "
            "remains disabled. A base override is rejected unless it exactly matches the approved host."
        ),
    },
)

PROVIDER_IDS: tuple[str, ...] = tuple(str(provider["id"]) for provider in PROVIDERS)


def registry_document() -> dict[str, object]:
    """The provider registry as a plain document, validated by config/tts-providers.schema.json."""
    return {
        "schemaVersion": REGISTRY_SCHEMA_VERSION,
        "approvedPrimary": APPROVED_PRIMARY,
        "baselineProfile": dict(BASELINE_PROFILE),
        "rotationPolicy": dict(ROTATION_POLICY),
        "providers": [json.loads(json.dumps(provider)) for provider in PROVIDERS],
    }


def provider_by_id(provider_id: str) -> dict[str, object] | None:
    for provider in PROVIDERS:
        if provider["id"] == provider_id:
            return provider
    return None


# --------------------------------------------------------------------------- #
# Clip cache key
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class ClipSpec:
    """Everything that may change how a clip sounds."""

    text: str
    locale: str = BASELINE_PROFILE["locale"]
    voice: str = BASELINE_PROFILE["voice"]
    provider: str = BASELINE_PROFILE["provider"]
    model: str = BASELINE_PROFILE["model"]
    rate: str = BASELINE_PROFILE["rate"]
    pitch: str = BASELINE_PROFILE["pitch"]
    volume: str = BASELINE_PROFILE["volume"]
    format: str = BASELINE_PROFILE["format"]


def normalize_spoken_text(text: str) -> str:
    """Collapse whitespace without changing any German character.

    This matches the normalization used for the existing approved clips, so the
    legacy file name of an approved clip stays reproducible.
    """
    return " ".join(text.strip().split())


def normalize_for_cache(text: str) -> str:
    """Whitespace-collapsed text in Unicode NFC, used for the composite key."""
    return unicodedata.normalize("NFC", normalize_spoken_text(text))


def legacy_clip_id(text: str) -> str:
    """The 16-character identifier used by the 327 approved clips."""
    return hashlib.sha256(normalize_spoken_text(text).encode("utf-8")).hexdigest()[:16]


def legacy_clip_filename(text: str) -> str:
    return f"tts-{legacy_clip_id(text)}.mp3"


def is_baseline_spec(spec: ClipSpec) -> bool:
    """True when the spec is exactly the approved Alpha profile."""
    return all(getattr(spec, key) == value for key, value in BASELINE_PROFILE.items())


def clip_cache_key(spec: ClipSpec) -> dict[str, object]:
    """Return the addressing record for one clip.

    ``cacheKey`` covers normalized text, locale, voice, provider, model version,
    speaking controls and container format. ``fileName`` keeps the approved
    baseline file name for baseline requests and always differs for any other
    provider or setting, so a fallback cannot overwrite an approved clip.
    """
    descriptor = {
        "text": normalize_for_cache(spec.text),
        "locale": spec.locale,
        "voice": spec.voice,
        "provider": spec.provider,
        "model": spec.model,
        "rate": spec.rate,
        "pitch": spec.pitch,
        "volume": spec.volume,
        "format": spec.format,
    }
    canonical = json.dumps(descriptor, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    cache_key = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    baseline = is_baseline_spec(spec)
    file_name = (
        legacy_clip_filename(spec.text)
        if baseline
        else f"tts-{spec.provider}-{cache_key[:16]}.{spec.format}"
    )
    return {
        "descriptor": descriptor,
        "cacheKey": cache_key,
        "fileName": file_name,
        "isApprovedBaseline": baseline,
        "baselineAlias": legacy_clip_filename(spec.text) if baseline else None,
    }


def cache_key_design() -> dict[str, object]:
    """A self-describing summary of the cache design, safe to publish."""
    sample_baseline = clip_cache_key(ClipSpec(text="die Köchin"))
    sample_fallback = clip_cache_key(
        ClipSpec(
            text="die Köchin",
            provider="cartesia",
            voice="cartesia-de-female-sample",
            model="cartesia/sonic/unversioned",
        )
    )
    return {
        "keyedOn": [
            "normalized spoken text (whitespace collapsed, Unicode NFC, German characters untouched)",
            "locale",
            "voice",
            "provider",
            "model or voice version",
            "speaking controls (rate, pitch, volume)",
            "audio container format",
        ],
        "guarantee": (
            "Any change of provider, voice, model version or speaking control produces a different "
            "file name, so a fallback clip is stored beside the approved clip and never replaces it."
        ),
        "approvedBaselineFileNaming": "tts-<first 16 hex of sha256(normalized text)>.mp3 (unchanged from the existing 327 clips)",
        "fallbackFileNaming": "tts-<provider>-<first 16 hex of composite key>.<format>",
        "approvedClipDirectory": BASELINE_CLIP_DIRECTORY,
        "examples": {
            "approvedBaseline": {
                "spec": sample_baseline["descriptor"],
                "fileName": sample_baseline["fileName"],
                "cacheKey": sample_baseline["cacheKey"],
            },
            "comparisonProvider": {
                "spec": sample_fallback["descriptor"],
                "fileName": sample_fallback["fileName"],
                "cacheKey": sample_fallback["cacheKey"],
            },
        },
    }


# --------------------------------------------------------------------------- #
# Credential resolution
# --------------------------------------------------------------------------- #


@dataclass
class CredentialSlot:
    """One credential variable for one provider, described without its value."""

    variable: str
    reported_variable: str
    configured: bool
    fingerprint: str = ""
    source: str = "not-set"
    discovered: bool = False

    def to_dict(self) -> dict[str, object]:
        described: dict[str, object] = {
            "variable": self.reported_variable,
            "configured": self.configured,
            "source": self.source,
            "discovered": self.discovered,
        }
        if self.fingerprint:
            described["fingerprint"] = self.fingerprint
        return described


@dataclass
class ResolvedProvider:
    """A provider record combined with what the environment actually supplies."""

    record: dict[str, object]
    credentials: list[CredentialSlot] = field(default_factory=list)
    optional_settings: dict[str, bool] = field(default_factory=dict)

    @property
    def provider_id(self) -> str:
        return str(self.record["id"])

    @property
    def configured(self) -> bool:
        if not self.record.get("requiresCredential", False):
            return True
        return any(slot.configured for slot in self.credentials)

    def configured_slots(self) -> list[CredentialSlot]:
        return [slot for slot in self.credentials if slot.configured]


def resolve_provider(record: dict[str, object], merged: env_merge.MergedEnvironment) -> ResolvedProvider:
    """Attach credential presence and optional settings to one provider record."""
    slots: list[CredentialSlot] = []

    declared = [str(name) for name in record.get("credentialVariables", [])]  # type: ignore[union-attr]
    for name in declared:
        value = merged.get(name)
        slots.append(
            CredentialSlot(
                variable=name,
                reported_variable=redaction.redact_variable_name(name),
                configured=bool(value),
                fingerprint=redaction.credential_fingerprint(value) if value else "",
                source=merged.source_of(name) if value else "not-set",
            )
        )

    prefix = record.get("credentialVariablePrefix")
    if isinstance(prefix, str):
        excluded = [str(part) for part in record.get("excludedVariableSubstrings", [])]  # type: ignore[union-attr]
        index = 2
        for name in merged.names_with_prefix(prefix):
            if name in declared or any(part in name for part in excluded):
                continue
            value = merged.get(name)
            if not value:
                continue
            slots.append(
                CredentialSlot(
                    variable=name,
                    reported_variable=redaction.redact_variable_name(name, index),
                    configured=True,
                    fingerprint=redaction.credential_fingerprint(value),
                    source=merged.source_of(name),
                    discovered=True,
                )
            )
            index += 1

    optional = {
        str(name): merged.is_configured(str(name))
        for name in record.get("optionalVariables", [])  # type: ignore[union-attr]
    }
    return ResolvedProvider(record=record, credentials=slots, optional_settings=optional)


def resolve_all(merged: env_merge.MergedEnvironment) -> list[ResolvedProvider]:
    return [resolve_provider(record, merged) for record in PROVIDERS]


def validate_configuration(merged: env_merge.MergedEnvironment) -> list[env_merge.Problem]:
    """Fail closed on configuration that would change the approved voice policy."""
    problems: list[env_merge.Problem] = []

    primary = merged.get("GERMAN_TTS_PRIMARY") or APPROVED_PRIMARY
    if primary not in PROVIDER_IDS:
        problems.append(
            env_merge.Problem(
                code="unknown-primary-provider",
                severity="error",
                location="GERMAN_TTS_PRIMARY",
                message=(
                    f"GERMAN_TTS_PRIMARY names '{primary}', which is not a known provider. "
                    f"Known providers: {', '.join(PROVIDER_IDS)}."
                ),
            )
        )
    elif primary != APPROVED_PRIMARY:
        problems.append(
            env_merge.Problem(
                code="primary-not-approved",
                severity="error",
                location="GERMAN_TTS_PRIMARY",
                message=(
                    f"GERMAN_TTS_PRIMARY names '{primary}', but the accepted decision for Alpha is "
                    f"'{APPROVED_PRIMARY}'. Changing the primary voice requires a new decision record."
                ),
            )
        )

    order_raw = merged.get("GERMAN_TTS_FALLBACK_ORDER")
    if order_raw:
        for entry in [part.strip() for part in order_raw.split(",")]:
            if not entry:
                continue
            if entry not in PROVIDER_IDS:
                problems.append(
                    env_merge.Problem(
                        code="unknown-fallback-provider",
                        severity="error",
                        location="GERMAN_TTS_FALLBACK_ORDER",
                        message=(
                            f"GERMAN_TTS_FALLBACK_ORDER lists '{entry}', which is not a known provider. "
                            f"Known providers: {', '.join(PROVIDER_IDS)}."
                        ),
                    )
                )

    voice = merged.get("GERMAN_TTS_EDGE_VOICE")
    if voice and voice != BASELINE_PROFILE["voice"]:
        problems.append(
            env_merge.Problem(
                code="baseline-voice-overridden",
                severity="warning",
                location="GERMAN_TTS_EDGE_VOICE",
                message=(
                    f"GERMAN_TTS_EDGE_VOICE is '{voice}' while the approved Alpha voice is "
                    f"'{BASELINE_PROFILE['voice']}'. New audio would be stored under a new file name "
                    "and would need a fresh listening review."
                ),
            )
        )

    rate = merged.get("GERMAN_TTS_EDGE_RATE")
    if rate and rate != BASELINE_PROFILE["rate"]:
        problems.append(
            env_merge.Problem(
                code="baseline-rate-overridden",
                severity="warning",
                location="GERMAN_TTS_EDGE_RATE",
                message=(
                    f"GERMAN_TTS_EDGE_RATE is '{rate}' while the approved Alpha rate is "
                    f"'{BASELINE_PROFILE['rate']}'."
                ),
            )
        )
    return problems


def fallback_order(merged: env_merge.MergedEnvironment) -> list[str]:
    """The configured comparison/failover order, restricted to known providers."""
    order_raw = merged.get("GERMAN_TTS_FALLBACK_ORDER")
    if not order_raw:
        return [pid for pid in PROVIDER_IDS if pid != APPROVED_PRIMARY]
    order = [part.strip() for part in order_raw.split(",") if part.strip()]
    return [entry for entry in order if entry in PROVIDER_IDS and entry != APPROVED_PRIMARY]


def clip_spec_to_dict(spec: ClipSpec) -> dict[str, str]:
    return asdict(spec)
