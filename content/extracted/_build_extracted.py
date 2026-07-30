"""Build content/extracted/*.json from PDF raw text + Notes."""
import json
import shutil
from pathlib import Path

BASE = Path(r"E:\claude-cursor\side projects\German learning")
OUT = BASE / "content" / "extracted"
WEB = BASE / "web" / "data"

GENDER_HINT = {"der": "blue", "die": "red", "das": "green", "plural": "purple"}


def gender_from_article(article: str) -> dict:
    a = article.strip().lower()
    if a == "der":
        return {"article": "der", "gender": "masculine", "genderHint": "blue"}
    if a == "die":
        return {"article": "die", "gender": "feminine", "genderHint": "red"}
    if a == "das":
        return {"article": "das", "gender": "neuter", "genderHint": "green"}
    return {}


def noun(de: str, en: str, article: str | None = None, plural: str | None = None, category: str = "general"):
    item = {"de": de, "en": en, "category": category, "lesson": 2, "source": ["glossary", "kursbuch"]}
    if article:
        item.update(gender_from_article(article))
        item["de"] = f"{article} {de}" if not de.startswith(article) else de
    if plural:
        item["plural"] = plural
        item["pluralGenderHint"] = "purple"
    return item


# --- lesson1.json (from Lesson 1 txt + web schema) ---
lesson1 = {
    "id": "lesson-01",
    "title": {"de": "Ich hei?e Miriam.", "en": "My name is Miriam."},
    "cefr": "A1",
    "module": 1,
    "sources": ["Lesson 1_260730_050234.txt", "Momente_A1_1_KB_Glossar_Deutsch_Spanisch.pdf"],
    "vocabulary": [
        {"de": "Deutschland", "en": "Germany", "category": "countries"},
        {"de": "?sterreich", "en": "Austria", "category": "countries"},
        {"de": "Spanien", "en": "Spain", "category": "countries"},
        {"de": "Frankreich", "en": "France", "category": "countries"},
        {"de": "Eritrea", "en": "Eritrea", "category": "countries"},
        {"de": "die Schweiz", "en": "Switzerland", "article": "die", "genderHint": "red", "category": "countries"},
        {"de": "die T?rkei", "en": "Turkey", "article": "die", "genderHint": "red", "category": "countries"},
        {"de": "die USA", "en": "USA", "article": "die", "genderHint": "red", "category": "countries"},
        {"de": "A, B, C... Z, ?, ?, ?, ?", "en": "Alphabet pronunciation", "category": "alphabet"},
        {"de": "aus", "en": "from", "category": "preposition"},
    ],
    "phrases": [
        {"de": "Hallo", "en": "Hello", "category": "greetings"},
        {"de": "Guten Morgen", "en": "Good morning", "category": "greetings"},
        {"de": "Guten Tag", "en": "Good day / Hello", "category": "greetings"},
        {"de": "Guten Abend", "en": "Good evening", "category": "greetings"},
        {"de": "Tsch?s", "en": "Bye", "category": "goodbyes"},
        {"de": "Auf Wiedersehen", "en": "Goodbye", "category": "goodbyes"},
        {"de": "Gute Nacht", "en": "Good night", "category": "goodbyes"},
        {"de": "Super!", "en": "Great!", "category": "wellbeing"},
        {"de": "Sehr gut, danke.", "en": "I am doing very well, thank you.", "category": "wellbeing"},
        {"de": "Gut, danke.", "en": "I'm fine, thank you.", "category": "wellbeing"},
        {"de": "Es geht.", "en": "Not too bad.", "category": "wellbeing"},
        {"de": "Nicht so gut.", "en": "Not so well.", "category": "wellbeing"},
        {"de": "Gut, danke. Und dir?", "en": "Good, thanks. And you?", "category": "wellbeing"},
        {"de": "Wie hei?t du?", "en": "What's your name? (informal)", "category": "questions"},
        {"de": "Wie hei?en Sie?", "en": "What is your name? (formal)", "category": "questions"},
        {"de": "Ich hei?e Miriam.", "en": "I am called Miriam.", "category": "answers"},
        {"de": "Mein Name ist Vera.", "en": "My name is Vera.", "category": "answers"},
        {"de": "Wer ist das?", "en": "Who is that?", "category": "questions"},
        {"de": "Wer sind Sie?", "en": "Who are you? (formal)", "category": "questions"},
        {"de": "Das ist Sergej.", "en": "This is Sergej.", "category": "answers"},
        {"de": "Ich bin Rita.", "en": "I am Rita.", "category": "answers"},
        {"de": "Woher kommst du?", "en": "Where are you from? (informal)", "category": "questions"},
        {"de": "Woher kommen Sie?", "en": "Where are you from? (formal)", "category": "questions"},
        {"de": "Ich komme aus Deutschland.", "en": "I come from Germany.", "category": "answers"},
        {"de": "Sie kommt aus Eritrea.", "en": "She comes from Eritrea.", "category": "answers"},
        {"de": "Wie geht's dir?", "en": "How are you? (informal)", "category": "questions"},
        {"de": "Wie geht's Ihnen?", "en": "How are you? (formal)", "category": "questions"},
    ],
    "grammar": [
        {"id": "pronouns", "topic": "Personal pronouns", "items": [
            {"de": "ich", "en": "I"}, {"de": "du", "en": "you (informal)"},
            {"de": "er / sie / es", "en": "he / she / it"}, {"de": "Sie", "en": "you (formal)"},
        ]},
        {"id": "preposition-aus", "topic": "Preposition aus", "rule": "aus + country (no article for most countries)", "example": "Ich komme aus Deutschland."},
    ],
    "verbs": [
        {"infinitive": "sein", "en": "to be", "lesson": 1},
        {"infinitive": "hei?en", "en": "to be called", "lesson": 1},
        {"infinitive": "kommen", "en": "to come", "lesson": 1},
        {"infinitive": "lernen", "en": "to learn", "lesson": 1},
    ],
    "dialogues": [],
    "workbook_refs": [
        {"ref": "AB-01-1", "kb": 2, "topic": "Greetings, hei?en", "abPage": 8},
        {"ref": "AB-01-3", "kb": 2, "topic": "Names listening", "abPage": 8},
        {"ref": "AB-01-4", "kb": 3, "topic": "Wie geht's dir?", "abPage": 8},
        {"ref": "AB-01-5", "kb": 4, "topic": "Woher kommst du?", "abPage": 9},
        {"ref": "AB-01-9", "kb": 9, "topic": "Dialogue names/origins", "abPage": 10, "audio": "l1-dialogue"},
    ],
    "links": {},
}

