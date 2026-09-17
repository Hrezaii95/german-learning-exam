"""Project only answers actually present in the supplied publisher sources."""
import hashlib
import json
import re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
KEY = ROOT / "resources/original/answer-keys/Momente_A1_1_KB_Loesungen.pdf"
AB = ROOT / "resources/original/workbook/Momente A1.1 AB_7.pdf"
TRANSCRIPT = ROOT / "resources/original/transcripts/Momente_AB_A1_1_Transskriptionen_2.pdf"
GEN = ROOT / "platform/apps/web/generated"
answers = []


def add(page, exercise, text, source_page=1, model=False, source="coursebook-key", note=""):
    slug = re.sub(r"[^a-z0-9]+", "-", exercise.lower()).strip("-")
    answer = {
        "id": f"{page}-answer-{slug}", "pageId": page,
        "exercise": exercise, "text": re.sub(r"[ \t]+", " ", text).strip(),
        "kind": "sample" if model else "solution", "source": source,
        "sourceTitle": "Kursbuch Lösungen · Lessons 1–12" if source == "coursebook-key" else "Arbeitsbuch · Lösungsschlüssel Tests" if source == "workbook-key" else "Arbeitsbuch · Publisher transcript",
        "sourcePage": source_page, "note": note,
    }
    answers.append(answer)


doc = pymupdf.open(KEY)
texts = [re.sub(r"[ \t]+\n", "\n", re.sub(r"(\w)-\n(\w)", r"\1\2", p.get_text())) for p in doc]
starts = {1: (11, [1, 2, 4, 6]), 2: (15, [1, 2, 4, 6]), 3: (19, [1, 2, 5, 8]), 4: (29, [1, 3, 5, 8]), 5: (33, [1, 2, 5, 6])}
for lesson, (first, boundaries) in starts.items():
    source_page = 1 if lesson < 4 else 2
    text = texts[source_page-1].split(f"Lektion {lesson}\n", 1)[1]
    text = text.split(f"Lektion {lesson+1}\n", 1)[0].split("Magazin Lektionen", 1)[0]
    entries = list(re.finditer(r"^([1-9](?:[a-z](?:/[a-z])?)?|Schon fertig\?)\s+", text, re.M))
    previous = 1
    for index, match in enumerate(entries):
        label = match[1]
        model = label == "Schon fertig?"
        exercise = previous if model else int(label[0])
        previous = exercise
        page = first + max(i for i, boundary in enumerate(boundaries) if exercise >= boundary)
        body = " ".join(text[match.end():entries[index+1].start() if index+1 < len(entries) else len(text)].split())
        if model:
            body = body.removeprefix("(mögliche Antworten) ")
        add(f"coursebook-{page}", f"Exercise {previous} · Schon fertig?" if model else f"Exercise {label}", body, source_page, model)

# Magazin exercise numbers restart within each named skill and printed page.
add("coursebook-23", "Reading 1", "Josef: Deutschland → Australien (Sydney). Saliha: Kanada → Schweiz.", note="The key lists the unfilled entries. Shirin’s example is already on the page.")
add("coursebook-23", "Reading 2", "Steckbrief 1: 24; Robotik; Deutsch, Englisch, Schwedisch.\nSteckbrief 2: Josef Landthaler; 28; Ingenieur; Deutsch, Englisch.\nSteckbrief 3: Saliha; 21; Konditorin und Chocolatière; Französisch, Englisch, Deutsch, Türkisch.")
add("coursebook-24", "Film 1", "A: Saliha · B: Shirin · C: Josef")
add("coursebook-24", "Film 2", "Kanada, USA: Nordamerika.\nSchweden, Schweiz, Deutschland, Niederlande, Österreich, Dänemark: Europa.\nTürkei: Europa/Asien.\nIran, Singapur: Asien.\nAustralien: Australien.")
add("coursebook-24", "Film 4", "Shirin: Thea – Mutter, 48; Hilda – Oma, 77; Sima – Großmutter, 78.\nJosef: Barbara – Frau, 31; Martha – Schwester, 33; Elsa – Schwester, 26; Anneliese – Mutter, 54; Johann – Vater, 66; Markus – Großvater, 90.\nSaliha: Eric – Bruder, 35; Laura – Schwester, 27; Metin – Papa; Angie – Mama.")
add("coursebook-25", "Reading", "90–100; in Österreich; in der Schweiz; in Liechtenstein")
add("coursebook-25", "Listening 1", "Friederike: Sohn, zwei Enkelkinder.\nUwe: 27, Leipzig, Mechatroniker, Single.\nAnton: Linz, Arzt, verheiratet, drei Kinder.\nValerie: 36, Zürich, Team-Assistentin, geschieden, ein Kind.\nRafael: 38, Dortmund, Fotojournalist, nicht verheiratet, keine Kinder.")
add("coursebook-26", "Reading 1", "a: heißen viele Menschen in Deutschland, Österreich und der Schweiz.\nb: Müller.")

