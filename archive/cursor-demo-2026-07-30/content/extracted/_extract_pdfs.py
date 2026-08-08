"""One-off PDF text extraction for Lesson 2 content."""
import re
from pathlib import Path

import pymupdf

BASE = Path(r"E:\claude-cursor\side projects\German learning")
OUT = BASE / "content" / "extracted" / "_pdf_raw"
OUT.mkdir(parents=True, exist_ok=True)

PDFS = {
    "glossary": BASE / "Momente_A1_1_KB_Glossar_Deutsch_Spanisch.pdf",
    "kursbuch": BASE / "A1-KB-momente.pdf",
    "arbeitsbuch": BASE / "Momente A1.1 AB_7.pdf",
    "loesungen": BASE / "Momente_A1_1_KB_Loesungen.pdf",
}

for name, path in PDFS.items():
    doc = pymupdf.open(path)
    print(f"\n=== {name}: {path.name} ({len(doc)} pages) ===")
    hits = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if re.search(r"Lektion\s*2|Lektion\s*II|Beruf|von Beruf", text, re.I):
            hits.append(i + 1)
    print(f"  pages with L2/Beruf: {hits[:40]}{'...' if len(hits) > 40 else ''} (total {len(hits)})")
    full = []
    for i, page in enumerate(doc):
        full.append(f"\n--- PAGE {i + 1} ---\n{page.get_text()}")
    out_path = OUT / f"{name}_full.txt"
    out_path.write_text("".join(full), encoding="utf-8")
    print(f"  saved {out_path}")
