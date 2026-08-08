"""Secret detection and redaction helpers.

Rules enforced here:

* a credential value is never returned, printed or written to a report;
* a credential may only be described by variable name, configured yes/no and a
  non-reversible fingerprint;
* variable names that embed a personal account address are masked before they
  reach a report or the console.
"""

from __future__ import annotations

import hashlib
import hmac
import re
from dataclasses import dataclass

REDACTED = "[redacted]"

# Stable local salt. It only makes the fingerprint useless outside this repo;
# it is not a secret and provides no access to anything.
_FINGERPRINT_SALT = b"german-learning-os/tts-fingerprint/v1"

# Shapes of well-known credentials. These are used to prove that no new file and
# no console line contains something that looks like a live key.
SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("openrouter-key", re.compile(r"sk-or-v1-[A-Za-z0-9]{16,}")),
    ("cartesia-key", re.compile(r"sk_car_[A-Za-z0-9_\-]{16,}")),
    ("anthropic-key", re.compile(r"sk-ant-[A-Za-z0-9_\-]{16,}")),
    ("openai-style-key", re.compile(r"\bsk-(?!or-v1-|ant-)[A-Za-z0-9]{24,}\b")),
    ("google-api-key", re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}\b")),
    ("github-token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b")),
    ("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9\-]{10,}\b")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")),
    ("inline-bearer", re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/\-]{20,}")),
    (
        "assigned-credential",
        re.compile(r"(?m)^[ \t]*(?:export[ \t]+)?[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[ \t]*=[ \t]*\S{12,}[ \t]*$"),
    ),
)

# Variable names such as OPENROUTER_API_KEY_SOMEONE_GMAIL_COM identify a person,
# so the personal part is replaced before the name is reported.
_PERSONAL_ACCOUNT_TAIL = re.compile(
    r"^(?P<base>[A-Z0-9_]+?(?:API_KEY|KEY|TOKEN|SECRET))"
    r"_(?P<tail>[A-Z0-9_]{3,}_(?:GMAIL|GOOGLEMAIL|OUTLOOK|HOTMAIL|YAHOO|PROTON|PROTONMAIL|ICLOUD)_COM)$"
)

_CREDENTIAL_NAME = re.compile(r"(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)")


@dataclass(frozen=True)
class SecretFinding:
    """A credential-shaped string found in text that must stay credential free."""

    pattern: str
    location: str
    line: int

    def describe(self) -> str:
        return f"{self.location}:{self.line} matches credential shape '{self.pattern}'"


def redact_variable_name(name: str, index: int | None = None) -> str:
    """Return a variable name that is safe to print.

    Names that embed a personal account address become e.g.
    ``OPENROUTER_API_KEY_<account-2>``.
    """
    match = _PERSONAL_ACCOUNT_TAIL.match(name)
    if not match:
        return name
    label = f"account-{index}" if index is not None else "account"
    return f"{match.group('base')}_<{label}>"


def is_credential_name(name: str) -> bool:
    """True when a variable name looks like it holds a credential."""
    return bool(_CREDENTIAL_NAME.search(name))


def credential_fingerprint(value: str) -> str:
    """Return a short non-reversible fingerprint of a credential.

    The fingerprint lets an operator confirm that the key being read is the key
    they pasted, without the value appearing anywhere.
    """
    if not value:
        return ""
    digest = hmac.new(_FINGERPRINT_SALT, value.encode("utf-8"), hashlib.sha256)
    return f"fp:{digest.hexdigest()[:12]}"


def describe_credential(name: str, value: str | None, index: int | None = None) -> dict[str, object]:
    """Describe a credential without exposing it."""
    configured = bool(value and value.strip())
    described: dict[str, object] = {
        "variable": redact_variable_name(name, index),
        "configured": configured,
    }
    if configured:
        described["fingerprint"] = credential_fingerprint(value.strip())  # type: ignore[union-attr]
    return described


def scan_text_for_secrets(text: str, location: str) -> list[SecretFinding]:
    """Find credential-shaped strings in text. The match itself is never kept."""
    findings: list[SecretFinding] = []
    for pattern_name, pattern in SECRET_PATTERNS:
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            findings.append(SecretFinding(pattern=pattern_name, location=location, line=line))
    return findings


def find_known_values(text: str, values: dict[str, str], minimum_length: int = 8) -> list[str]:
    """Return the variable names whose configured value appears verbatim in text.

    Only names are returned so that a failure message stays safe to print.
    """
    exposed: list[str] = []
    for name, value in values.items():
        candidate = (value or "").strip()
        if len(candidate) < minimum_length:
            continue
        if candidate in text:
            exposed.append(redact_variable_name(name))
    return sorted(set(exposed))