# --- lesson2.json ---

# Fix noun helper - I overloaded it with berufe link; rewrite vocab building cleanly
def build_vocab():
    items = []
    raw = [
        ("das Jahr", "year", "das", "die Jahre", "time", None),
        ("alt", "old (age)", None, None, "adjective", None),
        ("verheiratet", "married", None, None, "familienstand", None),
        ("geschieden", "divorced", None, None, "familienstand", None),
        ("das Kind", "child", "das", "die Kinder", "family", None),
        ("kein / keine", "no / not any", None, None, "grammar", None),
        ("der Single", "single (person)", "der", None, "familienstand", None),
        ("allein", "alone", None, None, "adverb", None),
        ("zusammen", "together", None, None, "adverb", None),
        ("das Interview", "interview", "das", "die Interviews", "communication", None),
        ("der Partner", "partner (m)", "der", "die Partner", "family", None),
        ("die Partnerin", "partner (f)", "die", "die Partnerinnen", "family", None),
        ("der Satz", "sentence", "der", "die S?tze", "grammar", None),
        ("der Punkt", "period / point", "der", "die Punkte", "grammar", None),
        ("die Zahl", "number", "die", "die Zahlen", "numbers", None),
        ("das R?tsel", "riddle", "das", None, "general", None),
        ("richtig", "correct", None, None, "adjective", None),
        ("falsch", "incorrect", None, None, "adjective", None),
        ("beruflich", "professionally", None, None, "adverb", None),
        ("der Beruf", "profession", "der", "die Berufe", "berufe", None),
        ("der Job", "job", "der", "die Jobs", "berufe", None),
        ("die Stelle", "position / job", "die", "die Stellen", "berufe", None),
        ("die Firma", "company", "die", "die Firmen", "work", None),
        ("die Speditionsfirma", "shipping company", "die", "die Speditionsfirmen", "work", None),
        ("die Ausbildung", "vocational training", "die", "die Ausbildungen", "education", None),
        ("das Praktikum", "internship", "das", "die Praktika", "education", None),
        ("das Studium", "university studies", "das", None, "education", None),
        ("die Herkunft", "origin", "die", None, "personal", None),
        ("der Wohnort", "place of residence", "der", "die Wohnorte", "personal", None),
        ("das Alter", "age", "das", None, "personal", None),
        ("der Familienstand", "marital status", "der", None, "personal", None),
        ("der Paketzusteller", "parcel delivery person (m)", "der", None, "berufe", 6),
        ("die Paketzustellerin", "parcel delivery person (f)", "die", "die Paketzustellerinnen", "berufe", None),
        ("der Friseur", "hairdresser (m)", "der", "die Friseure", "berufe", 5),
        ("die Friseurin", "hairdresser (f)", "die", "die Friseurinnen", "berufe", 5),
        ("der Kellner", "waiter", "der", "die Kellner", "berufe", 17),
        ("die Kellnerin", "waitress", "die", "die Kellnerinnen", "berufe", 17),
        ("der Ingenieur", "engineer (m)", "der", "die Ingenieure", "berufe", 24),
        ("die Ingenieurin", "engineer (f)", "die", "die Ingenieurinnen", "berufe", 24),
        ("der Kfz-Mechatroniker", "auto mechatronics tech (m)", "der", None, "berufe", None),
        ("die Kfz-Mechatronikerin", "auto mechatronics tech (f)", "die", "die Kfz-Mechatronikerinnen", "berufe", None),
        ("der Student", "student (m)", "der", "die Studenten", "berufe", None),
        ("die Studentin", "student (f)", "die", "die Studentinnen", "berufe", None),
        ("der Journalist", "journalist (m)", "der", "die Journalisten", "berufe", 46),
        ("die Journalistin", "journalist (f)", "die", "die Journalistinnen", "berufe", 46),
        ("der Architekt", "architect (m)", "der", "die Architekten", "berufe", 12),
        ("die Architektin", "architect (f)", "die", "die Architektinnen", "berufe", 12),
        ("der Arzt", "doctor (m)", "der", "die ?rzte", "berufe", 23),
        ("die ?rztin", "doctor (f)", "die", "die ?rztinnen", "berufe", 23),
        ("der Lehrer", "teacher (m)", "der", "die Lehrer", "berufe", 13),
        ("die Lehrerin", "teacher (f)", "die", "die Lehrerinnen", "berufe", 13),
        ("der Verk?ufer", "shop assistant (m)", "der", "die Verk?ufer", "berufe", 19),
        ("die Verk?uferin", "shop assistant (f)", "die", "die Verk?uferinnen", "berufe", 19),
        ("der Sch?ler", "pupil (m)", "der", "die Sch?ler", "education", None),
        ("die Sch?lerin", "pupil (f)", "die", "die Sch?lerinnen", "education", None),
        ("der Rentner", "retiree (m)", "der", "die Rentner", "berufe", None),
        ("die Rentnerin", "retiree (f)", "die", "die Rentnerinnen", "berufe", None),
        ("die Krankenschwester", "nurse (f)", "die", "die Krankenschwestern", "berufe", 28),
        ("das Tier", "animal", "das", "die Tiere", "general", None),
        ("der Tierarzt", "veterinarian (m)", "der", "die Tier?rzte", "berufe", 34),
        ("die Tier?rztin", "veterinarian (f)", "die", "die Tier?rztinnen", "berufe", 34),
        ("der Schauspieler", "actor", "der", "die Schauspieler", "berufe", 20),
        ("die Schauspielerin", "actress", "die", "die Schauspielerinnen", "berufe", 20),
        ("der S?nger", "singer (m)", "der", "die S?nger", "berufe", 33),
        ("die S?ngerin", "singer (f)", "die", "die S?ngerinnen", "berufe", 33),
        ("die Oper", "opera", "die", "die Opern", "culture", None),
        ("als", "as (profession)", None, None, "preposition", None),
        ("bei", "at / for (company)", None, None, "preposition", None),
        ("in", "in", None, None, "preposition", None),
        ("f?r", "for", None, None, "preposition", None),
        ("vielen Dank", "thank you very much", None, None, "phrase", None),
        ("Schon fertig?", "Already finished?", None, None, "phrase", None),
        ("null", "zero", None, None, "numbers", None),
        ("eins", "one", None, None, "numbers", None),
        ("zw?lf", "twelve", None, None, "numbers", None),
        ("vierzehn", "fourteen", None, None, "numbers", None),
        ("achtzehn", "eighteen", None, None, "numbers", None),
        ("neunzehn", "nineteen", None, None, "numbers", None),
        ("zwanzig", "twenty", None, None, "numbers", None),
        ("einundzwanzig", "twenty-one", None, None, "numbers", None),
        ("drei?ig", "thirty", None, None, "numbers", None),
        ("vierzig", "forty", None, None, "numbers", None),
        ("f?nfzig", "fifty", None, None, "numbers", None),
        ("sechzig", "sixty", None, None, "numbers", None),
        ("achtzig", "eighty", None, None, "numbers", None),
        ("neunzig", "ninety", None, None, "numbers", None),
        ("(ein)hundert", "one hundred", None, None, "numbers", None),
        ("Mexiko", "Mexico", None, None, "countries", None),
        ("Portugal", "Portugal", None, None, "countries", None),
        ("Augsburg", "Augsburg", None, None, "cities", None),
        ("M?nchen", "Munich", None, None, "cities", None),
    ]
    for de, en, art, pl, cat, berufe_id in raw:
        item = {"de": de, "en": en, "category": cat, "lesson": 2, "source": ["glossary", "kursbuch"]}
        if art:
            item.update(gender_from_article(art))
        if pl:
            item["plural"] = pl
            item["pluralGenderHint"] = "purple"
        if berufe_id:
            item["berufeRef"] = berufe_id
        items.append(item)
    return items

