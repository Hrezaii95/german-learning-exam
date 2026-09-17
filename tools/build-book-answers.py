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
starts = {1: (11, [1, 2, 4, 8]), 2: (15, [1, 2, 4, 6]), 3: (19, [1, 2, 5, 9]), 4: (29, [1, 3, 5, 8]), 5: (33, [1, 2, 5, 6]), 6: (37, [1, 2, 4, 9]), 7: (47, [1, 3, 8, 10]), 8: (51, [1, 2, 5, 7]), 9: (55, [1, 3, 8, 10]), 10: (65, [1, 3, 6, 10]), 11: (69, [1, 2, 5, 8])}
for lesson, (first, boundaries) in starts.items():
    source_page = 1 if lesson < 4 else 2 if lesson<=8 else 3
    text = texts[source_page-1].split(f"Lektion {lesson}\n", 1)[1]
    text = text.split(f"Lektion {lesson+1}\n", 1)[0].split("Magazin Lektionen", 1)[0]
    if lesson==8:
        text += "\n" + texts[2][texts[2].index("4b 2 der Vormittag"):].split("Lektion 9",1)[0]
        text=re.sub(r"\n([5-7]) (?=der Abend|Viertel vor|zehn vor|fünf vor)",r" \1 ",text)
    if lesson==7:
        # These are the second and third speakers within 9b, not new exercises.
        text=re.sub(r"\n([23]) (?=Versicherungskaufmann|ein Start-up)",r" \1 ",text)
    if lesson==2:
        # Wrapped partner-table item 14 belongs to exercise 8a/b.
        text=re.sub(r"\n14 (?=falsch:)", " 14 ", text)
    entries = list(re.finditer(r"^([1-9]\d*(?:[a-z](?:/[a-z])?)?|Schon fertig\?)\s+", text, re.M))
    previous = 1
    for index, match in enumerate(entries):
        label = match[1]
        extension = label == "Schon fertig?"
        model = extension
        exercise = previous if model else int(re.match(r"\d+",label)[0])
        previous = exercise
        page = first + max(i for i, boundary in enumerate(boundaries) if exercise >= boundary)
        if lesson==8 and label=="4b":
            page=53
        body = " ".join(text[match.end():entries[index+1].start() if index+1 < len(entries) else len(text)].split())
        if lesson==8:
            body=body.replace("\uf04a","(Zustimmung)").replace("\uf04b","(Vielleicht)").replace("\uf04c","(Absage)")
        model = model or body.startswith("(mögliche Antworten)")
        if model:
            body = body.removeprefix("(mögliche Antworten) ")
        add(f"coursebook-{page}", f"Exercise {previous} · Schon fertig?" if extension else f"Exercise {label}", body, 3 if lesson==8 and label in ("4b","6a","7a") else source_page, model)
        if lesson==11 and label in ('4a','4b','4c','6a','6b'):
            for partner in {'4a':[168,196],'4b':[196],'4c':[168],'6a':[169],'6b':[197]}[label]:
                add(f'coursebook-{partner}',f'Exercise {label} · Partner answers',body,source_page,note='Official partner-activity key. Match the Partner A or B label to your page.')
        if lesson==10 and label in ('9a','9b'):
            add('coursebook-'+('167' if label=='9a' else '195'),f'Exercise {label} · Partner answers',body,source_page,note='Publisher key for this partner table; worked item 1 is already printed in the book.')
        if lesson==7 and label=='8c':
            add('coursebook-162','Exercise 8c · Partner answers',body,source_page,note='Publisher key includes the missing information for both partner tables.')
            add('coursebook-194','Exercise 8c · Partner answers',body,source_page,note='Publisher key includes the missing information for both partner tables.')

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

add("workbook-66","Exercise 3","2 Verspätung · 3 Maschine · 4 Flughafen · 5 Kollegen · 6 Akku",15,source="workbook-transcript",note="Missing words in order from track 2/26. Flug is already filled in as the example.")
add("workbook-67","Exercise 5a","1 Hallo Lea. Holst du mich am Flughafen ab? → Gern. Wann kommst du an? → Um 19 Uhr. → Oh nein, tut mir leid. Da habe ich keine Zeit.\n2 Hallo Lisa. Der Flug hat Verspätung. → Oh nein. Wann landest du? → Ich komme um 19 Uhr in Frankfurt an. Kannst du mich abholen? → Natürlich hole ich dich ab. → Danke. Bis dann!",15,source="workbook-transcript",note="Dialogue order from tracks 2/27 and 2/28; compare with the lines to sort.")
add("workbook-69","Exercise 13 · Announcement facts","30 Minuten Verspätung · Ankunft in Leipzig auf Gleis 15, nicht auf Gleis 5",15,source="workbook-transcript",note="Facts stated in track 2/30. The writing task has no supplied complete model message; compose your own message using these facts.")

