# Vocabulary icon audit — 15 October 2026

Baseline: commit `ab8c5b3a5a86a021a4a63b7575c446e666f91137`, branch `codex/live-alpha`. The audit server-renders the actual `SubjectVocabularyVisual` component for every item returned by `loadSubjectVocabulary()`; classification is taken from its `data-subject-visual` attribute.

## Replacement result

All **604 baseline placeholder rows** (598 distinct labels) now resolve to original meaning-specific SVG illustrations. The full catalogue remains **1338 rows**. The approved Home icons and meaningful number/letter symbols are retained. All 41 country flags now share a fine-line frame and pale circular background; 42 previously generic entries have more specific illustrations. The original defect inventory below is preserved for review.

Verification: `verification.json` records the final per-row visual classification; `replacement-sheet-1.svg` through `replacement-sheet-7.svg` show every replacement.

## Confirmed baseline defects

- **604 of 1338 vocabulary rows** use three-letter text placeholders (`source-glyph`) instead of illustrations. These cover **598 distinct headword labels**.
- The screenshot’s **der Ort** is one of these confirmed placeholders.
- **Home & furniture: all 31 source rows already have illustrations.** These are the visual style reference to preserve: thin rounded line art, a restrained pale circular tint, article-colour strokes, and recognisable subject silhouettes.
- Numbers (101 rows) and letter names (30 rows) use deliberate number/letter glyphs; these are meaningful learning symbols and are **not** counted as bad icons.
- All 41 registered country names resolve to their matching flag SVG and all 41 local assets exist. No current country headword falls back to letters. The Countries & languages tag does contain nine bad icons: eight compass directions and **die Insel**.

Tag counts overlap because a source row can carry more than one tag. The 604 total is the deduplicated row count.

| Subject tag | Placeholder rows | All rows |
|---|---:|---:|
| Introductions & greetings | 0 | 10 |
| People, family & jobs | 57 | 198 |
| Countries & languages | 9 | 93 |
| Numbers, prices & time | 36 | 182 |
| Home & furniture | 0 | 31 |
| Everyday objects | 13 | 53 |
| Colours, shapes & materials | 1 | 19 |
| Office & communication | 15 | 35 |
| Months, seasons & festivals | 6 | 26 |
| Past actions & participles | 83 | 178 |
| Travel & separable verbs | 44 | 94 |
| Food, preferences & ordering | 35 | 80 |
| Time, weekdays & plans | 67 | 109 |
| Hobbies, abilities & frequency | 29 | 56 |
| Articles & sentence patterns | 92 | 106 |
| Verbs & conjugation | 106 | 154 |
| Useful conversations | 141 | 195 |
| Questions & answers | 3 | 3 |
| Learning & classroom | 12 | 58 |
| Describing & comparing | 56 | 72 |
| Everyday vocabulary | 57 | 111 |

## Complete placeholder list by subject

### People, family & jobs

der Tierarzt · die Tierärztin · der Elektriker · die Elektrikerin · der Straßenarbeiter · die Straßenarbeiterin · der Maurer · die Maurerin · der Koch · die Köchin · der Müllwerker · die Müllwerkerin · der Metzger · die Metzgerin · der Bauarbeiter · die Bauarbeiterin · der Feuerwehrmann · die Feuerwehrfrau · der Konditor · die Konditorin · der Hausmann · die Hausfrau · der Polizist · die Polizistin · der Soldat · die Soldatin · der Geschäftsmann · die Geschäftsfrau · der Tankwart · die Tankwartin · der Geheimagent · die Geheimagentin · der Übersetzer · die Übersetzerin · der Psychologe · die Psychologin · der Auszubildende · die Auszubildende · der Weber · die Weberin · der Wagner · die Wagnerin · der Chocolatier · die Chocolatière · der IT-Trainer · die IT-Trainerin · der Software-Trainer · die Software-Trainerin · der DJ · der Kaufmann · die Kauffrau · die Kaufleute · der Versicherungskaufmann · die Versicherungskauffrau · die Versicherungskaufleute · der Rücken · die Stimme

