"""Generate the reviewed-candidate de-DE audio bundle for Lessons 1–2.

This uses edge-tts only for the private Alpha prototype. The media manifest keeps
the generator/voice/settings explicit so production can migrate to Azure Speech.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "content" / "alpha-content.json"
OUTPUT_DIR = ROOT / "media" / "generated" / "tts-de-de-v1"
MANIFEST_PATH = ROOT / "media" / "manifests" / "alpha-tts-manifest.json"
VOICE = "de-DE-KatjaNeural"
RATE = "+4%"
CONCURRENCY = 6


def add_text(target: dict[str, set[str]], text: str, concept_id: str) -> None:
    cleaned = " ".join(text.strip().split())
    if cleaned:
        target.setdefault(cleaned, set()).add(concept_id)


def collect(content: dict) -> dict[str, set[str]]:
    texts: dict[str, set[str]] = {}
    lesson1, lesson2 = content["lessons"]

    for group in lesson1["vocabulary"].values():
        for item in group:
            add_text(texts, item[0], lesson1["id"])
    for verb in lesson1["verbs"]:
        add_text(texts, verb["infinitive"], verb["id"])
        for pronoun, form in verb["forms"].items():
            add_text(texts, f"{pronoun} {form}", verb["id"])
    for qa in lesson1["qa"]:
        add_text(texts, qa["question"], qa["id"])
        for answer in qa["answers"]:
            if "…" not in answer:
                add_text(texts, answer, qa["id"])

    for profession in lesson2["coreProfessions"]:
        add_text(texts, f"der {profession['masculine']}", profession["id"])
        add_text(texts, f"die {profession['feminine']}", profession["id"])
    for item in lesson2["profileVocabulary"]:
        add_text(texts, item[0], lesson2["id"])
    for verb in lesson2["verbs"]:
        add_text(texts, verb["infinitive"], verb["id"])
        for pronoun, form in verb["forms"].items():
            add_text(texts, f"{pronoun} {form}", verb["id"])
    for qa in lesson2["qa"]:
        add_text(texts, qa["question"].replace(" / ", " oder "), qa["id"])

    for job in content["teacherProfessions"]:
        for field in ("masculineSingular", "masculinePlural", "feminineSingular", "femininePlural"):
            add_text(texts, job[field], job["id"])

    models = {
        "phrase:intro-model": "Guten Tag. Mein Name ist Alex. Ich komme aus Spanien. Gut, danke. Und Ihnen?",
        "phrase:profession-model": "Ich bin Köchin. Ich arbeite in einem Restaurant.",
        "phrase:profile-model": "Ich bin achtundzwanzig Jahre alt, wohne in Berlin und bin Ingenieurin.",
        "phrase:arbeiten-model": "Die Köchin arbeitet im Restaurant.",
    }
    for concept_id, text in models.items():
        add_text(texts, text, concept_id)
    return texts


def file_name(text: str) -> str:
    return f"tts-{hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]}.mp3"


async def generate_one(text: str, concepts: set[str], semaphore: asyncio.Semaphore) -> dict:
    path = OUTPUT_DIR / file_name(text)
    async with semaphore:
        if not path.exists() or path.stat().st_size == 0:
            await edge_tts.Communicate(text=text, voice=VOICE, rate=RATE).save(str(path))
    data = path.read_bytes()
    return {
        "id": f"aud:tts:{hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]}:v1",
        "kind": "speech",
        "origin": "generated-prototype-edge-tts",
        "locale": "de-DE",
        "voice": VOICE,
        "rate": RATE,
        "spokenText": text,
        "conceptIds": sorted(concepts),
        "path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "reviewStatus": "candidate-needs-listening-review",
    }


async def main() -> None:
    content = json.loads(CONTENT_PATH.read_text(encoding="utf-8"))
    texts = collect(content)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    tasks = [generate_one(text, concepts, semaphore) for text, concepts in sorted(texts.items())]
    assets = await asyncio.gather(*tasks)
    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": {"name": "edge-tts", "version": edge_tts.__version__, "productionAuthority": False},
        "voice": VOICE,
        "rate": RATE,
        "assetCount": len(assets),
        "assets": assets,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated/verified {len(assets)} Alpha TTS assets at {OUTPUT_DIR}.")


if __name__ == "__main__":
    asyncio.run(main())