# End-of-lesson quick tests have a separate official key in the book appendix.
add("coursebook-41","Reading 1","a: „Kuli“ · b: Italienisch · c: Budapest",2)
add("coursebook-41","Film","10 Euro; nicht zu groß; nicht zu klein; nicht teuer",2)
add("coursebook-42","Listening 1","Florian: keine Kamera.\nHardy: ein Bett.\nLissi, Frida, Elli: keinen Tisch und keine Stühle.",2,note="Marlene: Freunde is already filled in on the exercise page.")
add("coursebook-44","Song 1","einen Partner · keinen Schlüssel · einen Stift · eine Lampe · keine Stühle · keinen Tisch · keine Bücher · keine Seife · eine Tasche · keine Uhr",2)
add("coursebook-161","Exercise 6a","Er hat eine Brille, einen Kalender, ein Handy, eine Tastatur, eine Maus.\nEr braucht eine Lampe, einen Stuhl, einen Bildschirm, Stifte, ein Telefon.",2,note="The partner activity continues Lesson 6, exercise 6, from coursebook p. 39.")
add("workbook-40","Skills test · Exercise 1","b Nein, ich brauche keine Tasche.\nc Ja, ich brauche eine Lampe.\nd Ich finde, die Kette ist schön. / Sie ist schön.\ne Wie viel / Was kostet sie / die Kette?\nf Das ist zu teuer. / Das finde ich teuer.\ng Ja, das ist gut.",118,True,"workbook-key")
add("workbook-40","Skills test · Exercise 2","A: 1 falsch · 2 richtig · 3 falsch · 4 richtig\nB: 5 falsch · 6 falsch · 7 falsch",118,source="workbook-key")
add("workbook-41","Skills test · Exercise 3","2 b · 3 c · 4 c · 5 b · 6 a · 7 c",118,source="workbook-key",note="Item 1 is the worked example.")
add("workbook-41","Skills test · Exercise 4","1 Guten Tag, Herr Holz. Mein Name ist Graham Scott.\n2 Ist Frau Müller da?\n3 Vielen Dank. Auf Wiederhören.",118,True,"workbook-key",note="Publisher model response; substitute your own name when practising.")
add("workbook-38","Review · Exercise 4","Was kann ich für Sie tun?\nIch suche einen Sessel.\nSchauen Sie doch mal. Der Sessel ist doch schön.\nJa, das finde ich auch. Er ist wirklich schön. Wie viel kostet er denn?\nSie haben Glück. Er kostet nur 40 Euro. Das ist ein Sonderangebot.\nOh, das ist aber günstig.",7,source="workbook-transcript",note="Complete source dialogue from track 1/48; use it to check the missing words.")
add("workbook-39","Review · Exercise 8","Nein, das ist kein Feuerzeug. Das ist ein Streichholz.\nNein, das ist kein Stuhl. Das ist ein Sessel.\nNein, das ist keine Tasche. Das ist eine Geldbörse.\nNein, das ist kein Tisch. Das ist ein Bett.",8,source="workbook-transcript",note="Responses after the example, track 1/50.")
add("workbook-39","Review · Exercise 11a","Tisch: aus Holz, braun, 56 Euro.\nStuhl: aus Plastik, grün, 10 Euro.\nRegal: aus Metall, schwarz, 23 Euro.",8,source="workbook-transcript",note="Explicit product details from track 1/52.")
add("workbook-43","Work & careers · Exercise 4","25 Bleistifte · 50 Kugelschreiber · 15 rote Notizbücher · 20 schwarze Mappen",10,source="workbook-transcript",note="Corrected order stated in track 1/62; not the caller's initial misread quantities.")
add("workbook-48","Exercise 6a","1 c · 2 d · 3 a · 4 b",10,source="workbook-transcript",note="Compliments and responses explicitly paired in track 2/01.")

add("workbook-90","Extra practice · Challenge 9","a 08:30 (example) · b 00:35 / 12:35 · c 06:30 / 18:30 · d 15:45 · e 01:45 / 13:45 · f 03:15 / 15:15",19,source="workbook-transcript",note="Track 2/56 gives these clock times. Alternatives retain the morning/evening ambiguity in colloquial times; item d explicitly says fifteen forty-five.")