### Countries & languages

der Norden · der Osten · der Süden · der Westen · der Nordosten · der Südosten · der Südwesten · der Nordwesten · die Insel

### Numbers, prices & time

so · der Abend · die Zahl · die Telefonnummer · die Million · die Nummer · nach · lange · der Nachmittag · am Wochenende · in der Nacht · um Viertel nach · um halb · spät · der Vormittag · der Mittag · Viertel nach · vor · halb · Viertel vor · Es ist … · der Traumtag · kurz · früh · kurz vor · kurz nach · gerade · von … bis · danach · ab · letzt- · seit · die Mitte · der Anfang · die Jahreszeit

### Everyday objects

online · die Ware · das Produkt · der Gott · der Traum · der Albtraum · das Quartett · der Würfel · der Akku · das T-Shirt · das Riesenrad · das Tor · das Zehn-Meter-Brett

### Colours, shapes & materials

die Farbe

### Office & communication

die Telefonnummer · die Straße · die Hausnummer · die Adresse · die Postleitzahl · der Ort · die Nummer · der Produktname · die Menge · der Unterstrich · ät · die Arbeit · der Schreibtisch · der Arbeitsplatz · die Handynummer

### Months, seasons & festivals

der Marathon · seit · die Radtour · die Mitte · der Anfang · die Jahreszeit

### Past actions & participles

sein · kommen · lernen · haben · machen · arbeiten · etwa · also · spielen · nach · Es geht. · der Film · backen · lange · treffen · fahren · surfen · trinken · ankommen · abholen · einsteigen · abfahren · fernsehen · besuchen · der Wald · zu wenig · zu viel · der Vogel · die Pause · die Serie · Hallo Schatz! · von … bis · danach · das T-Shirt · ab · ganz · zurückkommen · der Kuss · geöffnet · die Boutique · die Mode · der Laden · geschlossen · das Eiscafé · der Kiosk · letzt- · einladen · Ja, habe ich. · Nein, habe ich nicht. · der Marathon · es gibt · seit · der Kilometer · unterwegs · die Radtour · bis · weiterfahren · das Wetter · ein paar · bleiben · das Riesenrad · fast · die Mitte · der Anfang · dieser / dieses / diese · zurückfahren · das Tor · ziemlich · cool · durch · die Jahreszeit · passieren · springen · der Hubschrauber · das Zehn-Meter-Brett · Ja, das stimmt. · jeder / jedes / jede · wie lange · die Insel · nichts · geboren · der Durst · legen

### Travel & separable verbs

sein · kommen · haben · machen · verstehen · nach · Es geht. · bestellen · treffen · fahren · trinken · starten · ankommen · versuchen · die Verspätung · die Maschine · abholen · sich freuen · einsteigen · umsteigen · aussteigen · der Verkehr · das Verkehrsmittel · abfahren · fernsehen · von Bahnsteig … · einfahren · an Gleis … · enden · beginnen · stehen · der Halt · informieren · besuchen · der Kilometer · unterwegs · weiterfahren · bleiben · zurückfahren · durch · passieren · springen · der Hubschrauber · legen

### Food, preferences & ordering

der Hunger · der Kaffee · mögen · zum Frühstück · der Ketchup · das Ketchup · auf dem Tisch · trinken · die Butter · der Schinken · wünschen · die Tasse · möchten · der Nusskuchen · der Apfelkuchen · der Schokoladenkuchen · nehmen · die Speisekarte · der Tomatensalat · die Kartoffel · das Würstchen · das Huhn · die Vanille · die Kugel · die Sahne · das Stück · der Zitronenkuchen · schmecken · die Nuss · das Schinkenbrötchen · die Tomatensuppe · der Käsekuchen · das Gemüse · das Rezept · die Küche

### Time, weekdays & plans

