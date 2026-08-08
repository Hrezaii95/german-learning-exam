# Cursor Packet C2DR3 — Review-Card Persistence String Firewall

Status: surgical final P2 remediation before G2
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: persistence validation/tests/README only.

Apply the persistence `assertPersistedString` length/path/secret firewall to every string persisted inside each validated `ReviewCardState`, including at minimum `cardId`, `conceptId`, `templateId`, `due`, `lastReview`, scheduler ID/version and any future nested string. Do this after review-card schema parsing and before the envelope is accepted. Preserve legitimate content IDs and ISO timestamps. Reject Windows drive paths, UNC, absolute POSIX/file URI strings and values over 512 characters without echoing them.

Add exact tests for absolute and 513-character `cardId`, plus nested template/concept/date path-shaped probes where schema permits; verify import/export/direct adapter replace all fail closed and prior state is unchanged. Preserve all 278 tests and all gates. Do not edit outside ownership or commit.
