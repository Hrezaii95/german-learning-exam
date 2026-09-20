"""Build resumable, exact-text generated pronunciation for publisher transcripts.

Original recordings and transcript text are preserved. The manifest stores audio
paths in source-line order; its source hash lets the publication tests detect
stale alignment after a transcript edit.
"""
import asyncio
import hashlib
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "platform/apps/web"
SOURCE = WEB / "generated/audio/listening-transcripts.json"
OUTPUT = WEB / "public/book/transcript-speech"
MANIFEST = WEB / "generated/audio/transcript-speech.json"
REPORT = ROOT / "research/ux-audit-2026-09-18/step-8-transcript-speech.json"


async def main():
    source_bytes = SOURCE.read_text(encoding="utf-8-sig").replace("\r\n", "\n").encode("utf-8")
    source = json.loads(source_bytes)
    texts = sorted({line["text"] for section in ("tracks", "workbook")
                    for track in source[section].values() for line in track["lines"]})
    speech = {}
    for name in ("study", "collection", "country", "home"):
        speech.update(json.loads((WEB / f"generated/{name}-speech.json").read_text(encoding="utf-8")))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    failures = []
    semaphore = asyncio.Semaphore(6)
    completed = 0

    def usable(src):
        if not isinstance(src, str) or not src.startswith("/"):
            return False
        file = (WEB / "public" / src.lstrip("/")).resolve()
        return file.is_relative_to((WEB / "public").resolve()) and file.is_file() and file.stat().st_size > 1000

    async def generate(text):
        nonlocal completed
        if usable(speech.get(text)):
            return
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]
        target = OUTPUT / f"{digest}.mp3"
        src = f"/book/transcript-speech/{target.name}"
        async with semaphore:
            for attempt in range(3):
                try:
                    if not usable(src):
                        partial = target.with_suffix(".partial")
                        await asyncio.wait_for(edge_tts.Communicate(text, "de-DE-KatjaNeural", rate="-5%").save(str(partial)), timeout=60)
                        if partial.stat().st_size <= 1000:
                            raise ValueError("Generated audio is empty")
                        partial.replace(target)
                    speech[text] = src
                    break
                except Exception as error:
                    if attempt == 2:
                        failures.append({"textHash": digest, "error": type(error).__name__})
                    else:
                        await asyncio.sleep(2)
            completed += 1
            if completed % 25 == 0:
                print(f"Processed {completed}; failures {len(failures)}", flush=True)

    pending = sum(not usable(speech.get(text)) for text in texts)
    print(f"Unique transcript lines: {len(texts)}; need generation or recovery: {pending}", flush=True)
    await asyncio.gather(*(generate(text) for text in texts))
    manifest = {"version": 1, "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
                "voice": "de-DE-KatjaNeural", "kind": "generated",
                **{section: {key: [speech.get(line["text"]) if usable(speech.get(line["text"])) else None
                                  for line in track["lines"]]
                             for key, track in source[section].items()}
                   for section in ("tracks", "workbook")}}
    temporary = MANIFEST.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(MANIFEST)
    REPORT.write_text(json.dumps({"sourceSha256": manifest["sourceSha256"], "uniqueLines": len(texts),
                                  "mapped": sum(usable(speech.get(text)) for text in texts),
                                  "failures": failures, "voice": manifest["voice"],
                                  "label": "Generated pronunciation; original dialogue remains separate"},
                                 indent=2) + "\n", encoding="utf-8")
    print(f"Complete: {len(texts) - len(failures)}/{len(texts)} lines", flush=True)
    if failures:
        raise SystemExit("Some clips need retry; see the generation report.")


if __name__ == "__main__":
    asyncio.run(main())