so · der Abend · haben · in · oder · planen · wissen · die Frage · die Antwort · nach · Es geht. · können · leider · die Idee · der Klub · das Fitnessstudio · lange · treffen · das Schwimmbad · das Kino · der Nachmittag · um · am · Wann? · am Wochenende · in der Nacht · Das weiß ich noch nicht. · Lust auf … · Keine Lust. · die Lust · Gute Idee! · um Viertel nach · um halb · spät · okay · Bis dann! · der Vormittag · der Mittag · das Museum · das Café · die Ausstellung · die Disco · die Bar · Viertel nach · vor · halb · Viertel vor · Wie viel Uhr ist es? · Wie spät ist es? · Es ist … · Ja, genau. · der Vorschlag · tut mir leid · der Traumtag · kurz · früh · kurz vor · kurz nach · gerade · von … bis · danach · ab · letzt- · seit · die Mitte · der Anfang · die Jahreszeit

### Hobbies, abilities & frequency

planen · das Hobby · spielen · Es geht. · der Film · können · kennen · immer · backen · Ski fahren · auflegen · mixen · lieben · das Kickboxen · in der Freizeit · die Freizeit · oft · die Fitness · nie · manchmal · Freunde treffen · treffen · fahren · surfen · der Spaß · in deiner Freizeit · die Serie · der Marathon · die Radtour

### Articles & sentence patterns

wie · wer · woher · ich · du · er · sie · Sie · dir · Und dir? · das · mein · meine · und · aus · auch · nicht · sehr · so · gut · Gut, danke. · Nicht so gut. · Sehr gut, danke. · super · Auch super. · es · bitte · Ihnen · kein · keine · in · ihr · wir · ja · aber · wo · was · als · bei · von · oder · für · mehr · fertig · schon · dein · deine · nein · doch · welche · ein bisschen · gar nicht · ein · eine · etwa · also · mich · Ihr · Ihre · dann · noch einmal · weiter · zu zweit · zu dritt · selbst · mit · über · auf · nach · ein / eine · man · kein / keine · wir alle · alle · alle drei · beide · auch nicht · Lieblings- · um · am · unser · dich · zu wenig · zu viel · ganz · es gibt · bis · ein paar · fast · dieser / dieses / diese · jeder / jedes / jede · nichts

### Verbs & conjugation

heißen · sein · kommen · lernen · ankreuzen · buchstabieren · werfen · haben · wohnen · leben · zusammenleben · machen · arbeiten · sammeln · studieren · glauben · planen · verbinden · ergänzen · zuordnen · markieren · schließen · spielen · vorspielen · raten · meinen · wissen · verstehen · vorlesen · vorstellen · geben · korrigieren · üben · fehlen · wählen · würfeln · ziehen · bekommen · tauschen · lösen · bilden · klatschen · präsentieren · Es geht. · freuen · zeigen · filmen · bedeuten · aufhängen · mischen · helfen · aufnehmen · aktivieren · achten · können · sortieren · passen · kennen · kosten · shoppen · nennen · bitten · sich bedanken · reagieren auf · bestellen · brauchen · packen · backen · auflegen · mixen · lieben · treffen · fahren · surfen · mögen · trinken · wünschen · möchten · nehmen · schmecken · starten · ankommen · versuchen · abholen · sich freuen · einsteigen · umsteigen · aussteigen · abfahren · fernsehen · einfahren · enden · beginnen · stehen · informieren · besuchen · zurückkommen · einladen · weiterfahren · bleiben · zurückfahren · passieren · springen · legen · vermuten

### Useful conversations

