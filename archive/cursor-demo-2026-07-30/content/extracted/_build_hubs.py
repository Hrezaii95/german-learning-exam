"""Minimal hub builder from lesson1/lesson2/berufe.json ? no PDF."""
import json
from pathlib import Path

BASE = Path(r"E:\claude-cursor\side projects\German learning\content\extracted")
OUT = BASE

lesson1 = json.loads((BASE / "lesson1.json").read_text(encoding="utf-8"))
lesson2 = json.loads((BASE / "lesson2.json").read_text(encoding="utf-8"))
berufe = json.loads((BASE / "berufe.json").read_text(encoding="utf-8"))

# --- vocab-hub ---
def vocab_entry(v, lesson=None, extra=None):
    e = {"german": v.get("de", ""), "english": v.get("en", "")}
    if v.get("article"):
        e["article"] = v["article"]
    if v.get("plural"):
        e["plural"] = v["plural"]
    if v.get("genderHint"):
        e["genderColor"] = v["genderHint"]
    if lesson:
        e["lesson"] = lesson
    if v.get("berufeRef"):
        e["berufeRef"] = v["berufeRef"]
    if extra:
        e.update(extra)
    return e

topics = []

# alphabet
alphabet = [v for v in lesson1["vocabulary"] if v.get("category") == "alphabet"]
topics.append({
    "id": "alphabet",
    "title": {"de": "Alphabet", "en": "Alphabet"},
    "tags": ["alphabet"],
    "lesson": 1,
    "entries": [vocab_entry(v, 1) for v in alphabet],
})

# countries (L1 + L2)
countries_l1 = [v for v in lesson1["vocabulary"] if v.get("category") == "countries"]
countries_l2 = [v for v in lesson2["vocabulary"] if v.get("category") == "countries"]
seen = set()
country_entries = []
for v in countries_l1 + countries_l2:
    key = v["de"]
    if key in seen:
        continue
    seen.add(key)
    country_entries.append(vocab_entry(v, v.get("lesson", 1)))
topics.append({
    "id": "countries",
    "title": {"de": "L?nder", "en": "Countries"},
    "tags": ["countries"],
    "entries": country_entries,
})

# numbers from L2
numbers = [v for v in lesson2["vocabulary"] if v.get("category") == "numbers"]
topics.append({
    "id": "numbers",
    "title": {"de": "Zahlen", "en": "Numbers"},
    "tags": ["numbers"],
    "lesson": 2,
    "entries": [vocab_entry(v, 2) for v in numbers],
})

# berufe from berufe.json + L2 berufe vocab
berufe_entries = []
for p in berufe["professions"]:
    berufe_entries.append({
        "id": p["id"],
        "english": p["en"],
        "mascSg": p["mascSg"],
        "mascPl": p.get("mascPl"),
        "femSg": p.get("femSg"),
        "femPl": p.get("femPl"),
        "genderColor": {"masc": "blue", "fem": "red", "plural": "purple"},
        "tags": ["berufe"],
        "lesson": 2,
        "source": "berufe.json",
    })
l2_berufe_vocab = [v for v in lesson2["vocabulary"] if v.get("category") == "berufe"]
topics.append({
    "id": "berufe",
    "title": {"de": "Berufe", "en": "Professions"},
    "tags": ["berufe"],
    "lesson": 2,
    "teacherLayer": "berufe.json",
    "professions": berufe_entries,
    "textbookVocab": [vocab_entry(v, 2) for v in l2_berufe_vocab],
})

# lesson2 other vocab grouped by category
l2_cats = {}
for v in lesson2["vocabulary"]:
    cat = v.get("category", "general")
    if cat in ("numbers", "countries", "berufe"):
        continue
    l2_cats.setdefault(cat, []).append(vocab_entry(v, 2))

for cat_id, entries in sorted(l2_cats.items()):
    topics.append({
        "id": f"lesson2-{cat_id}",
        "title": {"de": cat_id, "en": cat_id.replace("-", " ").title()},
        "tags": [cat_id, "lesson2"],
        "lesson": 2,
        "entries": entries,
    })

vocab_hub = {
    "id": "vocab-hub",
    "level": "A1",
    "source": ["lesson1.json", "lesson2.json", "berufe.json"],
    "topics": topics,
    "meta": {
        "topicCount": len(topics),
        "berufeCount": len(berufe_entries),
    },
}