add("coursebook-60","Reading 1","Gartenprojekte in der Stadt",3)
add("coursebook-60","Reading 2","Stadt: Großstadt, Geschäfte, Autos, Parkplätze.\nNatur: Pflanzen, Garten, Obst, Gemüse.",3)
add("coursebook-61","Film","Anton: Kaffee. Sofia: Orangensaft, Kaffee, Tee.",3)
add("coursebook-62","Listening","A: Sofia · B: Antonio · C: Maria",3)
add("coursebook-62","Film","C · A · A · A · B · A",3)
add("workbook-60","Skills test · Exercise 1","1b richtig · 2a falsch · 2b richtig · 2c falsch · 3a falsch · 3b richtig",118,source="workbook-key",note="The worked example is already marked on the exercise page.")
add("workbook-60","Skills test · Exercise 2","1b oft · 1c gern · 2a günstig · 2b Apfelkuchen · 3a viel · 3b Gitarre",118,source="workbook-key")
add("workbook-61","Skills test · Exercise 3","Hallo Hannes,\ndanke für deine E-Mail. Ich liebe Pommes. Aber ich mag keine Hamburger. Ich esse kein Fleisch. Ich trinke besonders gern Apfelsaft. Mein Hobby ist Fußball. Ich kann auch gut Basketball spielen.\nLiebe Grüße\nLucia",118,True,"workbook-key")
add("workbook-61","Skills test · Exercise 4","1 Hallo, hier ist Julia.\n2 Gut, danke.\n3 Gute Idee! Wann denn?\n4 Nein, da kann ich leider nicht.\n5 Ja, da kann ich.\n6 Bis dann. Tschüs.",118,True,"workbook-key")
add("workbook-58","Review · Exercise 3","Du kannst wirklich super Gitarre spielen!\nWow! – Du kannst ja super tanzen!\nDu kannst wirklich toll Fußball spielen!\nSie können ja super Tennis spielen.\nSie können aber gut malen!\nWow! – Du kannst wirklich super fotografieren!",11,source="workbook-transcript",note="Spoken responses after the example in track 2/08.")
add("workbook-58","Review · Exercise 5","Gehen wir ins Theater?\nVielleicht können wir ins Schwimmbad gehen?\nGehen wir ins Café?\nVielleicht können wir in eine Ausstellung gehen?\nGehen wir ins Museum?\nVielleicht können wir in eine Bar gehen?\nGehen wir ins Restaurant?\nVielleicht können wir ins Konzert gehen?",11,source="workbook-transcript",note="Spoken responses after the examples in track 2/09; transcript spans PDF pages 11–12.")
add("workbook-59","Review · Exercise 10","Salat mit Schinken · Tomatensuppe · Orangensaft · Schokoladenkuchen · eine Tasse Kaffee",12,source="workbook-transcript",note="Items explicitly ordered in track 2/10. Translate into your own language for this mediation exercise.")
add("workbook-62","Work & careers · Exercise 1b","1 Praxis Dr. Müller: Mittwoch, 9 Uhr.\n2 Benjamin Kleuber, Kiri AG: Montag, 10 Uhr, telefonieren.\n3 Felix: Freitag, 11:30 Uhr, Julias Büro.\n4 Johanna Mai: Donnerstag, 13 Uhr, ihr Büro; Angebot für die ÖkoBank planen.",12,source="workbook-transcript",note="Appointment facts explicitly confirmed in tracks 2/13–2/16; transcript PDF pages 12–13.")

quick = json.loads((ROOT / "research/book-answers/coursebook-quick-test-keys.json").read_text(encoding="utf-8"))
for lesson, (first, _) in starts.items():
    for label, text in zip(["Vocabulary", "Grammar", "Communication"], quick["lessons"][str(lesson)]):
        add(f"coursebook-{first+3}", f"Quick test · {label}", text, quick["printedPage"], note="Answers in printed order; worked examples may already be filled on the page.")
        answers[-1]["sourceTitle"] = "Kursbuch · Lösungen zu den Schnelltests"

book = json.loads((GEN / "interactive-book.json").read_text(encoding="utf-8"))
assert all(a["pageId"] in {p["id"] for p in book["pages"]} for a in answers)
assert all(a["text"] and a["exercise"] for a in answers)
(GEN / "book-answers.json").write_text(json.dumps(answers, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
audit = {"answers": len(answers), "pagesWithAnswers": len({a["pageId"] for a in answers}), "bySource": {s: sum(a["source"] == s for a in answers) for s in sorted({a["source"] for a in answers})}, "sources": [{"file": p.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in [KEY, AB, TRANSCRIPT, ROOT / quick["source"]]], "scope": "All entries in the supplied coursebook key for Lessons 1–11 and Magazines 1–3; coursebook quick-test answers in the appendix, p. 203; all Module 1–3 workbook skills-test answers; explicit responses in available Module 1–3 review and Lesson 7–10 and extra-practice transcripts."}
(ROOT / "research/book-answers/answer-source-audit.json").write_text(json.dumps(audit, indent=2)+"\n", encoding="utf-8")
print(json.dumps(audit))
