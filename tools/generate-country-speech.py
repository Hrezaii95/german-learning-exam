"""Generate exact German clips for the country sheet, reusing existing audio."""
import asyncio
import hashlib
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "platform/apps/web"
OUT = WEB / "public/audio/country-sheet"
MAPPING = WEB / "generated/country-speech.json"


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    texts = json.loads((WEB / "generated/country-speech-texts.json").read_text(encoding="utf-8"))
    existing = json.loads((WEB / "generated/study-speech.json").read_text(encoding="utf-8"))
    for card in json.loads((WEB / "generated/word-cards.json").read_text(encoding="utf-8"))["cards"]:
        for row in card["rows"]:
            for form in [row["singular"], *row["plurals"]]:
                if form["audio"]:
                    existing.setdefault(form["text"], form["audio"])
        for example in card["examples"]:
            if example["audio"]:
                existing.setdefault(example["de"], example["audio"])
    mapping = json.loads(MAPPING.read_text(encoding="utf-8"))
    mapping.update({text: existing[text] for text in texts if text in existing})
    semaphore = asyncio.Semaphore(6)
    failures = []
    count = 0
    pending = [text for text in texts if text not in mapping]

    async def one(text):
        nonlocal count
        path = OUT / f"{hashlib.sha256(text.encode()).hexdigest()[:20]}.mp3"
        async with semaphore:
            for attempt in range(3):
                try:
                    if not path.exists() or path.stat().st_size < 1000:
                        partial = path.with_suffix(".partial")
                        await asyncio.wait_for(edge_tts.Communicate(text, "de-DE-KatjaNeural", rate="-5%").save(str(partial)), timeout=50)
                        if partial.stat().st_size < 1000:
                            raise ValueError("Empty speech file")
                        partial.replace(path)
                    mapping[text] = f"/audio/country-sheet/{path.name}"
                    break
                except Exception as error:
                    if attempt == 2:
                        failures.append({"text": text, "error": type(error).__name__})
                    else:
                        await asyncio.sleep(2)
            count += 1
            if count % 25 == 0 or count == len(pending):
                MAPPING.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(f"Country speech {count}/{len(pending)}; failures {len(failures)}", flush=True)

    await asyncio.gather(*(one(text) for text in pending))
    MAPPING.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"required": len(texts), "mapped": sum(t in mapping for t in texts), "failures": failures, "voice": "de-DE-KatjaNeural", "rate": "-5%", "files": [{"path": p.relative_to(WEB / "public").as_posix(), "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.glob("*.mp3"))]}
    (ROOT / "research/country-cheatsheet/speech-audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if failures:
        raise SystemExit("Country speech generation incomplete")
    manifest = {"version": 1, "voice": report["voice"], "rate": report["rate"], "assets": [
        {"publicRelativePath": asset["path"], "sha256": asset["sha256"], "bytes": asset["bytes"],
         "exactText": next(text for text, path in mapping.items() if path == "/" + asset["path"])}
        for asset in report["files"]
    ]}
    (ROOT / "media/manifests/country-sheet-public-audio-v1.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
