"""Generate resumable exact-text German speech for the interactive book."""
import asyncio
import hashlib
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "platform/apps/web"
OUT = WEB / "public/book/speech"
MAPPING = WEB / "generated/study-speech.json"


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    texts = json.loads((WEB / "generated/study-speech-texts.json").read_text(encoding="utf-8"))
    mapping = json.loads(MAPPING.read_text(encoding="utf-8"))
    # Existing exact speech is reused, preserving the approved files.
    cards = json.loads((WEB / "generated/word-cards.json").read_text(encoding="utf-8"))["cards"]
    for card in cards:
        for row in card["rows"]:
            for form in [row["singular"], *row["plurals"]]:
                if form["audio"]:
                    mapping.setdefault(form["text"], form["audio"])
        for ex in card["examples"]:
            if ex["audio"]:
                mapping.setdefault(ex["de"], ex["audio"])
    semaphore = asyncio.Semaphore(6)
    failures = []
    pending = [text for text in texts if text not in mapping]
    count = 0

    def persist():
        MAPPING.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    async def one(text):
        nonlocal count
        key = hashlib.sha256(text.encode()).hexdigest()[:20]
        path = OUT / f"{key}.mp3"
        async with semaphore:
            for attempt in range(3):
                try:
                    if not path.exists() or path.stat().st_size < 1000:
                        partial = path.with_suffix(".partial")
                        await asyncio.wait_for(edge_tts.Communicate(text, "de-DE-KatjaNeural", rate="-5%").save(str(partial)), timeout=50)
                        if partial.stat().st_size < 1000:
                            raise ValueError("Empty speech file")
                        partial.replace(path)
                    mapping[text] = f"/book/speech/{path.name}"
                    break
                except Exception as error:
                    if attempt == 2:
                        failures.append({"text": text, "error": type(error).__name__})
                    else:
                        await asyncio.sleep(2)
            count += 1
            if count % 25 == 0 or count == len(pending):
                persist()
                print(f"Speech {count}/{len(pending)}; failed {len(failures)}", flush=True)

    print(f"Required {len(texts)}; existing {len(texts)-len(pending)}; generating {len(pending)}", flush=True)
    await asyncio.gather(*(one(text) for text in pending))
    persist()
    report = {"voice": "de-DE-KatjaNeural", "rate": "-5%", "label": "Synthesized German speech", "required": len(texts), "mapped": sum(t in mapping for t in texts), "failures": failures, "files": [{"path": p.relative_to(WEB / "public").as_posix(), "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.glob("*.mp3"))]}
    (ROOT / "research/lesson-04-book/speech-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if failures:
        raise SystemExit(f"{len(failures)} clips need retry; browser speech remains available")


if __name__ == "__main__":
    asyncio.run(main())