ah · Achtung! · zu Hause · wie viel · nur · wirklich · zu · da · mal · denn · oh · ein / eine · etwas · viele · und so weiter · aha · auf Deutsch · man · danke schön · Bitte schön. · Kein Problem. · Ich weiß nicht. · online · ät · kein / keine · Oh Gott! · Hilfe! · Hunger haben · Viele Grüße · leider · Zeit haben · keine Zeit haben · Liebe Grüße / LG · in die Tasche packen · Ach, da ist er ja! · schon wieder · vielleicht · Hallo, … hier. · Was kann ich für Sie tun? · da sein · Auf Wiederhören. · zurzeit · immer · Ski fahren · Du kannst ja … · Du kannst wirklich … · Du kannst aber … · wir alle · alle · alle drei · beide · auch nicht · in der Freizeit · oft · nie · lange · manchmal · vertikal · horizontal · diagonal · Freunde treffen · Spaß machen · Lieblings- · Was machst du gern? · gern tun · in deiner Freizeit · um · am · Wann? · am Wochenende · frei · in der Nacht · Das weiß ich noch nicht. · Lust auf … · Keine Lust. · Gute Idee! · um Viertel nach · um halb · spät · okay · Bis dann! · Viertel nach · vor · halb · Viertel vor · Wie viel Uhr ist es? · Wie spät ist es? · Es ist … · Ja, genau. · tut mir leid · zum Frühstück · Guten Appetit! · hier bitte · auf dem Tisch · schade · na gut · unser · Ich auch. · Ich nicht. · Ich schon. · Ich auch nicht. · kurz · dort · noch mal · früh · hoffentlich · alles · alles klar · lieber · was für · natürlich · Bis gleich! · von Bahnsteig … · an Gleis … · dich · kurz vor · kurz nach · gerade · zu wenig · zu viel · Hallo Schatz! · von … bis · danach · ab · ganz · letzt- · Ja, habe ich. · Nein, habe ich nicht. · es gibt · seit · unterwegs · bis · ein paar · fast · dieser / dieses / diese · durch · Ja, das stimmt. · jeder / jedes / jede · wie lange · nichts · geboren

### Questions & answers

wie · wer · woher

### Learning & classroom

das Wort · das Wörterbuch · das Online-Wörterbuch · die Frage · die Antwort · auf Deutsch · die Wiederholung · Ich weiß nicht. · die Abkürzung · vertikal · horizontal · diagonal

### Describing & comparing

alt · verheiratet · zusammen · richtig · falsch · geschieden · allein · beruflich · jetzt · minus · plus · supercool · noch · viel · hier · nur · etwa · überall · deutschsprachig · warum · gern · mal · interessant · ledig · neu · also · arbeitslos · türkisch · schön · hässlich · modern · praktisch · schnell · schwer · toll · normal · komisch · blöd · lustig · schlecht · besonders · lecker · fit · intelligent · prima · sorgenfrei · perfekt · sicher · kaputt · wenig · nächst- · geöffnet · geschlossen · ziemlich · cool

### Everyday vocabulary

das Alphabet · die Information · der Herr · die bekannte Persönlichkeit · die Münze · der Punkt · das Rätsel · der Single · der Job · der Beruf · die Stelle · das Praktikum · die Herkunft · das Alter · der Familienstand · das Tier · der Dank · das Mitglied · das Foto · die Konferenz · die Homepage · die Stadt · das Marketing · die Wohnung · das Bildlexikon · die Gruppe · die Lösung · der Sitzplan · das Beispiel · das Spiel · das Würfelspiel · die Spielfigur · die Rechenaufgabe · die Lücke · die Angabe · der Wortakzent · die Silbe · die Satzmelodie · die Flagge · die Vorbereitung · das Mikrofon · das Kettenspiel · die Rückfrage · das Glück · der Stern · das Problem · der Gruß · das Yoga · der Stress · die Liebe · das Seniorenheim · die Versicherung · das Studio · der Witz · das Gedicht · die Vorsicht

## Semantic drawings needing refinement

These are pictures rather than placeholders, but some represent a broad topic or a related object instead of the precise word. They should be reviewed separately from the confirmed 604 placeholders.