lesson2 = {
    "id": "lesson-02",
    "title": {"de": "Was macht ihr beruflich?", "en": "What do you do professionally?"},
    "cefr": "A1",
    "module": 1,
    "sources": [
        "Momente_A1_1_KB_Glossar_Deutsch_Spanisch.pdf",
        "A1-KB-momente.pdf",
        "Momente A1.1 AB_7.pdf",
        "Momente_A1_1_KB_Loesungen.pdf",
        "Notes_260730_040559.txt",
    ],
    "objectives": [
        "Talk about profession and personal details",
        "Name place of residence",
        "Use numbers 1?100",
        "Conjugate wohnen, leben, haben, sein, arbeiten (singular and plural)",
        "Use negation with nicht / kein",
        "Use prepositions als, bei, in",
        "Form feminine professions with -in",
    ],
    "vocabulary": build_vocab(),
    "phrases": [
        {"de": "Wie alt seid ihr?", "en": "How old are you (pl.)?", "category": "questions", "formality": "informal"},
        {"de": "Ich bin 28 Jahre alt.", "en": "I am 28 years old.", "category": "answers"},
        {"de": "Lebt ihr zusammen?", "en": "Do you live together?", "category": "questions"},
        {"de": "Ja, wir leben zusammen.", "en": "Yes, we live together.", "category": "answers"},
        {"de": "Wir sind nicht verheiratet.", "en": "We are not married.", "category": "answers"},
        {"de": "Wir haben keine Kinder.", "en": "We have no children.", "category": "answers"},
        {"de": "Wo wohnt ihr?", "en": "Where do you (pl.) live?", "category": "questions"},
        {"de": "Wir wohnen in M?nchen.", "en": "We live in Munich.", "category": "answers"},
        {"de": "Was macht ihr beruflich?", "en": "What do you do professionally?", "category": "questions"},
        {"de": "Was bist du von Beruf?", "en": "What is your profession? (informal)", "category": "questions"},
        {"de": "Was sind Sie von Beruf?", "en": "What is your profession? (formal)", "category": "questions"},
        {"de": "Und was seid ihr von Beruf?", "en": "And what are your professions? (pl.)", "category": "questions"},
        {"de": "Was ist sie von Beruf?", "en": "What is her profession?", "category": "questions"},
        {"de": "Ich bin Paketzusteller und arbeite bei HotSped.", "en": "I am a parcel delivery person and work at HotSped.", "category": "answers"},
        {"de": "Ich habe zwei Jobs.", "en": "I have two jobs.", "category": "answers"},
        {"de": "Ich arbeite als Friseurin und als Kellnerin.", "en": "I work as a hairdresser and as a waitress.", "category": "answers"},
        {"de": "Vielen Dank f?r das Interview!", "en": "Thank you very much for the interview!", "category": "communication"},
        {"de": "Ich bin ? von Beruf.", "en": "I am a ? by profession.", "category": "patterns"},
        {"de": "Ich arbeite als ?", "en": "I work as a ?", "category": "patterns"},
        {"de": "Ich habe eine Stelle / einen Job als ?", "en": "I have a position / job as ?", "category": "patterns"},
        {"de": "Ich studiere Medizin.", "en": "I study medicine.", "category": "patterns"},
        {"de": "Ich bin Sch?ler. / Studentin. / Kellner. / Rentnerin.", "en": "I am a pupil / student / waiter / retiree.", "category": "patterns"},
        {"de": "Ich mache eine Ausbildung / ein Praktikum als ?", "en": "I am doing training / an internship as ?", "category": "patterns"},
        {"de": "Ich arbeite im Moment nicht.", "en": "I am not working at the moment.", "category": "patterns"},
        {"de": "Ich bin Single und habe keine Kinder.", "en": "I am single and have no children.", "category": "answers"},
        {"de": "Ich wohne jetzt in Augsburg.", "en": "I now live in Augsburg.", "category": "answers"},
        {"de": "Ich habe einen Job als Verk?ufer.", "en": "I have a job as a shop assistant.", "category": "answers"},
        {"de": "Was machst du beruflich?", "en": "What do you do professionally? (sg.)", "category": "questions"},
        {"de": "Ich bin ?rztin. Was bist du von Beruf?", "en": "I am a doctor. What is your profession?", "category": "dialogue-cue"},
        {"de": "Du bist Paketzusteller!", "en": "You are a parcel delivery person!", "category": "guessing-game"},
        {"de": "Sammeln Sie mehr Berufe.", "en": "Collect more professions.", "category": "instruction"},
    ],
    "grammar": [
        {
            "id": "konjugation-plural",
            "topic": "Conjugation plural (wir / ihr / sie)",
            "rule": "Plural subjects use distinct verb forms; ihr often matches er/sie/es for some verbs.",
            "table": {
                "wohnen": {"wir": "wohnen", "ihr": "wohnt", "sie": "wohnen"},
                "leben": {"wir": "leben", "ihr": "lebt", "sie": "leben"},
                "sein": {"wir": "sind", "ihr": "seid", "sie": "sind"},
                "haben": {"wir": "haben", "ihr": "habt", "sie": "haben"},
            },
            "source": ["kursbuch", "arbeitsbuch"],
        },
        {
            "id": "konjugation-arbeiten",
            "topic": "Conjugation arbeiten",
            "rule": "Stem + t for er/sie/es; -est for du.",
            "table": {
                "ich": "arbeite", "du": "arbeitest", "er/sie/es": "arbeitet",
                "wir": "arbeiten", "ihr": "arbeitet", "sie/Sie": "arbeiten",
            },
            "source": ["kursbuch"],
        },
        {
            "id": "negation-nicht",
            "topic": "Negation mit nicht",
            "rule": "Place nicht after the verb or verb phrase to negate.",
            "examples": [
                "Wir sind nicht verheiratet.",
                "Wir haben keine Kinder.",
                "Sie hei?t nicht Natalie. Sie hei?t Natascha.",
            ],
            "source": ["kursbuch", "arbeitsbuch"],
        },
        {
            "id": "praepositionen-beruf",
            "topic": "Prepositions als, bei, in",
            "rule": "als + profession (no article); bei + company; in + city.",
            "examples": [
                "Ich arbeite als Friseurin.",
                "Ich arbeite bei HotSped.",
                "Wir wohnen in M?nchen.",
            ],
            "source": ["glossary", "kursbuch"],
        },
        {
            "id": "wortbildung-in",
            "topic": "Feminine professions (-in)",
            "rule": "Add -in for feminine form; plural often -innen.",
            "examples": [
                {"masc": "der Architekt", "fem": "die Architektin", "femPl": "die Architektinnen"},
                {"masc": "der Verk?ufer", "fem": "die Verk?uferin", "femPl": "die Verk?uferinnen"},
            ],
            "source": ["kursbuch"],
        },
        {
            "id": "pronouns-wir-ihr",
            "topic": "Pronouns wir / ihr",
            "items": [
                {"de": "wir", "en": "we"},
                {"de": "ihr", "en": "you (pl. informal)"},
                {"de": "sie (Pl.)", "en": "they"},
            ],
            "source": ["kursbuch"],
        },
        {
            "id": "zahlen-1-100",
            "topic": "Numbers 1?100",
            "rule": "Compound numbers: ones + und + tens (einundzwanzig); -zehn vs -zig pattern.",
            "examples": ["14 = vierzehn", "18 = achtzehn", "21 = einundzwanzig", "35 = f?nfunddrei?ig", "100 = (ein)hundert"],
            "source": ["kursbuch", "loesungen"],
        },
        {
            "id": "sein-ohne-artikel-beruf",
            "topic": "Profession after sein (no article)",
            "rule": "After sein, profession nouns typically appear without an article.",
            "example": "Ich bin Ingenieur. / Ich bin ?rztin.",
            "source": ["kursbuch", "prd"],
        },
    ],
    "verbs": [
        {
            "infinitive": "wohnen",
            "en": "to live / reside",
            "lesson": 2,
            "conjugations": [
                {"pronoun": "ich", "form": "wohne"}, {"pronoun": "du", "form": "wohnst"},
                {"pronoun": "er/sie/es", "form": "wohnt"}, {"pronoun": "wir", "form": "wohnen"},
                {"pronoun": "ihr", "form": "wohnt"}, {"pronoun": "sie/Sie", "form": "wohnen"},
            ],
        },
        {
            "infinitive": "leben",
            "en": "to live",
            "lesson": 2,
            "conjugations": [
                {"pronoun": "ich", "form": "lebe"}, {"pronoun": "du", "form": "lebst"},
                {"pronoun": "er/sie/es", "form": "lebt"}, {"pronoun": "wir", "form": "leben"},
                {"pronoun": "ihr", "form": "lebt"}, {"pronoun": "sie/Sie", "form": "leben"},
            ],
        },
        {
            "infinitive": "haben",
            "en": "to have",
            "lesson": 2,
            "note": "Plural forms introduced in L2",
            "conjugations": [
                {"pronoun": "ich", "form": "habe"}, {"pronoun": "du", "form": "hast"},
                {"pronoun": "er/sie/es", "form": "hat"}, {"pronoun": "wir", "form": "haben"},
                {"pronoun": "ihr", "form": "habt"}, {"pronoun": "sie/Sie", "form": "haben"},
            ],
        },
        {
            "infinitive": "sein",
            "en": "to be",
            "lesson": 2,
            "note": "Plural forms introduced in L2",
            "conjugations": [
                {"pronoun": "ich", "form": "bin"}, {"pronoun": "du", "form": "bist"},
                {"pronoun": "er/sie/es", "form": "ist"}, {"pronoun": "wir", "form": "sind"},
                {"pronoun": "ihr", "form": "seid"}, {"pronoun": "sie/Sie", "form": "sind"},
            ],
        },
        {
            "infinitive": "arbeiten",
            "en": "to work",
            "lesson": 2,
            "conjugations": [
                {"pronoun": "ich", "form": "arbeite"}, {"pronoun": "du", "form": "arbeitest"},
                {"pronoun": "er/sie/es", "form": "arbeitet"}, {"pronoun": "wir", "form": "arbeiten"},
                {"pronoun": "ihr", "form": "arbeitet"}, {"pronoun": "sie/Sie", "form": "arbeiten"},
            ],
        },
        {
            "infinitive": "machen",
            "en": "to do / make",
            "lesson": 2,
            "conjugations": [
                {"pronoun": "ich", "form": "mache"}, {"pronoun": "du", "form": "machst"},
                {"pronoun": "er/sie/es", "form": "macht"},
            ],
        },
        {
            "infinitive": "studieren",
            "en": "to study (university)",
            "lesson": 2,
            "conjugations": [
                {"pronoun": "ich", "form": "studiere"}, {"pronoun": "du", "form": "studierst"},
                {"pronoun": "er/sie/es", "form": "studiert"},
            ],
        },
    ],
    "dialogues": [
        {
            "id": "lydia-arno-interview",
            "title": "Interview ? Lydia und Arno",
            "source": "Kursbuch KB 2, AB 1?3",
            "audio": "l2-berufe-dialogue",
            "lines": [
                {"speaker": "Q", "de": "Wie hei?t du?", "en": "What's your name?"},
                {"speaker": "Lydia", "de": "Ich hei?e Lydia. Und das ist Arno, mein Partner.", "en": "My name is Lydia. And this is Arno, my partner."},
                {"speaker": "Q", "de": "Und wie alt seid ihr?", "en": "And how old are you?"},
                {"speaker": "Lydia", "de": "Ich bin 28 Jahre alt.", "en": "I am 28 years old."},
                {"speaker": "Arno", "de": "Ich bin auch 28.", "en": "I am also 28."},
                {"speaker": "Q", "de": "Lebt ihr zusammen?", "en": "Do you live together?"},
                {"speaker": "Lydia", "de": "Ja, wir leben zusammen.", "en": "Yes, we live together."},
                {"speaker": "Arno", "de": "Aber wir sind nicht verheiratet ?", "en": "But we are not married ?"},
                {"speaker": "Lydia", "de": "? und wir haben keine Kinder.", "en": "? and we have no children."},
                {"speaker": "Q", "de": "Wo wohnt ihr?", "en": "Where do you live?"},
                {"speaker": "Arno", "de": "Wir wohnen in M?nchen.", "en": "We live in Munich."},
            ],
        },
        {
            "id": "lydia-arno-berufe",
            "title": "Was macht ihr beruflich?",
            "source": "Kursbuch KB 5?6, AB 13",
            "audio": "l2-berufe-6a",
            "lines": [
                {"speaker": "Q", "de": "Was macht ihr beruflich?", "en": "What do you do professionally?"},
                {"speaker": "Arno", "de": "Ich bin Paketzusteller und arbeite bei HotSped.", "en": "I am a parcel delivery person and work at HotSped."},
                {"speaker": "Q", "de": "HotSped ist eine Speditionsfirma, oder?", "en": "HotSped is a shipping company, right?"},
                {"speaker": "Arno", "de": "Richtig!", "en": "Correct!"},
                {"speaker": "Q", "de": "Und was arbeitest du, Lydia?", "en": "And what do you do, Lydia?"},
                {"speaker": "Lydia", "de": "Ich habe zwei Jobs. Ich arbeite als Friseurin und als Kellnerin.", "en": "I have two jobs. I work as a hairdresser and as a waitress."},
                {"speaker": "Q", "de": "Vielen Dank f?r das Interview!", "en": "Thank you very much for the interview!"},
            ],
        },
        {
            "id": "andreas-profil",
            "title": "Andreas Hader ? Internetprofil",
            "source": "Kursbuch KB 7, AB 14",
            "lines": [
                {"speaker": "Andreas", "de": "Ich hei?e Andreas Hader. Ich bin 21 Jahre alt und komme aus ?sterreich.", "en": "My name is Andreas Hader. I am 21 years old and come from Austria."},
                {"speaker": "Andreas", "de": "Ich wohne jetzt in Augsburg. Ich bin Single und habe keine Kinder.", "en": "I now live in Augsburg. I am single and have no children."},
                {"speaker": "Andreas", "de": "Ich bin Student. Ich studiere Medizin und ich habe einen Job als Verk?ufer.", "en": "I am a student. I study medicine and I have a job as a shop assistant."},
            ],
        },
        {
            "id": "berufe-raten",
            "title": "Berufe raten (guessing game)",
            "source": "Kursbuch KB 5c",
            "lines": [
                {"speaker": "A", "de": "Du bist Paketzusteller!", "en": "You are a parcel delivery person!"},
                {"speaker": "B", "de": "Du bist Verk?ufer.", "en": "You are a shop assistant."},
                {"speaker": "A", "de": "Nein!", "en": "No!"},
            ],
        },
    ],
    "workbook_refs": [
        {"ref": "AB-02-1", "abExercise": 1, "kbRef": 2, "abPage": 12, "topic": "wir/ihr conjugation (sein, wohnen, leben, haben)", "tags": ["?G"]},
        {"ref": "AB-02-2", "abExercise": 2, "kbRef": 2, "abPage": 12, "topic": "Conjugation table wohnen/leben/haben/sein", "tags": ["?G", "?l"]},
        {"ref": "AB-02-3", "abExercise": 3, "kbRef": 2, "abPage": 12, "topic": "Verb forms in sentences", "tags": ["?G"]},
        {"ref": "AB-02-4", "abExercise": 4, "kbRef": 3, "abPage": 13, "topic": "Numbers find and note", "tags": ["?G"]},
        {"ref": "AB-02-5", "abExercise": 5, "kbRef": 3, "abPage": 13, "topic": "Numbers 1?100 practice", "tags": ["?G"]},
        {"ref": "AB-02-6", "abExercise": 6, "kbRef": 3, "abPage": 13, "topic": "Telefonnummern h?ren", "tags": ["?G"]},
        {"ref": "AB-02-7", "abExercise": 7, "kbRef": 4, "abPage": 13, "topic": "Familienstand ordnen", "tags": ["?W"]},
        {"ref": "AB-02-8", "abExercise": 8, "kbRef": 4, "abPage": 14, "topic": "S?tze mit nicht schreiben", "tags": ["?G"]},
        {"ref": "AB-02-9", "abExercise": 9, "kbRef": 4, "abPage": 14, "topic": "Alles falsch ? correct answers", "tags": ["?G"]},
        {"ref": "AB-02-10", "abExercise": 10, "kbRef": 5, "abPage": 14, "topic": "Wo und als was arbeiten (als/bei)", "tags": ["?G"]},
        {"ref": "AB-02-11", "abExercise": 11, "kbRef": 5, "abPage": 14, "topic": "Bilden Sie acht Berufe", "tags": ["?W"]},
        {"ref": "AB-02-12", "abExercise": 12, "kbRef": 5, "abPage": 15, "topic": "Wortakzent Berufe + listening", "tags": ["AUSSPRACHE"], "audio": "l2-berufe-6a"},
        {"ref": "AB-02-13", "abExercise": 13, "kbRef": 6, "abPage": 15, "topic": "von Beruf / beruflich phrases ordnen", "tags": ["?K"]},
        {"ref": "AB-02-14", "abExercise": 14, "kbRef": 7, "abPage": 15, "topic": "Profil fields (Vorname, Beruf, Studium?)", "tags": ["?W"]},
    ],
    "links": {
        "teacherLayer": "berufe.json",
        "berufeCount": 48,
        "berufeNote": "Full 48-profession m/f/plural table in berufe.json (Notes_260730_040559.txt). Textbook L2 covers subset; teacher layer extends exam set.",
        "audioMap": "audio-map.json",
        "relatedLessons": ["lesson-01"],
    },
    "meta": {
        "extractedAt": "2026-07-30",
        "extractMethod": "pymupdf + manual structuring",
        "itemCounts": {},
    },
}

