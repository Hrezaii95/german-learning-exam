"""Provider-neutral text-to-speech operations tooling for German Learning OS.

Nothing in this package generates learner audio for the product. It loads
provider configuration from the two approved secret files, reports redacted
provider availability, and defines the clip cache key that keeps an already
approved clip stable when a comparison or failover provider is used.

Modules:
    env_merge  - read and merge the approved secret files safely
    redaction  - secret detection and redaction helpers
    providers  - provider registry, credential resolution, clip cache keys
    probes     - harmless availability checks (no paid generation)
    smoke      - the command that writes the redacted status report
"""

__all__ = ["env_merge", "redaction", "providers", "probes", "smoke"]
