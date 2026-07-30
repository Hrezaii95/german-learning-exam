"""Extract Momente AB Transskriptionen PDF -> transcripts.json + index."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

BASE = Path(r"E:\claude-cursor\side projects\German learning")
PDF = BASE / "Momente_AB_A1_1_Transskriptionen_2.pdf"
OUT_DIR = BASE / "content" / "extracted"
AUDIO_MAP_PATH = OUT_DIR / "audio-map.json"
RAW_OUT = OUT_DIR / "_pdf_raw" / "transskriptionen_full.txt"
JSON_OUT = OUT_DIR / "transcripts.json"
INDEX_OUT = OUT_DIR / "TRANSCRIPTS-INDEX.md"

SKIP_LINE = re.compile(
    r"^(?:Transkriptionen zu Momente|\u00a9|www\.|\d{1,2})$",
    re.I,
)
TRACK_ID_RE = re.compile(r"^(\d+)\s*_\s*(\d+)$")
LEKTION_HEADER = re.compile(
    r"^Lektion\s+(\d{1,2})\s*,\s*(?:\u00dcbung|Uebung)\s+(\d{1,2}[a-z]?)",
    re.I,
)
SPECIAL_HEADER = re.compile(
    r"^(?P<kind>Wiederholung|Test|Fokus Beruf)\s+L(?P<l1>\d{1,2})\s*-\s*(?P<l2>\d{1,2})\s*,\s*"
    r"(?:\u00dcbung|Uebung)\s+(?P<ex>\d{1,2}[a-z]?(?:\s*[a-z])?)",
    re.I,
)
COLON_LINE = re.compile(r"^([^:]{1,80}?)\s*:\s*(.*)$")
SUBPART_ONLY = re.compile(r"^[a-e]$", re.I)
SUBPART_PREFIX = re.compile(r"^([a-e])(.+)$", re.I)
NUMBERED_LINE = re.compile(r"^(\d+)\s*(.+)$")


def is_speaker_label(label: str) -> bool:
    label = label.strip()
    if not label or len(label) > 80:
        return False
    if re.fullmatch(r"\d+", label):
        return False
    if label.lower().startswith("http"):
        return False
    return True


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def load_audio_by_track_id() -> dict[str, dict]:
    audio_map = json.loads(AUDIO_MAP_PATH.read_text(encoding="utf-8"))
    by_tid: dict[str, dict] = {}
    for track in audio_map.get("tracks", []):
        tags = set(track.get("tags") or [])
        if "locale-cz" in tags or "locale-sk" in tags:
            continue
        match = re.search(r"/(\d+_\d+)_", track["file"])
        if match:
            by_tid[match.group(1)] = track
    return by_tid


def extract_pdf_text() -> tuple[str, int]:
    doc = pymupdf.open(PDF)
    pages: list[str] = []
    for i, page in enumerate(doc):
        pages.append(f"\n--- PAGE {i + 1} ---\n{page.get_text()}")
    full_text = "".join(pages)
    RAW_OUT.parent.mkdir(parents=True, exist_ok=True)
    RAW_OUT.write_text(full_text, encoding="utf-8")
    body = re.sub(r"--- PAGE \d+ ---\n?", "", full_text)
    return body, len(doc)


def parse_header(line: str) -> dict | None:
    special = SPECIAL_HEADER.match(line)
    if special:
        return {
            "header_kind": special.group("kind").lower().replace(" ", "_"),
            "lesson": int(special.group("l1")),
            "lesson_range": [int(special.group("l1")), int(special.group("l2"))],
            "exercise": normalize_ws(special.group("ex")),
            "title": line.strip(),
        }
    lek = LEKTION_HEADER.match(line)
    if lek:
        return {
            "header_kind": "lektion",
            "lesson": int(lek.group(1)),
            "exercise": lek.group(2).lower(),
            "title": line.strip(),
        }
    return None


def parse_block_lines(lines: list[str]) -> tuple[dict, list[dict], list[str]]:
    meta: dict = {}
    subpart: str | None = None
    dialogue_lines: list[dict] = []
    raw_parts: list[str] = []

    for raw in lines:
        line = raw.strip()
        if not line or SKIP_LINE.match(line):
            continue

        header = parse_header(line)
        if header:
            meta.update(header)
            raw_parts.append(line)
            continue

        if SUBPART_ONLY.match(line):
            subpart = line.lower()
            raw_parts.append(line)
            continue

        prefix = SUBPART_PREFIX.match(line)
        colon_probe = COLON_LINE.match(line)
        if prefix and not (colon_probe and is_speaker_label(colon_probe.group(1))):
            maybe_sub, rest = prefix.group(1).lower(), prefix.group(2).strip()
            if rest and (":" in rest[:40]):
                subpart = maybe_sub
                line = rest

        speaker_match = COLON_LINE.match(line)
        if speaker_match and is_speaker_label(speaker_match.group(1)):
            entry = {
                "speaker": normalize_ws(speaker_match.group(1)),
                "text": normalize_ws(speaker_match.group(2)),
            }
            if subpart:
                entry["subpart"] = subpart
            dialogue_lines.append(entry)
            raw_parts.append(line)
            continue

        numbered = NUMBERED_LINE.match(line)
        if numbered and not dialogue_lines:
            entry = {
                "speaker": None,
                "text": normalize_ws(numbered.group(2)),
                "index": int(numbered.group(1)),
            }
            if subpart:
                entry["subpart"] = subpart
            dialogue_lines.append(entry)
            raw_parts.append(line)
            continue

        if dialogue_lines and not line.startswith("-"):
            dialogue_lines[-1]["text"] = normalize_ws(
                dialogue_lines[-1]["text"] + " " + line
            )
            raw_parts[-1] = raw_parts[-1] + " " + line
        else:
            entry = {"speaker": None, "text": normalize_ws(line)}
            if subpart:
                entry["subpart"] = subpart
            dialogue_lines.append(entry)
            raw_parts.append(line)

    return meta, dialogue_lines, raw_parts


def split_into_blocks(body: str) -> list[tuple[str, list[str]]]:
    blocks: list[tuple[str, list[str]]] = []
    current_id: str | None = None
    current_lines: list[str] = []

    for raw_line in body.splitlines():
        line = raw_line.strip()
        track_match = TRACK_ID_RE.match(line)
        if track_match:
            if current_id is not None:
                blocks.append((current_id, current_lines))
            current_id = f"{track_match.group(1)}_{track_match.group(2)}"
            current_lines = []
            continue
        if current_id is not None:
            current_lines.append(raw_line)

    if current_id is not None:
        blocks.append((current_id, current_lines))
    return blocks


def build_entries(blocks: list[tuple[str, list[str]]], audio_by_tid: dict[str, dict]) -> list[dict]:
    entries: list[dict] = []
    for track_id, block_lines in blocks:
        meta, lines, raw_parts = parse_block_lines(block_lines)
        lesson = meta.get("lesson")
        exercise = meta.get("exercise")
        audio = audio_by_tid.get(track_id)

        entry: dict = {
            "id": f"transcript-{track_id.replace('_', '-')}",
            "track_id": track_id,
            "book": "AB",
            "lesson": lesson,
            "exercise": exercise,
            "header_kind": meta.get("header_kind"),
            "title": meta.get("title"),
            "lines": lines,
            "raw_text": "\n".join(raw_parts).strip(),
            "line_count": len(lines),
            "audio_linked": bool(audio),
        }
        if meta.get("lesson_range"):
            entry["lesson_range"] = meta["lesson_range"]
        if audio:
            entry["audio"] = {
                "file": audio["file"],
                "url_hint": audio.get("url_hint"),
                "lesson": audio.get("lesson"),
                "section": audio.get("section"),
                "match": "track_id",
            }
            if lesson is None:
                entry["lesson"] = audio.get("lesson")
            if exercise is None and audio.get("section"):
                sec = str(audio["section"])
                entry["exercise"] = sec.split(" ", 1)[-1] if " " in sec else sec
        entries.append(entry)
    return entries


def write_index(entries: list[dict], page_count: int, linked: int) -> None:
    lessons: dict[int, list[dict]] = {}
    for entry in entries:
        les = entry.get("lesson")
        if les is not None:
            lessons.setdefault(int(les), []).append(entry)

    unlinked = [e for e in entries if not e.get("audio_linked")]
    lines = [
        "# Momente A1.1 - Transcripts index",
        "",
        f"**Source:** `{PDF.name}` ({page_count} pages, pymupdf extract)",
        "**Machine map:** `content/extracted/transcripts.json`",
        "**Raw text:** `content/extracted/_pdf_raw/transskriptionen_full.txt`",
        "",
        "## Summary",
        "",
        "| Metric | Count |",
        "|--------|------:|",
        f"| Transcript entries (CD track clips) | {len(entries)} |",
        f"| Linked to DE MP3 (`audio-map.json`) | {linked} |",
        f"| Unlinked | {len(unlinked)} |",
        "",
        "## How entries map to audio",
        "",
        "Each PDF block starts with a **track id** like `1_07` - the same token used in",
        "German MP3 filenames (`1_07_AB_Momente_A11_2_6a.mp3`). Primary join key:",
        "`track_id` -> `audio.file` / `audio.url_hint`.",
        "",
        "Secondary metadata from PDF headers:",
        "",
        "- `Lektion N, Uebung X` - standard workbook listening",
        "- `Wiederholung L1-3, Uebung ...` - review module",
        "- `Test L1-3, Uebung ...` - module test",
        "- `Fokus Beruf L1-3, Uebung ...` - Beruf focus audio",
        "",
        "Within a clip, optional **subparts** (`a`-`e`) appear in `lines[].subpart`.",
        "Speaker turns use `lines[]` with `{ speaker, text }`; undelimited content stays in `raw_text`.",
        "",
        "## Serve path",
        "",
        "Use `audio.url_hint` from each entry, e.g.",
        "`/static/audio/Audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3`.",
        "",
        "## Per-lesson coverage",
        "",
        "| Lektion | Entries | Audio linked |",
        "|---------|--------:|-------------:|",
    ]
    for les in sorted(lessons):
        grp = lessons[les]
        lk = sum(1 for e in grp if e.get("audio_linked"))
        lines.append(f"| {les} | {len(grp)} | {lk} |")

    lines += ["", "## Unlinked entries", ""]
    if unlinked:
        for e in unlinked:
            lines.append(
                f"- `{e['track_id']}` lesson={e.get('lesson')} exercise={e.get('exercise')}"
            )
    else:
        lines.append("_All entries linked._")

    INDEX_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    body, page_count = extract_pdf_text()
    audio_by_tid = load_audio_by_track_id()
    blocks = split_into_blocks(body)
    entries = build_entries(blocks, audio_by_tid)
    linked = sum(1 for e in entries if e.get("audio_linked"))

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_pdf": PDF.name,
        "source_path": str(PDF),
        "extract_method": "pymupdf",
        "page_count": page_count,
        "entry_count": len(entries),
        "audio_linked_count": linked,
        "audio_map": "audio-map.json",
        "entries": entries,
    }
    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_index(entries, page_count, linked)
    print(f"WROTE {RAW_OUT}")
    print(f"WROTE {JSON_OUT} entries={len(entries)} linked={linked}")
    print(f"WROTE {INDEX_OUT}")


if __name__ == "__main__":
    main()
