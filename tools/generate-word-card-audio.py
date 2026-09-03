"""Generate only missing exact-text card previews, with a resumable manifest.

Same voice/rate as the approved engineer card. Technical generation is not
human pronunciation approval. Existing clips are reused by text and checksum.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "media/manifests/word-cards-tts-v1.json"
OUT = ROOT / "media/generated/word-cards-tts-v1"


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


async def main() -> None:
    catalog = read(ROOT / "platform/apps/web/generated/word-cards.json")
    reused = {a["spokenText"]: a for a in read(ROOT / "media/manifests/alpha-tts-manifest.json")["assets"]}
    generated = {a["spokenText"]: a for a in read(MANIFEST)["assets"]} if MANIFEST.exists() else {}
    texts = set()
    for card in catalog["cards"]:
        for row in card["rows"]:
            texts.add(row["singular"]["text"])
            texts.update(f["text"] for f in row["plurals"])
        # Each example is one complete exact utterance, including alternatives.
        texts.update(ex["de"] for ex in card["examples"])
    pending = sorted(texts - reused.keys() - generated.keys())
    OUT.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(4)
    failures = []
    completed = 0

    def persist() -> None:
        assets = sorted(generated.values(), key=lambda a: a["spokenText"])
        payload = {"version": 1, "voice": "de-DE-KatjaNeural", "rate": "+4%", "generator": f"edge-tts {edge_tts.__version__}", "humanListeningReview": "pending", "assets": assets, "failures": failures}
        temp = MANIFEST.with_suffix(".tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp.replace(MANIFEST)

    async def one(text: str) -> None:
        nonlocal completed
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
        path = OUT / f"word-{digest}.mp3"
        async with semaphore:
            for attempt in range(3):
                try:
                    if not path.exists():
                        temp = path.with_suffix(".partial.mp3")
                        await edge_tts.Communicate(text=text, voice="de-DE-KatjaNeural", rate="+4%").save(str(temp))
                        temp.replace(path)
                    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels", "-of", "json", str(path)], capture_output=True, text=True, check=True)
                    info = json.loads(probe.stdout)
                    duration = float(info["format"]["duration"])
                    if duration <= 0.1 or path.stat().st_size < 1000:
                        raise ValueError("Audio is empty or too short")
                    data = path.read_bytes()
                    generated[text] = {"spokenText": text, "path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "durationSeconds": duration, "streams": info["streams"], "reviewStatus": "candidate-needs-listening-review"}
                    break
                except Exception as exc:
                    if attempt == 2:
                        failures.append({"text": text, "error": type(exc).__name__})
                    else:
                        await asyncio.sleep(2 * (attempt + 1))
            completed += 1
            persist()
            if completed % 25 == 0 or completed == len(pending):
                print(f"Audio {completed}/{len(pending)}; failures {len(failures)}", flush=True)

    print(f"Required utterances: {len(texts)}; reuse: {len(texts & reused.keys())}; cached new: {len(generated)}; remaining: {len(pending)}", flush=True)
    await asyncio.gather(*(one(text) for text in pending))
    persist()
    if failures:
        raise SystemExit(f"Audio incomplete: {len(failures)} failed")


if __name__ == "__main__":
    asyncio.run(main())
