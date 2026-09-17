"""Build Lesson 5 study aids from the audited glossary inventory, KB 33–36 / AB 30–33."""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
examples = {
    "zeichnen": ("Ich zeichne.", "I am drawing."),
    "die Seife": ("Das ist die Seife.", "This is the soap."),
    "ein / eine": ("Das ist ein Buch. Das ist eine Tasche.", "This is a book. This is a bag."),
    "das Holz": ("Der Tisch ist aus Holz.", "The table is made of wood."),
    "das Papier": ("Das Buch ist aus Papier.", "The book is made of paper."),
    "das Metall": ("Die Uhr ist aus Metall.", "The watch is made of metal."),
    "das Plastik": ("Die Flasche ist aus Plastik.", "The bottle is made of plastic."),
    "das Glas": ("Die Flasche ist aus Glas.", "The bottle is made of glass."),
    "der Kunststoff": ("Die Brille ist aus Kunststoff.", "The glasses are made of plastic."),
    "sehen": ("Ich sehe etwas. Siehst du es auch?", "I see something. Do you see it too?"),
    "etwas": ("Ich sehe etwas.", "I see something."),
    "viele": ("Im Zimmer sind viele Dinge.", "There are many things in the room."),
    "und so weiter": ("Ein Buch, eine Tasche und so weiter.", "A book, a bag and so on."),
    "sagen": ("Tom sagt: Ja!", "Tom says: Yes!"),
    "fragen": ("Maja fragt: Ist es grün?", "Maja asks: Is it green?"),
    "antworten": ("Tom antwortet: Nein!", "Tom answers: No!"),
    "weiterfragen": ("Maja fragt weiter: Ist es blau?", "Maja keeps asking: Is it blue?"),
    "aha": ("Aha! Das ist ein Buch.", "Aha! That is a book."),
    "der Regen": ("Das ist Regen.", "That is rain."),
    "auf Deutsch": ("Wie heißt das auf Deutsch?", "What is that called in German?"),
    "nennen": ("Nennen Sie ein Wort.", "Name a word."),
    "bitten": ("Ich bitte um Wiederholung.", "I ask for a repetition."),
    "bitte": ("Noch einmal, bitte.", "Once again, please."),
    "Noch einmal, bitte.": ("Noch einmal, bitte.", "Once again, please."),
    "Wie schreibt man …?": ("Wie schreibt man Buch?", "How do you spell Buch?"),
    "schreiben": ("Wie schreibt man das?", "How do you spell that?"),
    "man": ("Wie schreibt man das?", "How does one spell that?"),
    "sich bedanken": ("Ich bedanke mich.", "I say thank you."),
    "danke schön": ("Danke schön!", "Thank you!"),
    "Bitte schön.": ("Bitte schön.", "You are welcome."),
    "Kein Problem.": ("Kein Problem.", "No problem."),
    "reagieren auf": ("Wie reagieren Sie auf die Frage?", "How do you respond to the question?"),
    "Ich weiß nicht.": ("Ich weiß nicht.", "I do not know."),
    "online": ("Ich bestelle online.", "I order online."),
    "bestellen": ("Was bestellst du?", "What are you ordering?"),
    "die Ware": ("Die Ware ist hier.", "The goods are here."),
    "die Sonne": ("Da ist die Sonne.", "There is the sun."),
    "dunkel-": ("Meine Jacke ist dunkelgrün.", "My jacket is dark green."),
    "hell-": ("Die Bürste ist hellbraun.", "The brush is light brown."),
    "ät": ("ät", "at sign (@)"),
}
words = []
with (ROOT / "research/lesson-expansion/lesson-05-vocabulary.tsv").open(encoding="utf8", newline="") as source:
    for row in csv.DictReader(source, delimiter="\t"):
        de, en = row["de"], row["en"]
        if de in examples:
            example, translation = examples[de]
        elif row["category"] == "Colours" and not de.startswith("die "):
            example, translation = f"Die Tasche ist {de}.", f"The bag is {en}."
        else:
            article, noun = de.split(" ", 1)
            example = f"Das ist {'eine' if article == 'die' else 'ein'} {noun}."
            meaning = en.split(" / ")[0]
            translation = f"This is {'an' if meaning[0].lower() in 'aeiou' else 'a'} {meaning}."
            if de in ["die Brille", "die Sonnenbrille"]:
                translation = f"This is a pair of {en}."
        slug = de.removeprefix("der ").removeprefix("die ").removeprefix("das ").lower()
        for a, b in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")]:
            slug = slug.replace(a, b)
        words.append({**row, "id": "l5-" + re.sub(r"[^a-z0-9]+", "-", slug).strip("-"), "example": example, "translation": translation})