# --- phrases-qa-hub ---
def phrase_item(p, lesson):
    return {
        "de": p["de"],
        "en": p["en"],
        "category": p.get("category"),
        "lesson": lesson,
        "formality": p.get("formality"),
    }

phrase_topics = []

# introductions L1
intro_phrases = [p for p in lesson1["phrases"] if p.get("category") in ("greetings", "goodbyes", "answers") and any(x in p["de"].lower() for x in ("hei?", "hei?e", "name", "bin ", "wer "))]
intro_phrases += [p for p in lesson1["phrases"] if p.get("category") == "greetings"]
intro_phrases += [p for p in lesson1["phrases"] if p.get("category") == "answers"]
# dedupe
seen_p = set()
intro_unique = []
for p in intro_phrases:
    if p["de"] not in seen_p:
        seen_p.add(p["de"])
        intro_unique.append(p)

phrase_topics.append({
    "id": "introductions",
    "title": {"de": "Vorstellen", "en": "Introductions"},
    "lesson": 1,
    "phrases": [phrase_item(p, 1) for p in lesson1["phrases"] if p.get("category") in ("greetings", "goodbyes", "answers")],
    "qa_pairs": [
        {
            "id": "name-informal",
            "question": {"informal": "Wie hei?t du?", "formal": "Wie hei?en Sie?"},
            "answers": [{"pattern": "Ich hei?e ?", "variants": ["du hei?t", "er/sie hei?t", "Sie hei?en"], "examples": ["Ich hei?e Miriam.", "Mein Name ist Vera."]}],
        },
        {
            "id": "who-informal",
            "question": {"informal": "Wer bist du?", "formal": "Wer sind Sie?"},
            "answers": [{"pattern": "Ich bin ?", "variants": ["Das ist ?"], "examples": ["Ich bin Rita.", "Das ist Sergej."]}],
        },
        {
            "id": "who-is-that",
            "question": {"de": "Wer ist das?"},
            "answers": [{"pattern": "Das ist ?", "examples": ["Das ist Sergej."]}],
        },
    ],
})

phrase_topics.append({
    "id": "wellbeing",
    "title": {"de": "Wie geht's?", "en": "How are you?"},
    "lesson": 1,
    "phrases": [phrase_item(p, 1) for p in lesson1["phrases"] if p.get("category") == "wellbeing"],
    "qa_pairs": [
        {
            "id": "how-are-you",
            "question": {"informal": "Wie geht's dir?", "formal": "Wie geht's Ihnen?"},
            "answers": [
                {"de": "Sehr gut, danke.", "en": "Very well, thanks."},
                {"de": "Gut, danke.", "en": "Fine, thanks."},
                {"de": "Es geht.", "en": "Not too bad."},
                {"de": "Nicht so gut.", "en": "Not so well."},
            ],
        },
    ],
})

phrase_topics.append({
    "id": "origins",
    "title": {"de": "Herkunft", "en": "Origins"},
    "lesson": 1,
    "phrases": [phrase_item(p, 1) for p in lesson1["phrases"] if p.get("category") in ("questions", "answers") and any(x in p["de"].lower() for x in ("woher", "komm", "aus "))],
    "qa_pairs": [
        {
            "id": "where-from",
            "question": {"informal": "Woher kommst du?", "formal": "Woher kommen Sie?"},
            "answers": [
                {"pattern": "Ich komme aus ?", "variants": ["du kommst aus", "er/sie kommt aus", "Sie kommen aus"], "examples": ["Ich komme aus Deutschland.", "Sie kommt aus Eritrea."]},
            ],
        },
    ],
})

# L2 personal + professions
phrase_topics.append({
    "id": "personal-details",
    "title": {"de": "Pers?nliche Angaben", "en": "Personal details"},
    "lesson": 2,
    "phrases": [phrase_item(p, 2) for p in lesson2["phrases"] if p.get("category") in ("questions", "answers") and any(x in p["de"].lower() for x in ("alt", "wohn", "leben", "verheiratet", "kinder", "single"))],
    "qa_pairs": [
        {
            "id": "age-plural",
            "question": {"de": "Wie alt seid ihr?"},
            "answers": [{"pattern": "Ich bin ? Jahre alt.", "examples": ["Ich bin 28 Jahre alt."]}],
        },
        {
            "id": "live-together",
            "question": {"de": "Lebt ihr zusammen?"},
            "answers": [{"de": "Ja, wir leben zusammen.", "en": "Yes, we live together."}, {"de": "Wir sind nicht verheiratet.", "en": "We are not married."}],
        },
        {
            "id": "where-live",
            "question": {"de": "Wo wohnt ihr?", "informal": "Wo wohnst du?"},
            "answers": [{"pattern": "Wir wohnen in ?", "variants": ["Ich wohne in ?"], "examples": ["Wir wohnen in M?nchen.", "Ich wohne jetzt in Augsburg."]}],
        },
    ],
})