| Current drawing | Affected words | Problem / proposed replacement |
|---|---|---|
| Train front | der Bahnhof; der Hauptbahnhof; der Bahnsteig; das Gleis | Distinguish station facade, platform edge, and rail track rather than reusing a vehicle silhouette. |
| Train front | die U-Bahn; die S-Bahn; die Straßenbahn; der Intercity | Shared rail-vehicle cue is relevant, but vehicle-specific side silhouettes / station signs improve distinctions. |
| Generic office building | der Architekt; die Architektin | Use a drawing board or plan-and-set-square as an occupational cue. |
| Graduation cap | der Kursraum; die Klasse; der Unterricht | A classroom/board or teacher-at-board scene makes the concrete meaning clearer. |
| Family tree | die Mutter; der Vater; die Schwester; der Bruder; der Onkel; die Tante; die Oma; der Opa; der Großvater; die Großmutter; die Großeltern; die Eltern; der Sohn; die Tochter; das Enkelkind; der Enkel; die Enkelin; die Geschwister; der Ehemann; die Ehefrau; der Verwandte; die Verwandte; der Mann; die Frau; der Papa; die Mama | A family tree is suitable for die Familie / der Stammbaum; highlight the relevant position or relationship for individual family words. Do not equate grammatical gender with visual stereotypes. |
| Document | der Journalist; die Journalistin; der Schriftsteller; die Schriftstellerin; der Sekretär; die Sekretärin | Relevant occupational shorthand, but a notebook-and-microphone, manuscript-and-pen, or office scene is more specific. |
| Generic food bowl / utensils | das Restaurant | Use restaurant facade or table/serving scene. |
| Same speech bubble | All 38 languages | Language-neutral speech is appropriate; a small distinct script specimen may improve differentiation, but do not assign a language to one national flag. |

## Replacement design requirements

- Extend the existing SVG illustration system rather than adding raster sprites or emoji.
- Keep the good Home / object icons and their existing colours intact.
- Use the same 100 × 100 viewbox, thin rounded strokes (2.6 units), `currentColor`, pale circular tint and generous internal spacing.
- New icons must communicate the meaning: objects as silhouettes, verbs as action scenes, adjectives as contrasts, directions as compass arrows, sentence words as small semantic diagrams.
- Preserve each row’s grammatical-gender colour in grouped and ungrouped views.
- Keep country flags intact and visually checked; the source inventory is complete.

The machine-readable CSV stores every affected source row, its meaning, category, subject tags and current visual kind: [`placeholders.csv`](placeholders.csv).

## Placeholder counts by category

| Category | Source rows | Distinct labels |
|---|---:|---:|
| Question word | 3 | 3 |
| Pronoun | 13 | 13 |
| Verb | 106 | 105 |
| Noun | 178 | 176 |
| Function word | 51 | 51 |
| Interjection | 2 | 2 |
| Adjective / adverb | 28 | 28 |
| Profession | 48 | 48 |
| Geography | 8 | 8 |
| Adjective | 28 | 28 |
| Expression | 139 | 139 |

## Complete placeholder list by category

### Question word

wie · wer · woher

### Pronoun

ich · du · er · sie · Sie · dir · Und dir? · das · mein · meine · mich · Ihr · Ihre

### Verb

heißen · sein · kommen · lernen · ankreuzen · buchstabieren · werfen · haben · wohnen · leben · zusammenleben · machen · arbeiten · sammeln · studieren · glauben · planen · verbinden · ergänzen · zuordnen · markieren · schließen · spielen · vorspielen · raten · meinen · wissen · verstehen · vorlesen · vorstellen · geben · korrigieren · üben · fehlen · wählen · würfeln · ziehen · bekommen · tauschen · lösen · bilden · klatschen · präsentieren · Es geht. · freuen · zeigen · filmen · bedeuten · aufhängen · mischen · helfen · aufnehmen · aktivieren · achten · können · sortieren · passen · kennen · kosten · shoppen · nennen · bitten · sich bedanken · reagieren auf · bestellen · brauchen · packen · backen · auflegen · mixen · lieben · treffen · fahren · surfen · mögen · trinken · wünschen · möchten · nehmen · schmecken · starten · ankommen · versuchen · abholen · sich freuen · einsteigen · umsteigen · aussteigen · abfahren · fernsehen · einfahren · enden · beginnen · stehen · informieren · besuchen · zurückkommen · einladen · weiterfahren · bleiben · zurückfahren · passieren · springen · legen · vermuten