words.append({"id":"l5-kein-keine","de":"kein / keine","en":"no / not a","plural":"","category":"Grammar","example":"Das ist keine Uhr.","translation":"That is not a clock."})

concepts = [
    {"id":"l5-ein","title":"Introduce something: ein / eine","de":"der → ein · das → ein · die → eine","en":"Use ein with masculine and neuter singular nouns and eine with feminine singular nouns when identifying something. These are nominative forms after Das ist … .","examples":["Das ist ein Tisch.","Das ist ein Buch.","Das ist eine Uhr."],"source":"KB 34; AB 30, exercises 1–3"},
    {"id":"l5-kein","title":"Correct the guess: kein / keine","de":"Ist das ein Tisch? Nein, das ist kein Tisch.","en":"Kein follows the ein pattern: kein Tisch, kein Buch, keine Uhr. Use nicht for an adjective or other negated statement: Das Bild ist nicht schön. Plural nouns use keine: keine Kinder.","examples":["Das ist keine Tasche.","Das ist kein Handy.","Das Sofa ist nicht günstig."],"source":"KB 34; AB 30–31, exercises 4–6"},
    {"id":"l5-reference","title":"A new object → the same object","de":"Das ist eine Uhr. Die Uhr ist schön.","en":"Ein/eine introduces an object. Der/das/die refers to an identified or specific object. Then er/es/sie can replace it. Keep the noun's grammatical gender through the whole chain.","examples":["Das ist ein Buch. Das Buch ist gut.","Das ist eine Tasche. Sie ist rot."],"source":"AB 30, exercises 2–3"},
    {"id":"l5-material","title":"Made of: aus + material","de":"Die Flasche ist aus Glas. Sie ist grün.","en":"Use aus with the material name: aus Holz, aus Papier, aus Metall, aus Plastik, aus Glas. These material names normally have no article in this construction. Describe the colour after ist without changing its ending.","examples":["Der Tisch ist aus Holz.","Die Uhr ist aus Metall.","Die Tasche ist schwarz."],"source":"KB 34–35; AB 31–32"},
    {"id":"l5-sehen","title":"sehen: the vowel grows to ie","de":"ich sehe · du siehst · er / es / sie sieht","en":"Only du and er/es/sie change e to ie. The other present-tense forms keep seh-: wir sehen, ihr seht, sie/Sie sehen.","examples":["Siehst du es auch?","Ich sehe etwas.","Sie sieht eine Flasche."],"source":"KB 35, exercise 4"},
    {"id":"l5-help","title":"Ask, repeat, spell, thank","de":"Wie heißt das auf Deutsch? Wie schreibt man das?","en":"Learn the requests as complete phrases. Man means people in general and uses a third-person singular verb: man schreibt. It is different from der Mann (the man).","examples":["Noch einmal, bitte.","Wie bitte?","Danke schön. — Bitte schön."],"source":"KB 35; AB 32–33"},
    {"id":"l5-form","title":"Read a form and spell your email","de":"Vorname · Name · Straße · Hausnummer · Postleitzahl · Ort","en":"Anrede asks for the form of address. Say Punkt for a dot, Unterstrich for an underscore and ät for @ when spelling an email address. Product forms also ask for Farbe, Menge and Preis.","examples":["Wie ist deine E-Mail-Adresse?","Die Jacke ist dunkelgrün.","Die Bürste ist hellbraun."],"source":"KB 36; AB 33"},
]
verb_rows = [
    ("sehen","to see",["sehe","siehst","sieht","sehen","seht","sehen"],"e → ie only in du and er/es/sie.","core"),
    ("zeichnen","to draw",["zeichne","zeichnest","zeichnet","zeichnen","zeichnet","zeichnen"],"Keep the extra e: du zeichnest, er zeichnet.","classroom"),
    ("fragen","to ask",["frage","fragst","fragt","fragen","fragt","fragen"],"Regular present endings.","core"),
    ("antworten","to answer",["antworte","antwortest","antwortet","antworten","antwortet","antworten"],"The -t stem needs e before -st and -t.","core"),
    ("sagen","to say",["sage","sagst","sagt","sagen","sagt","sagen"],"Regular present endings.","core"),
    ("schreiben","to write / spell",["schreibe","schreibst","schreibt","schreiben","schreibt","schreiben"],"Man uses the third-person singular: man schreibt.","core"),
    ("nennen","to name",["nenne","nennst","nennt","nennen","nennt","nennen"],"Keep the double n in the stem.","classroom"),
    ("bitten","to request",["bitte","bittest","bittet","bitten","bittet","bitten"],"Use the fixed expression um Wiederholung bitten. Do not confuse bitten with bieten.","phrase"),
    ("bestellen","to order",["bestelle","bestellst","bestellt","bestellen","bestellt","bestellen"],"The prefix be- stays attached: ich bestelle.","core"),
    ("weiterfragen","to keep asking",["frage weiter","fragst weiter","fragt weiter","fragen weiter","fragt weiter","fragen weiter"],"Reference forms for weiter (fragen) in the glossary. In a main clause, weiter goes at the end.","phrase"),
    ("sich bedanken","to say thank you",["bedanke mich","bedankst dich","bedankt sich","bedanken uns","bedankt euch","bedanken sich"],"Learn Danke schön as the core phrase; this full reflexive pattern is reference support.","phrase"),
    ("reagieren","to react",["reagiere","reagierst","reagiert","reagieren","reagiert","reagieren"],"Reference forms for the instruction reagieren auf.","classroom"),
]
phrases = [
    ("Was ist das?","What is that?"),("Ist das ein Tisch?","Is that a table?"),("Nein, das ist kein Tisch.","No, that is not a table."),
    ("Es ist aus Glas und es ist grün.","It is made of glass and it is green."),("Siehst du es auch?","Do you see it too?"),
    ("Entschuldigung, wie heißt das auf Deutsch?","Excuse me, what is that called in German?"),("Wie schreibt man das?","How do you spell that?"),
    ("Noch einmal, bitte.","Once again, please."),("Wie bitte?","Pardon?"),("Danke schön.","Thank you."),("Bitte schön.","You are welcome."),
    ("Kein Problem.","No problem."),("Was bestellst du?","What are you ordering?"),("Wie ist deine E-Mail-Adresse?","What is your email address?")
]
quiz = [
    ("Das ist ___ Uhr.",["ein","eine","einen"],"eine","Die Uhr is feminine; after Das ist use eine."),
    ("Das ist ___ Buch.",["eine","ein","einen"],"ein","Das Buch is neuter: ein Buch."),
    ("Ist das eine Tasche? Nein, das ist ___ Tasche.",["kein","keine","nicht"],"keine","Negate a feminine noun with keine."),
    ("Das Sofa ist ___ günstig.",["kein","keine","nicht"],"nicht","Nicht negates the adjective günstig."),
    ("Die Flasche ist ___ Glas.",["aus","von","mit"],"aus","Aus + material means made of."),
    ("___ du es auch?",["Sehst","Siehst","Seht"],"Siehst","Du siehst changes e to ie."),
    ("How do you ask someone to repeat?",["Noch einmal, bitte.","Kein Problem.","Ich bin grün."],"Noch einmal, bitte.","This polite phrase means once again, please."),
    ("The symbol _ in an email address is …",["Punkt","Unterstrich","ät"],"Unterstrich","Unterstrich = underscore; Punkt = dot; ät = @.")
]
unit = {"number":5,"summary":"Identify everyday objects, describe colours and materials, ask for words and fill in a form.","words":words,"concepts":concepts,"verbs":[{"verb":v,"meaning":m,"forms":f,"tip":t,"priority":p} for v,m,f,t,p in verb_rows],"phrases":[{"de":d,"en":e} for d,e in phrases],"quiz":[{"q":q,"options":o,"answer":a,"why":w} for q,o,a,w in quiz]}
assert len({w["id"] for w in words}) == len(words)
(ROOT / "platform/apps/web/generated/lesson-five-study.json").write_text(json.dumps(unit,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(json.dumps({"lesson":5,"words":len(words),"concepts":len(concepts),"verbs":len(verb_rows),"phrases":len(phrases),"quiz":len(quiz)}))