add("workbook-20", "Skills test · Exercise 1", "2 b · 3 c · 4 c · 5 b · 6 a · 7 b", 118, source="workbook-key", note="Item 1 is the worked example on the exercise page.")
add("workbook-20", "Skills test · Exercise 2", "Hallo Eva!\nDas ist Juana. Sie ist 26 Jahre alt. Sie arbeitet als Verkäuferin bei WohnMaXX. Sie kommt aus Peru. Sie wohnt in Wiesbaden. Sie spricht Spanisch, Englisch, Deutsch und Italienisch.\nViele Grüße\nThomas\n\nHallo Felix!\nDas ist Hamid. Er ist 30 Jahre alt. Er arbeitet als Architekt. Er kommt aus Afghanistan. Er wohnt in Dortmund. Er spricht Dari, Paschto, Englisch und Deutsch.\nViele Grüße\nJulia\n\nHallo Maria!\nDas sind Fali und Ravo. Sie sind 39 und 40 Jahre alt. Sie arbeiten als Ärzte. Sie kommen aus Madagaskar. Sie wohnen in München. Sie sprechen Malagasy, Französisch und Deutsch.\nViele Grüße\nLena", 118, True, "workbook-key")
add("workbook-21", "Skills test · Exercise 3", "b: Francesco · c: Natalia · d: Antoinette · e: Natalia · f: Antoinette · g: Antoinette", 118, source="workbook-key")
add("workbook-21", "Skills test · Exercise 4", "1 Ich heiße Pablo.\n2 Ich komme aus Spanien.\n3 Ich wohne in Berlin.\n4 Ich bin Verkäufer.\n5 Ich bin ledig und habe keine Kinder.\n6 Ich spreche Spanisch, Englisch und ein bisschen Deutsch.", 118, True, "workbook-key", "Use your own true details. This is the publisher’s example, not the only valid response.")

# The supplied review recordings explicitly supply the response, unlike open exercises.
add("workbook-18", "Review · Exercise 3", "12 · 48 · 29 · 7 · 35 · 16", 2, source="workbook-transcript", note="Numbers spoken in the publisher’s recording, track 1/19.")
add("workbook-18", "Review · Exercise 5", "Ich bin Student. (Beispiel)\nIch bin Schülerin.\nIch bin Architektin.\nIch habe einen Job als Verkäufer.\nIch mache eine Ausbildung als Friseurin.\nIch mache ein Praktikum bei Hotsped.\nIch bin Lehrer.", 3, source="workbook-transcript", note="Responses given in track 1/20; the transcript begins on page 2.")
add("workbook-19", "Review · Exercise 7", "Woher kommst du?\nWie heißt du?\nWer bist du?\nWie heißen Sie?\nWer ist das?\nWie heißen Sie?\nWie heißt du?\nWoher kommen Sie?", 3, source="workbook-transcript", note="Responses in order after the example, track 1/21.")
add("workbook-19", "Review · Exercise 9", "Nein, Astrid und Norbert sind nicht verheiratet. Sie sind geschieden.\nNein, Carla lebt nicht allein. Sie lebt zusammen mit Peter.\nNein, sie wohnen nicht in Zürich. Sie wohnen in Bern.\nNein, sie ist nicht 19 Jahre alt. Sie ist 21.\nNein, Frau Wachter ist nicht Lehrerin. Sie ist Journalistin.", 4, source="workbook-transcript", note="Responses after the example, track 1/22; transcript pages 3–4.")
add("workbook-22", "Work & careers · Exercise 2b", "Danke, gut.\nFreut mich.\ndas ist ja interessant\nVielen Dank", 5, source="workbook-transcript", note="The four missing phrases in order, track 1/31. Wie geht’s Ihnen is already filled in.")

# End-of-lesson quick tests have a separate official key in the book appendix.
quick = json.loads((ROOT / "research/book-answers/coursebook-quick-test-keys.json").read_text(encoding="utf-8"))
for lesson, (first, _) in starts.items():
    for label, text in zip(["Vocabulary", "Grammar", "Communication"], quick["lessons"][str(lesson)]):
        add(f"coursebook-{first+3}", f"Quick test · {label}", text, quick["printedPage"], note="Answers in printed order; worked examples may already be filled on the page.")
        answers[-1]["sourceTitle"] = "Kursbuch · Lösungen zu den Schnelltests"

book = json.loads((GEN / "interactive-book.json").read_text(encoding="utf-8"))
assert all(a["pageId"] in {p["id"] for p in book["pages"]} for a in answers)
assert all(a["text"] and a["exercise"] for a in answers)
(GEN / "book-answers.json").write_text(json.dumps(answers, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
audit = {"answers": len(answers), "pagesWithAnswers": len({a["pageId"] for a in answers}), "bySource": {s: sum(a["source"] == s for a in answers) for s in sorted({a["source"] for a in answers})}, "sources": [{"file": p.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in [KEY, AB, TRANSCRIPT, ROOT / quick["source"]]], "scope": "All entries in the supplied coursebook key for Lessons 1–5 and Magazine 1–3; coursebook quick-test answers in the appendix, p. 203; all Module 1 workbook skills-test answers; explicit responses in available Module 1 review transcripts."}
(ROOT / "research/book-answers/answer-source-audit.json").write_text(json.dumps(audit, indent=2)+"\n", encoding="utf-8")
print(json.dumps(audit))