### Noun

das Alphabet · die Information · der Herr · der Abend · die bekannte Persönlichkeit · die Münze · der Punkt · die Zahl · das Rätsel · der Single · der Job · der Beruf · die Stelle · das Praktikum · die Herkunft · das Alter · der Familienstand · das Tier · der Dank · die Telefonnummer · das Mitglied · das Foto · die Million · die Konferenz · die Homepage · die Stadt · die Straße · die Hausnummer · das Marketing · die Adresse · das Hobby · die Postleitzahl · der Ort · die Wohnung · das Wort · das Bildlexikon · das Wörterbuch · das Online-Wörterbuch · die Gruppe · die Frage · die Antwort · die Lösung · der Sitzplan · das Beispiel · die Nummer · das Spiel · das Würfelspiel · die Spielfigur · die Rechenaufgabe · die Lücke · die Angabe · der Wortakzent · die Silbe · die Satzmelodie · der Film · die Flagge · die Vorbereitung · das Mikrofon · das Kettenspiel · die Rückfrage · das Glück · der Stern · die Farbe · das Problem · die Wiederholung · die Ware · das Produkt · der Produktname · die Menge · der Unterstrich · der Gott · die Arbeit · der Traum · der Albtraum · der Hunger · der Kaffee · der Gruß · das Yoga · der Schreibtisch · der Arbeitsplatz · das Quartett · die Handynummer · die Abkürzung · die Idee · der Stress · die Liebe · der Würfel · der DJ · das Kickboxen · das Seniorenheim · die Versicherung · der Kaufmann · die Kauffrau · die Kaufleute · der Versicherungskaufmann · die Versicherungskauffrau · die Versicherungskaufleute · die Freizeit · der Klub · die Fitness · das Studio · das Fitnessstudio · der Spaß · das Schwimmbad · das Kino · der Nachmittag · die Lust · der Vormittag · der Mittag · das Museum · das Café · die Ausstellung · die Disco · die Bar · der Rücken · der Vorschlag · der Traumtag · der Ketchup · das Ketchup · der Witz · das Gedicht · die Butter · der Schinken · die Tasse · der Nusskuchen · der Apfelkuchen · der Schokoladenkuchen · die Speisekarte · der Tomatensalat · die Kartoffel · das Würstchen · das Huhn · die Vanille · die Kugel · die Sahne · das Stück · der Zitronenkuchen · die Nuss · das Schinkenbrötchen · die Tomatensuppe · der Käsekuchen · das Gemüse · das Rezept · die Küche · die Stimme · die Verspätung · die Maschine · der Akku · der Verkehr · das Verkehrsmittel · der Halt · die Vorsicht · der Wald · der Vogel · die Pause · die Serie · das T-Shirt · der Kuss · die Boutique · die Mode · der Laden · das Eiscafé · der Kiosk · der Marathon · der Kilometer · die Radtour · das Wetter · das Riesenrad · die Mitte · der Anfang · das Tor · die Jahreszeit · der Hubschrauber · das Zehn-Meter-Brett · die Insel · der Durst

### Function word

und · aus · auch · nicht · sehr · so · gut · Gut, danke. · Nicht so gut. · Sehr gut, danke. · super · Auch super. · es · bitte · Ihnen · kein · keine · in · ihr · wir · ja · aber · wo · was · als · bei · von · oder · für · mehr · fertig · schon · dein · deine · nein · doch · welche · ein bisschen · gar nicht · ein · eine · dann · noch einmal · weiter · zu zweit · zu dritt · selbst · mit · über · auf · nach

