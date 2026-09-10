"""Extract source-bounded pages, readable lines and exercise-labelled audio.

Run locally with pymupdf and Pillow. CI consumes the checked-in output. The
source PDFs/audio remain private; exported lesson pages carry Hueber attribution.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "platform/apps/web/public/book"
GENERATED = ROOT / "platform/apps/web/generated"
DIGITS = str.maketrans({chr(0xF630 + i): str(i) for i in range(10)})

# Printed page starts; PDF page = printed page + 2 for these source files.
LESSONS = [(1, 11, 6), (2, 15, 10), (3, 19, 14), (4, 29, 26)]
# Each page's exercise starts, checked against the source pages.
EXERCISES = {
    "coursebook": {1: [1, 2, 4, 6], 2: [1, 2, 4, 6], 3: [1, 2, 5, 8], 4: [1, 3, 5, 8]},
    "workbook": {1: [1, 5, 10, 13], 2: [1, 4, 8, 12], 3: [1, 5, 9, 12], 4: [1, 4, 9, 14]},
}


def clean(text):
    text = text.translate(DIGITS).replace("\u00ad", "").replace("\u0007", "")
    text = re.sub(r"[\ue000-\uf8ff§©⚪◯]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "audio").mkdir(exist_ok=True)
    (PUBLIC / "pages").mkdir(exist_ok=True)
    docs = {
        "coursebook": ROOT / "resources/original/coursebook/A1-KB-momente.pdf",
        "workbook": ROOT / "resources/original/workbook/Momente A1.1 AB_7.pdf",
    }
    pages, audio, sources = [], [], []
    for kind, path in docs.items():
        doc = pymupdf.open(path)
        sources.append({"kind": kind, "path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        for lesson, kb, ab in LESSONS:
            start = kb if kind == "coursebook" else ab
            for offset in range(4):
                printed = start + offset
                page = doc[printed + 1]
                page_id = f"{kind}-{printed}"
                pix = page.get_pixmap(matrix=pymupdf.Matrix(1.8, 1.8), alpha=False)
                Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(PUBLIC / "pages" / f"{page_id}.webp", quality=86)
                lines = []
                for block in page.get_text("dict")["blocks"]:
                    for line in block.get("lines", []):
                        text = clean("".join(span["text"] for span in line["spans"]))
                        if len(text) < 2 or not re.search(r"[A-Za-zÄÖÜäöüß]{2}", text):
                            continue
                        if re.fullmatch(r"[A-Z ]{5,}", text) and len(text.replace(" ", "")) > 4:
                            text = text.replace(" ", "").capitalize()
                        x0, y0, x1, y1 = line["bbox"]
                        if y0 > page.rect.height * .96:
                            continue
                        lines.append({"id": f"{page_id}-line-{len(lines)+1}", "text": text, "box": [round(x0 / page.rect.width * 100, 3), round(y0 / page.rect.height * 100, 3), round((x1-x0) / page.rect.width * 100, 3), round((y1-y0) / page.rect.height * 100, 3)]})
                pages.append({"id": page_id, "kind": kind, "lesson": lesson, "printedPage": printed, "pdfPage": printed + 2, "image": f"/book/pages/{page_id}.webp", "width": pix.width, "height": pix.height, "lines": lines, "audioIds": []})
    for file in sorted((ROOT / "resources/original/audio").rglob("*.mp3")):
        match = re.search(r"_(KB|AB)_(?:Momente_A11_)?L([1-4])_(\d+)(.*)\.mp3$", file.name)
        if not match:
            continue
        label, lesson, exercise, suffix = match.groups()
        lesson, exercise = int(lesson), int(exercise)
        kind = "coursebook" if label == "KB" else "workbook"
        # AB names carry Momente before AB; the regex supports both source naming schemes.
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        if any(a["sha256"] == digest for a in audio):
            continue
        starts = EXERCISES[kind][lesson]
        offset = max(i for i, n in enumerate(starts) if exercise >= n)
        candidates = [p for p in pages if p["kind"] == kind and p["lesson"] == lesson]
        page = candidates[offset]
        audio_id = f"{kind}-l{lesson}-ex{exercise}-{digest[:8]}"
        dest = f"/book/audio/{audio_id}.mp3"
        shutil.copyfile(file, PUBLIC / "audio" / f"{audio_id}.mp3")
        detail = suffix.replace("-CZ", "").strip("_").replace("_", " ").strip()
        track = {"id": audio_id, "lesson": lesson, "kind": kind, "exercise": exercise, "label": f"Exercise {exercise}" + (f" · {detail}" if detail else ""), "src": dest, "source": file.relative_to(ROOT).as_posix(), "sha256": digest, "pageId": page["id"]}
        audio.append(track)
        page["audioIds"].append(audio_id)
    result = {"version": 1, "credit": "Momente A1 · © Hueber Verlag. Coursebook and workbook pages and original recordings used with the owner's distribution authorization.", "sources": sources, "pages": pages, "audio": audio}
    (GENERATED / "interactive-book.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pages": len(pages), "lines": sum(len(p["lines"]) for p in pages), "originalTracks": len(audio), "lesson4Tracks": sum(a["lesson"] == 4 for a in audio)}))


if __name__ == "__main__":
    main()