lesson2["meta"]["itemCounts"] = {
    "vocabulary": len(lesson2["vocabulary"]),
    "phrases": len(lesson2["phrases"]),
    "grammar": len(lesson2["grammar"]),
    "verbs": len(lesson2["verbs"]),
    "dialogues": len(lesson2["dialogues"]),
    "workbook_refs": len(lesson2["workbook_refs"]),
}

lesson1["meta"] = {
    "extractedAt": "2026-07-30",
    "extractMethod": "Lesson 1_260730_050234.txt",
    "itemCounts": {
        "vocabulary": len(lesson1["vocabulary"]),
        "phrases": len(lesson1["phrases"]),
        "grammar": len(lesson1["grammar"]),
        "verbs": len(lesson1["verbs"]),
        "workbook_refs": len(lesson1["workbook_refs"]),
    },
}

# Write files
(OUT / "lesson1.json").write_text(json.dumps(lesson1, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "lesson2.json").write_text(json.dumps(lesson2, ensure_ascii=False, indent=2), encoding="utf-8")

# berufe.json ? copy from web/data, strip emoji for extracted layer or keep
berufe_src = WEB / "berufe.json"
berufe = json.loads(berufe_src.read_text(encoding="utf-8"))
berufe["id"] = "berufe-teacher"
berufe["sources"] = ["Notes_260730_040559.txt"]
berufe["priority"] = "teacher"
berufe["lesson"] = 2
(OUT / "berufe.json").write_text(json.dumps(berufe, ensure_ascii=False, indent=2), encoding="utf-8")

gaps = """# Extract Gaps ? Lesson 2

## Extracted successfully (pymupdf)
- `Momente_A1_1_KB_Glossar_Deutsch_Spanisch.pdf` ? Lektion 02 glossary entries (pages 2?3)
- `A1-KB-momente.pdf` ? Kursbuch Lektion 2 (KB pages ~15?18, PDF pages 17?20)
- `Momente A1.1 AB_7.pdf` ? Arbeitsbuch ?N 02 exercises 1?14 (AB pages 10?15)
- `Momente_A1_1_KB_Loesungen.pdf` ? Lektion 2 answer key snippets
- `Notes_260730_040559.txt` ? 48 Berufe ? `berufe.json` (teacher layer, ids 1?48)

## Partial / not fully extracted
- **KB partner texts** (PARTNER/IN A/B pages 158, 192) ? referenced in KB ?8 but not parsed line-by-line
- **Spanish definitions** from glossary ? DE+EN only in lesson2 vocabulary; ES omitted for Alpha EN UI
- **Fokus Beruf** modules (AB CD tracks) ? audio mapped in `audio-map.json` but exercise text not in L2 core JSON
- **Teacher handout image** `IMG-20260723-WA0001.jpg` ? not on disk; Berufe covered via Notes table
- **Full numbers 0?100** ? sample set in vocabulary; complete table not duplicated (see KB ?3 grid)

## Not attempted
- OpenRouter / AI enrichment (per lane instructions)
- Web UI files (`web/`) ? out of scope for this lane
"""

(OUT / "EXTRACT-GAPS.md").write_text(gaps, encoding="utf-8")

print("WROTE lesson1.json", lesson1["meta"]["itemCounts"])
print("WROTE lesson2.json", lesson2["meta"]["itemCounts"])
print("WROTE berufe.json professions:", len(berufe["professions"]))
print("WROTE EXTRACT-GAPS.md")