### Interjection

ah · Achtung!

### Adjective / adverb

alt · verheiratet · zusammen · richtig · falsch · geschieden · allein · beruflich · jetzt · minus · plus · supercool · noch · viel · hier · nur · etwa · überall · deutschsprachig · warum · gern · mal · interessant · ledig · neu · also · arbeitslos · türkisch

### Profession

der Tierarzt · die Tierärztin · der Elektriker · die Elektrikerin · der Straßenarbeiter · die Straßenarbeiterin · der Maurer · die Maurerin · der Koch · die Köchin · der Müllwerker · die Müllwerkerin · der Metzger · die Metzgerin · der Bauarbeiter · die Bauarbeiterin · der Feuerwehrmann · die Feuerwehrfrau · der Konditor · die Konditorin · der Hausmann · die Hausfrau · der Polizist · die Polizistin · der Soldat · die Soldatin · der Geschäftsmann · die Geschäftsfrau · der Tankwart · die Tankwartin · der Geheimagent · die Geheimagentin · der Übersetzer · die Übersetzerin · der Psychologe · die Psychologin · der Auszubildende · die Auszubildende · der Weber · die Weberin · der Wagner · die Wagnerin · der Chocolatier · die Chocolatière · der IT-Trainer · die IT-Trainerin · der Software-Trainer · die Software-Trainerin

### Geography

der Norden · der Osten · der Süden · der Westen · der Nordosten · der Südosten · der Südwesten · der Nordwesten

### Adjective

schön · hässlich · modern · praktisch · neu · schnell · schwer · toll · normal · komisch · blöd · lustig · schlecht · besonders · lecker · fit · intelligent · prima · sorgenfrei · perfekt · sicher · kaputt · wenig · nächst- · geöffnet · geschlossen · ziemlich · cool

### Expression

zu Hause · wie viel · nur · wirklich · zu · da · mal · denn · oh · ein / eine · etwas · viele · und so weiter · aha · auf Deutsch · man · danke schön · Bitte schön. · Kein Problem. · Ich weiß nicht. · online · ät · kein / keine · Oh Gott! · Hilfe! · Hunger haben · Viele Grüße · leider · Zeit haben · keine Zeit haben · Liebe Grüße / LG · in die Tasche packen · Ach, da ist er ja! · schon wieder · vielleicht · Hallo, … hier. · Was kann ich für Sie tun? · da sein · Auf Wiederhören. · zurzeit · immer · Ski fahren · Du kannst ja … · Du kannst wirklich … · Du kannst aber … · wir alle · alle · alle drei · beide · auch nicht · in der Freizeit · oft · nie · lange · manchmal · vertikal · horizontal · diagonal · Freunde treffen · Spaß machen · Lieblings- · Was machst du gern? · gern tun · in deiner Freizeit · um · am · Wann? · am Wochenende · frei · in der Nacht · Das weiß ich noch nicht. · Lust auf … · Keine Lust. · Gute Idee! · um Viertel nach · um halb · spät · okay · Bis dann! · Viertel nach · vor · halb · Viertel vor · Wie viel Uhr ist es? · Wie spät ist es? · Es ist … · Ja, genau. · tut mir leid · zum Frühstück · Guten Appetit! · hier bitte · auf dem Tisch · schade · na gut · unser · Ich auch. · Ich nicht. · Ich schon. · Ich auch nicht. · kurz · dort · noch mal · früh · hoffentlich · alles · alles klar · lieber · was für · natürlich · Bis gleich! · von Bahnsteig … · an Gleis … · dich · kurz vor · kurz nach · gerade · zu wenig · zu viel · Hallo Schatz! · von … bis · danach · ab · ganz · letzt- · Ja, habe ich. · Nein, habe ich nicht. · es gibt · seit · unterwegs · bis · ein paar · fast · dieser / dieses / diese · durch · Ja, das stimmt. · jeder / jedes / jede · wie lange · nichts · geboren

