"""Extract source-bounded pages, readable lines and exercise-labelled audio.

Run locally with pymupdf and Pillow. CI consumes the checked-in output. The
source PDFs/audio remain private; exported lesson pages carry Hueber attribution.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "platform/apps/web/public/book"
GENERATED = ROOT / "platform/apps/web/generated"
DIGITS = str.maketrans(dict(zip("", "0123456789")))

# Printed page starts; PDF page = printed page + 2 for these source files.
LESSONS = [(1, 11, 6), (2, 15, 10), (3, 19, 14), (4, 29, 26), (5, 33, 30), (6, 37, 34), (7, 47, 46), (8, 51, 50), (9, 55, 54), (10, 65, 66), (11, 69, 70)]
# Each page's exercise starts, checked against the source pages.
EXERCISES = {
    "coursebook": {1: [1, 2, 4, 8], 2: [1, 2, 4, 6], 3: [1, 2, 5, 9], 4: [1, 3, 5, 8], 5: [1, 2, 5, 6], 6: [1, 2, 4, 9], 7: [1, 3, 8, 10], 8: [1, 2, 5, 7], 9: [1, 3, 8, 10], 10: [1, 3, 6, 10], 11: [1, 2, 5, 8]},
    "workbook": {1: [1, 5, 10, 13], 2: [1, 4, 8, 12], 3: [1, 5, 9, 12], 4: [1, 4, 9, 14], 5: [1, 5, 9, 15], 6: [1, 4, 7, 10], 7: [1, 4, 6, 10], 8: [1, 6, 9, 12], 9: [1, 4, 8, 12], 10: [1, 5, 8, 11], 11: [1, 5, 7, 9]},
}


def clean(text):
    text = text.translate(DIGITS).replace("\u00ad", "").replace("\u0007", "")
    text = re.sub(r"[\x00-\x1f]", "", text)
    text = re.sub(r"[\ue000-\uf8ff§©⚪◯]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--through",type=int,choices=[4,5,6,7,8,9,10,11],default=11)
    through=parser.parse_args().through
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
        last=next((kb,ab) for lesson,kb,ab in LESSONS if lesson==through)
        end = (46 if kind=="coursebook" else 45) if through==6 else last[0 if kind=="coursebook" else 1]+3
        if through==9:end=64 if kind=="coursebook" else 65
        action_lessons={155:[1],156:[1],157:[2],158:[2],159:[3,4],160:[5],161:[6]} if kind=="coursebook" else {}
        if through>=7:
            action_lessons.update({162:[7],163:[7,8],191:[1],192:[2],193:[4,5],194:[5,7]} if kind=="coursebook" else {86:[1,2],87:[3,4],88:[5,6],89:[6,7,8]})
        if through>=8:
            action_lessons.update({164:[8]} if kind=="coursebook" else {90:[8]})
        if through>=9:
            action_lessons.update({165:[9],166:[9]} if kind=="coursebook" else {91:[9,10]})
        if through>=10 and kind=="coursebook":action_lessons.update({167:[10],195:[10]})
        if through>=11:action_lessons.update({168:[11],169:[11],196:[11],197:[11]} if kind=="coursebook" else {92:[11,12]})
        printed_pages=list(range(-1,end+1))+(list(action_lessons) if through>=6 else [])
        corrections=json.loads((ROOT/'research/lesson-expansion/book-line-corrections.json').read_text(encoding='utf8'))
        for printed in printed_pages:
            starts = [(lesson, kb if kind == "coursebook" else ab) for lesson, kb, ab in LESSONS if lesson<=through]
            lesson = max((lesson for lesson, start in starts if printed >= start), default=1)
            if printed in action_lessons:
                lesson=max(n for n in action_lessons[printed] if n<=through)
                section=("Partner activities" if kind=="coursebook" else "Extra practice")+" · Lesson "+" / ".join(map(str,action_lessons[printed]))
            elif printed < starts[0][1]:
                section = "Getting started"
            elif kind == "coursebook" and 23 <= printed <= 28:
                section = "Module 1 · " + ("Magazine" if printed <= 26 else "Grammar" if printed == 27 else "Communication")
            elif kind == "workbook" and 18 <= printed <= 25:
                section = "Module 1 · " + ("Review" if printed <= 19 else "Skills test" if printed <= 21 else "Work & careers" if printed <= 23 else "Exam practice")
            elif kind == "coursebook" and 41 <= printed <= 46:
                section = "Module 2 · " + ("Magazine" if printed <= 44 else "Grammar" if printed == 45 else "Communication")
            elif kind == "workbook" and 38 <= printed <= 45:
                section = "Module 2 · " + ("Review" if printed <= 39 else "Skills test" if printed <= 41 else "Work & careers" if printed <= 43 else "Exam practice")
            elif kind=="coursebook" and 59<=printed<=64:
                section="Module 3 · "+("Magazine" if printed<=62 else "Grammar" if printed==63 else "Communication")
            elif kind=="workbook" and 58<=printed<=65:
                section="Module 3 · "+("Review" if printed<=59 else "Skills test" if printed<=61 else "Work & careers" if printed<=63 else "Exam practice")
            else:
                section = f"Lesson {lesson}"
            page = doc[printed + 1]
            page_id = f"{kind}-{printed}" if printed > 0 else kind + ("-cover" if printed == -1 else "-map")
            pix = page.get_pixmap(matrix=pymupdf.Matrix(3.2, 3.2), alpha=False)
            if not (PUBLIC / "pages" / f"{page_id}.webp").exists():
                Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(PUBLIC / "pages" / f"{page_id}.webp", quality=86)
            lines = []
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    raw_text="".join(span["text"] for span in line["spans"])
                    text = clean(next((c['text'] for c in corrections.get(page_id,[]) if raw_text.lstrip().startswith(c['startsWith'].lstrip())),raw_text))
                    if len(text) < 2 or not re.search(r"[A-Za-zÄÖÜäöüß]{2}", text):
                        continue
                    if re.fullmatch(r"[A-Z ]{5,}", text) and len(text.replace(" ", "")) > 4:
                        text = text.replace(" ", "").capitalize()
                    x0, y0, x1, y1 = line["bbox"]
                    if y0 > page.rect.height * .96:
                        continue
                    lines.append({"id": f"{page_id}-line-{len(lines)+1}", "text": text, "box": [round(x0 / page.rect.width * 100, 3), round(y0 / page.rect.height * 100, 3), round((x1-x0) / page.rect.width * 100, 3), round((y1-y0) / page.rect.height * 100, 3)]})
            pages.append({"id": page_id, "kind": kind, "lesson": lesson, "printedPage": printed, "pdfPage": printed + 2, "image": f"/book/pages/{page_id}.webp", "width": pix.width, "height": pix.height, "lines": lines, "audioIds": [], "section": section, "pageLabel": "Cover" if printed == -1 else "Inside cover · map" if printed == 0 else f"Page {printed}"})
            if printed in action_lessons:
                pages[-1]['lessons']=action_lessons[printed]
    for file in sorted((ROOT / "resources/original/audio").rglob("*.mp3")):
        match = re.search(r"_(KB|AB)_(?:Momente_A11_)?L(\d+)_(\d+)(.*)\.mp3$", file.name)
        if not match:
            match=re.search(r"_(AB)_Momente_A11_(8|10|11)_(\d+)(.*)\.mp3$",file.name)
        if not match:
            continue
        label, lesson, exercise, suffix = match.groups()
        lesson, exercise = int(lesson), int(exercise)
        if lesson>through:
            continue
        if lesson>=7 and file.name.endswith('-SK.mp3') and any((ROOT/'resources/original/audio').rglob(file.name.replace('-SK.mp3','-CZ.mp3'))):
            # Use one supplied edition of each recording, not duplicate regional copies.
            continue
        kind = "coursebook" if label == "KB" else "workbook"
        if kind=="workbook" and lesson in (8,10,11) and "Momente_A1_1_AB_CD2" not in str(file):
            continue
        # AB names carry Momente before AB; the regex supports both source naming schemes.
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        if any(a["sha256"] == digest for a in audio):
            continue
        starts = EXERCISES[kind][lesson]
        offset = max(i for i, n in enumerate(starts) if exercise >= n)
        start = next(kb if kind == "coursebook" else ab for number, kb, ab in LESSONS if number == lesson)
        if kind=="coursebook" and lesson==8 and exercise==4 and suffix.startswith("b"):
            offset=2
        # Exercise 14b/c continues onto the next workbook page.
        if kind=="workbook" and lesson==5 and exercise==14 and suffix.startswith("b"):
            offset=3
        page = next(p for p in pages if p["id"] == f"{kind}-{start + offset}")
        audio_id = f"{kind}-l{lesson}-ex{exercise}-{digest[:8]}"
        dest = f"/book/audio/{audio_id}.mp3"
        shutil.copyfile(file, PUBLIC / "audio" / f"{audio_id}.mp3")
        detail = suffix.replace("-CZ", "").strip("_").replace("_", " ").strip()
        track = {"id": audio_id, "lesson": lesson, "kind": kind, "exercise": exercise, "label": f"Exercise {exercise}" + (f" · {detail}" if detail else ""), "src": dest, "source": file.relative_to(ROOT).as_posix(), "sha256": digest, "pageId": page["id"]}
        audio.append(track)
        page["audioIds"].append(audio_id)
        if kind=="coursebook" and lesson==11 and exercise==1:
            track['label']=f'Exercises 1a & 2a · Speaker {suffix.rsplit("_",1)[-1]}'
            next(p for p in pages if p['id']=='coursebook-70')['audioIds'].append(audio_id)
    if through>=8:
        for file in sorted((ROOT/"resources/original/audio").rglob("*_AB_Momente_A11_8_noch_mehr_9_*.mp3")):
            digest=hashlib.sha256(file.read_bytes()).hexdigest()
            number=int(file.name.split("_")[1])
            level="Guided" if number<56 else "Challenge"
            audio_id=f"workbook-l8-extra9-track{number}-{digest[:8]}"
            dest=f"/book/audio/{audio_id}.mp3"
            shutil.copyfile(file,PUBLIC/"audio"/f"{audio_id}.mp3")
            page=next(p for p in pages if p["id"]=="workbook-90")
            audio.append({"id":audio_id,"lesson":8,"kind":"workbook","exercise":9,"label":f"Extra practice · {level} · Track 2/{number}","src":dest,"source":file.relative_to(ROOT).as_posix(),"sha256":digest,"pageId":page["id"]})
            page["audioIds"].append(audio_id)
    # Module 1 recordings belong to the review/magazine pages between Lessons 3 and 4.
    for file in sorted((ROOT / "resources/original/audio").rglob("*.mp3")):
        name = file.name
        module=1
        if "Magazin 1_Hoeren" in name and "_KB_" in name:
            kind, printed, exercise, group = "coursebook", 25, 1, "Magazine · Listening"
        elif "Momente_A1_1_AB_CD1" in str(file) and "Modul 1" in name:
            kind = "workbook"
            exercise = int(re.search(r"Modul 1_(\d+)", name)[1])
            group = "Review" if "Wiederholung" in name else "Skills test" if "Test" in name else "Work & careers"
            printed = (18 if exercise <= 5 else 19) if group == "Review" else (20 if exercise == 1 else 21) if group == "Skills test" else 22
        elif through>=6 and "Magazin 2_" in name and "_KB_" in name:
            module=2
            kind,printed,exercise,group="coursebook",44 if "Lied" in name else 42,1,"Magazine · Song" if "Lied" in name else "Magazine · Listening"
        elif through>=6 and "Momente_A1_1_AB_CD1" in str(file) and "Modul 2" in name:
            module=2
            kind="workbook"
            exercise=int(re.search(r"Modul 2_(\d+)",name)[1])
            group="Review" if "Wiederholung" in name else "Skills test" if "Test" in name else "Work & careers"
            printed=(38 if exercise<=5 else 39) if group=="Review" else (40 if exercise<=2 else 41) if group=="Skills test" else (42 if exercise<=3 else 43)
        elif through>=9 and "Magazin 3_" in name and "_KB_" in name:
            module=3
            kind,printed,exercise,group="coursebook",62,1,"Magazine · Listening"
        elif through>=9 and "Momente_A1_1_AB_CD2" in str(file) and ("Modul 3" in name or "Prüfungstraining" in name and 17<=int(name.split("_")[1])<=25):
            module=3
            kind="workbook"
            track=int(name.split("_")[1])
            if track>=17:
                exercise=1 if track<=18 else 2
                group="Exam practice"
                printed=64 if track<=18 else 65
            else:
                exercise=int(re.search(r"Modul 3_(\d+)",name)[1])
                group="Review" if "Wiederholung" in name else "Skills test" if "Test" in name else "Work & careers"
                printed=(58 if exercise<=6 else 59) if group=="Review" else (60 if exercise<=2 else 61) if group=="Skills test" else 62
        else:
            continue
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        if any(a["sha256"] == digest for a in audio):
            continue
        disc,number=map(int,re.match(r"([12])_(\d+)",name).groups())
        audio_id = f"{kind}-m{module}-track{number}-{digest[:8]}"
        dest = f"/book/audio/{audio_id}.mp3"
        shutil.copyfile(file, PUBLIC / "audio" / f"{audio_id}.mp3")
        page = next(p for p in pages if p["id"] == f"{kind}-{printed}")
        audio.append({"id": audio_id, "lesson": module*3, "kind": kind, "exercise": exercise, "label": f"{group} · Exercise {exercise} · Track {disc}/{number:02}", "src": dest, "source": file.relative_to(ROOT).as_posix(), "sha256": digest, "pageId": page["id"]})
        page["audioIds"].append(audio_id)
    result = {"version": 2, "credit": "Momente A1 · © Hueber Verlag. Coursebook and workbook pages and original recordings used with the owner's distribution authorization.", "sources": sources, "pages": pages, "audio": audio}
    (GENERATED / "interactive-book.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pages": len(pages), "lines": sum(len(p["lines"]) for p in pages), "originalTracks": len(audio), "lesson4Tracks": sum(a["lesson"] == 4 for a in audio)}))


if __name__ == "__main__":
    main()
