"""Read and merge the two approved secret files.

Approved sources, in this order of specificity:

1. ``.secrets.env``              - shared machine-wide values (read only, never written)
2. ``german-learning-tts.env``   - project values owned by the user (read only, never written)

Merge rules:

* a value already present in the running process environment always wins;
* the project file overrides the shared file, but only with a non-blank value;
* a blank entry means "not supplied yet" and never blanks out a working value;
* a line we cannot read is reported by line number, never by content. In the
  project file that is an error, because that file is this project's
  configuration. In the shared file it is only a note, because that file belongs
  to the whole machine and we read a handful of named settings out of it.

The default file locations may be redirected with ``GERMAN_TTS_SECRETS_DIR``.
That override exists for automated tests; normal operation uses the approved
absolute paths.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field, replace
from pathlib import Path

from . import redaction

DEFAULT_SECRETS_DIR = Path(r"E:\claude-cursor\central-home\secrets")
SHARED_FILE_NAME = ".secrets.env"
PROJECT_FILE_NAME = "german-learning-tts.env"

_ASSIGNMENT = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$")


@dataclass(frozen=True)
class Problem:
    """A configuration problem that an operator can act on."""

    code: str
    message: str
    severity: str = "error"
    location: str = ""

    def to_dict(self) -> dict[str, str]:
        return {
            "code": self.code,
            "severity": self.severity,
            "location": self.location,
            "message": self.message,
        }


@dataclass
class EnvFile:
    """One parsed secret file."""

    label: str
    path: Path
    exists: bool
    values: dict[str, str] = field(default_factory=dict)
    blank_variables: list[str] = field(default_factory=list)
    problems: list[Problem] = field(default_factory=list)

    def summary(self) -> dict[str, object]:
        return {
            "file": self.label,
            "path": str(self.path),
            "found": self.exists,
            "variablesWithValue": len(self.values),
            "variablesLeftBlank": len(self.blank_variables),
            "linesNotUnderstood": len([p for p in self.problems if p.code == "malformed-line"]),
        }


@dataclass
class MergedEnvironment:
    """The merged view used by every provider check."""

    values: dict[str, str] = field(default_factory=dict)
    sources: dict[str, str] = field(default_factory=dict)
    blank_variables: list[str] = field(default_factory=list)
    files: list[EnvFile] = field(default_factory=list)
    problems: list[Problem] = field(default_factory=list)

    def get(self, name: str) -> str:
        return (self.values.get(name) or "").strip()

    def is_configured(self, name: str) -> bool:
        return bool(self.get(name))

    def source_of(self, name: str) -> str:
        return self.sources.get(name, "not-set")

    def names_with_prefix(self, prefix: str) -> list[str]:
        return sorted(name for name in self.values if name.startswith(prefix))

    def credential_values(self) -> dict[str, str]:
        """Every configured value that looks like a credential.

        Used to prove that no report or new source file repeats one of them.
        """
        return {
            name: value
            for name, value in self.values.items()
            if redaction.is_credential_name(name) and value.strip()
        }

    def has_errors(self) -> bool:
        return any(problem.severity == "error" for problem in self.problems)


def _strip_quotes(raw: str) -> str:
    value = raw.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def parse_env_text(
    text: str, label: str, malformed_severity: str = "error"
) -> tuple[dict[str, str], list[str], list[Problem]]:
    """Parse env file text into values, blank variable names and problems."""
    values: dict[str, str] = {}
    blanks: list[str] = []
    problems: list[Problem] = []

    for number, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        match = _ASSIGNMENT.match(raw_line)
        if not match:
            message = (
                "Line is not a NAME=value setting. Fix or remove that line."
                if malformed_severity == "error"
                else "Line is not a NAME=value setting, so it was ignored. Nothing in this project depends on it."
            )
            problems.append(
                Problem(
                    code="malformed-line",
                    severity=malformed_severity,
                    location=f"{label}:{number}",
                    message=message,
                )
            )
            continue
        name, raw_value = match.group(1), match.group(2)
        value = _strip_quotes(raw_value)
        if value.startswith("#"):
            value = ""
        if value:
            values[name] = value
        else:
            blanks.append(name)
    return values, blanks, problems


def load_env_file(
    path: Path, label: str, required: bool = False, malformed_severity: str = "error"
) -> EnvFile:
    """Read one secret file. The file is never written or modified."""
    if not path.exists():
        problems = []
        if required:
            problems.append(
                Problem(
                    code="missing-secret-file",
                    severity="error",
                    location=label,
                    message=f"Expected secret file was not found at {path}.",
                )
            )
        return EnvFile(label=label, path=path, exists=False, problems=problems)

    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as error:
        return EnvFile(
            label=label,
            path=path,
            exists=True,
            problems=[
                Problem(
                    code="unreadable-secret-file",
                    severity="error",
                    location=label,
                    message=f"Secret file could not be read ({error.strerror}).",
                )
            ],
        )

    values, blanks, problems = parse_env_text(text, label, malformed_severity)
    return EnvFile(label=label, path=path, exists=True, values=values, blank_variables=blanks, problems=problems)


@dataclass(frozen=True)
class SecretSource:
    """One approved settings file and how strictly it is judged."""

    path: Path
    label: str
    required: bool
    malformed_severity: str


def approved_secret_files(secrets_dir: Path | None = None) -> list[SecretSource]:
    """Return the approved settings files in merge order."""
    directory = secrets_dir or Path(os.environ.get("GERMAN_TTS_SECRETS_DIR", str(DEFAULT_SECRETS_DIR)))
    return [
        SecretSource(directory / SHARED_FILE_NAME, SHARED_FILE_NAME, required=False, malformed_severity="info"),
        SecretSource(directory / PROJECT_FILE_NAME, PROJECT_FILE_NAME, required=True, malformed_severity="error"),
    ]


def merge_environment(
    process_env: dict[str, str] | None = None,
    secrets_dir: Path | None = None,
    shared_file: Path | None = None,
    project_file: Path | None = None,
) -> MergedEnvironment:
    """Merge the approved files under the rules described in the module docstring."""
    environment = os.environ if process_env is None else process_env

    targets = approved_secret_files(secrets_dir)
    if shared_file is not None:
        targets[0] = replace(targets[0], path=shared_file)
    if project_file is not None:
        targets[1] = replace(targets[1], path=project_file)

    merged = MergedEnvironment()
    for source in targets:
        env_file = load_env_file(
            source.path, source.label, required=source.required, malformed_severity=source.malformed_severity
        )
        merged.files.append(env_file)
        merged.problems.extend(env_file.problems)
        for name, value in env_file.values.items():
            merged.values[name] = value
            merged.sources[name] = source.label
        for name in env_file.blank_variables:
            if name not in merged.values:
                merged.blank_variables.append(name)

    for name, value in environment.items():
        if value and value.strip():
            merged.values[name] = value
            merged.sources[name] = "process-environment"

    merged.blank_variables = sorted({name for name in merged.blank_variables if name not in merged.values})
    return merged