phrase_topics.append({
    "id": "professions",
    "title": {"de": "Berufe", "en": "Professions"},
    "lesson": 2,
    "phrases": [phrase_item(p, 2) for p in lesson2["phrases"] if p.get("category") in ("questions", "answers", "patterns", "communication", "dialogue-cue")],
    "qa_pairs": [
        {
            "id": "profession-informal",
            "question": {"informal": "Was bist du von Beruf?", "formal": "Was sind Sie von Beruf?", "plural": "Was macht ihr beruflich?"},
            "answers": [
                {"pattern": "Ich bin ? von Beruf.", "examples": ["Ich bin Paketzusteller und arbeite bei HotSped."]},
                {"pattern": "Ich arbeite als ?", "examples": ["Ich arbeite als Friseurin und als Kellnerin."]},
                {"pattern": "Ich habe einen Job als ?", "examples": ["Ich habe einen Job als Verk?ufer."]},
                {"pattern": "Ich studiere ?", "examples": ["Ich studiere Medizin."]},
            ],
        },
    ],
})

phrases_qa_hub = {
    "id": "phrases-qa-hub",
    "level": "A1",
    "source": ["lesson1.json", "lesson2.json"],
    "topics": phrase_topics,
    "meta": {
        "topicCount": len(phrase_topics),
        "phraseCount": sum(len(t.get("phrases", [])) for t in phrase_topics),
        "qaPairCount": sum(len(t.get("qa_pairs", [])) for t in phrase_topics),
    },
}

# --- grammar-hub ---
grammar_topics = []

for g in lesson1["grammar"]:
    grammar_topics.append({
        "id": g["id"],
        "title": {"de": g["topic"], "en": g["topic"]},
        "lesson": 1,
        "rule": g.get("rule"),
        "items": g.get("items"),
        "example": g.get("example"),
        "examples": g.get("examples"),
        "phraseTopicRefs": ["introductions", "origins"] if g["id"] == "pronouns" else ["origins"],
    })

for g in lesson2["grammar"]:
    refs = []
    if "beruf" in g["id"] or "arbeiten" in g["id"] or "in" in g["id"]:
        refs.append("professions")
    if "plural" in g["id"] or "pronouns" in g["id"]:
        refs.append("personal-details")
    if "zahlen" in g["id"]:
        refs.append("numbers")
    if "negation" in g["id"]:
        refs.extend(["personal-details", "professions"])
    grammar_topics.append({
        "id": g["id"],
        "title": {"de": g["topic"], "en": g["topic"]},
        "lesson": 2,
        "rule": g.get("rule"),
        "table": g.get("table"),
        "items": g.get("items"),
        "example": g.get("example"),
        "examples": g.get("examples"),
        "source": g.get("source"),
        "phraseTopicRefs": refs,
    })

# verbs as grammar sub-topics
verb_topics = []
for v in lesson1["verbs"] + lesson2["verbs"]:
  seen_v = {x["infinitive"] for x in verb_topics}
  if v["infinitive"] in seen_v:
    continue
  verb_topics.append({
    "infinitive": v["infinitive"],
    "english": v["en"],
    "lesson": v.get("lesson"),
    "conjugations": v.get("conjugations"),
    "note": v.get("note"),
  })

grammar_hub = {
    "id": "grammar-hub",
    "level": "A1",
    "source": ["lesson1.json", "lesson2.json"],
    "topics": grammar_topics,
    "verbs": verb_topics,
    "meta": {
        "topicCount": len(grammar_topics),
        "verbCount": len(verb_topics),
    },
}

# write
paths = {
    "vocab-hub.json": vocab_hub,
    "phrases-qa-hub.json": phrases_qa_hub,
    "grammar-hub.json": grammar_hub,
}
counts = {}
for name, data in paths.items():
    p = OUT / name
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    counts[name] = {
        "topics": data["meta"].get("topicCount", len(data.get("topics", []))),
        **{k: v for k, v in data["meta"].items() if k != "topicCount"},
    }
    print(f"WROTE {p}")
    print(f"  counts: {counts[name]}")
