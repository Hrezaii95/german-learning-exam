import { bi, type Bilingual, type Skill } from './learning.js';
export type SheetEntry = {
  id: string;
  title: Bilingual;
  rule: Bilingual;
  example: Bilingual;
  prompt: Bilingual;
};
export type SheetQuestion = {
  id: string;
  prompt: Bilingual;
  options: Bilingual[];
  answer: number;
  explanation: Bilingual;
};
export type CheatSheet = {
  id: string;
  title: Bilingual;
  intro: Bilingual;
  skills: Skill[];
  entries: SheetEntry[];
  questions: SheetQuestion[];
};
export const sheetRevision = 'wortweg-sheets-1';
const entry = (
  id: string,
  title: Bilingual,
  rule: Bilingual,
  example: Bilingual,
  prompt: Bilingual,
): SheetEntry => ({ id, title, rule, example, prompt });
const question = (
  id: string,
  prompt: Bilingual,
  options: Bilingual[],
  answer: number,
  explanation: Bilingual,
): SheetQuestion => ({ id, prompt, options, answer, explanation });
export const cheatSheets: CheatSheet[] = [
  {
    id: 'arguments',
    title: bi('Argumentieren', 'Build an argument'),
    skills: ['lesen', 'schreiben', 'sprechen'],
    intro: bi(
      'Verbinde deine Position mit Gründen, Beispielen und einer begründeten Abwägung.',
      'Connect your position to reasons, examples and a reasoned judgement.',
    ),
    entries: [
      entry(
        'claim',
        bi('Eine Position formulieren', 'State a position'),
        bi(
          'Nenne eine klare, begrenzte Aussage. Vermeide unbegründete Verallgemeinerungen.',
          'Make a clear, bounded claim. Avoid unsupported generalisations.',
        ),
        bi(
          'Meiner Ansicht nach sollten Bibliotheken am Wochenende länger geöffnet bleiben.',
          'In my view, libraries should stay open longer at weekends.',
        ),
        bi(
          'Formuliere eine Position zu längeren Öffnungszeiten.',
          'State a position on longer opening hours.',
        ),
      ),
      entry(
        'reason',
        bi('Begründen', 'Give a reason'),
        bi(
          'Erkläre, warum dein Argument die Position stützt. Nach „weil“ steht das konjugierte Verb am Ende.',
          'Explain why your reason supports the position. After “weil”, the finite verb comes last.',
        ),
        bi(
          'Das wäre hilfreich, weil viele Studierende unter der Woche arbeiten.',
          'That would help because many students work during the week.',
        ),
        bi(
          'Begründe die Position mit „weil“.',
          'Support the position using “weil”.',
        ),
      ),
      entry(
        'evidence',
        bi('Ein Beispiel geben', 'Give an example'),
        bi(
          'Kennzeichne Beispiele als Beispiele. Erfunde keine Studien oder Zahlen als Belege.',
          'Present examples as examples. Do not invent studies or numbers as evidence.',
        ),
        bi(
          'Zum Beispiel könnten berufstätige Studierende den Samstag zum Lernen nutzen.',
          'For example, working students could use Saturday to study.',
        ),
        bi('Ergänze ein konkretes Beispiel.', 'Add a concrete example.'),
      ),
      entry(
        'balance',
        bi('Abwägen und folgern', 'Weigh up and conclude'),
        bi(
          'Nenne einen Einwand und erkläre, wie du ihn gewichtest.',
          'Name an objection and explain how you weigh it.',
        ),
        bi(
          'Zwar entstehen zusätzliche Kosten, dennoch halte ich einen befristeten Versuch für sinnvoll.',
          'Although additional costs arise, I still consider a limited trial worthwhile.',
        ),
        bi(
          'Verbinde einen Einwand mit deinem Fazit.',
          'Connect an objection to your conclusion.',
        ),
      ),
    ],
    questions: [
      question(
        'arg-q1',
        bi(
          'Welche Aussage enthält eine Begründung?',
          'Which statement gives a reason?',
        ),
        [
          bi('Die Bibliothek ist wichtig.', 'The library is important.'),
          bi(
            'Längere Öffnungszeiten helfen, weil nicht alle zu Hause ruhig lernen können.',
            'Longer hours help because not everyone can study quietly at home.',
          ),
          bi('Das finde ich gut.', 'I think that is good.'),
        ],
        1,
        bi(
          'Der weil-Satz erklärt, warum die Änderung hilfreich wäre.',
          'The “weil” clause explains why the change would help.',
        ),
      ),
      question(
        'arg-q2',
        bi(
          'Du hast keine Studie vorliegen. Welche Formulierung ist angemessen?',
          'You have no study available. Which wording is appropriate?',
        ),
        [
          bi('Alle Studien beweisen das.', 'All studies prove it.'),
          bi('Genau 92 Prozent stimmen zu.', 'Exactly 92 percent agree.'),
          bi(
            'Ein möglicher Vorteil wäre mehr Flexibilität.',
            'One possible benefit would be more flexibility.',
          ),
        ],
        2,
        bi(
          'Eine mögliche Folge lässt sich diskutieren, ohne erfundene Belege anzuführen.',
          'You can discuss a possible consequence without inventing evidence.',
        ),
      ),
    ],
  },
  {
    id: 'connectors',
    title: bi('Gedanken verbinden', 'Connect ideas'),
    skills: ['lesen', 'hoeren', 'schreiben', 'sprechen'],
    intro: bi(
      'Wähle zuerst die Beziehung zwischen den Aussagen: Grund, Folge, Gegensatz oder Ergänzung.',
      'First choose the relationship: reason, consequence, contrast or addition.',
    ),
    entries: [
      entry(
        'because',
        bi('Grund: weil', 'Reason: weil'),
        bi(
          '„Weil“ leitet einen Nebensatz ein; das konjugierte Verb steht am Ende.',
          '“Weil” introduces a subordinate clause; the finite verb goes at the end.',
        ),
        bi(
          'Sie lernt online, weil sie weit entfernt wohnt.',
          'She studies online because she lives far away.',
        ),
        bi(
          'Verbinde: Sie lernt online. Sie wohnt weit entfernt.',
          'Connect: She studies online. She lives far away.',
        ),
      ),
      entry(
        'therefore',
        bi('Folge: deshalb', 'Consequence: deshalb'),
        bi(
          'Steht „deshalb“ am Satzanfang, folgt direkt das konjugierte Verb.',
          'When “deshalb” starts the sentence, the finite verb follows immediately.',
        ),
        bi(
          'Sie wohnt weit entfernt. Deshalb lernt sie online.',
          'She lives far away. Therefore, she studies online.',
        ),
        bi(
          'Beginne den zweiten Satz mit „Deshalb“.',
          'Start the second sentence with “Deshalb”.',
        ),
      ),
      entry(
        'although',
        bi('Gegensatz: obwohl / trotzdem', 'Contrast: obwohl / trotzdem'),
        bi(
          '„Obwohl“ bildet einen Nebensatz. „Trotzdem“ kann im Hauptsatz vor dem konjugierten Verb stehen.',
          '“Obwohl” introduces a subordinate clause. “Trotzdem” can precede the finite verb in a main clause.',
        ),
        bi(
          'Obwohl der Kurs anspruchsvoll ist, macht er ihr Spaß. Der Kurs ist anspruchsvoll. Trotzdem macht er ihr Spaß.',
          'Although the course is demanding, she enjoys it. The course is demanding. Nevertheless, she enjoys it.',
        ),
        bi(
          'Formuliere denselben Gegensatz einmal mit „obwohl“ und einmal mit „trotzdem“.',
          'Express the same contrast with “obwohl”, then “trotzdem”.',
        ),
      ),
      entry(
        'addition',
        bi('Ergänzung: außerdem', 'Addition: außerdem'),
        bi(
          'Ergänze einen weiteren Punkt. Ein zusätzlicher Punkt ist nicht automatisch eine Folge.',
          'Add another point. An additional point is not automatically a consequence.',
        ),
        bi(
          'Der Kurs ist flexibel. Außerdem sind die Materialien jederzeit verfügbar.',
          'The course is flexible. In addition, the materials are available at any time.',
        ),
        bi('Füge einen zweiten Vorteil hinzu.', 'Add a second benefit.'),
      ),
    ],
    questions: [
      question(
        'conn-q1',
        bi(
          'Ergänze: „Er ist krank. Deshalb …“',
          'Complete: “Er ist krank. Deshalb …”',
        ),
        [
          bi('er bleibt zu Hause.', 'er bleibt zu Hause.'),
          bi('bleibt er zu Hause.', 'bleibt er zu Hause.'),
          bi('er zu Hause bleibt.', 'er zu Hause bleibt.'),
        ],
        1,
        bi(
          'Nach „deshalb“ an erster Position folgt das konjugierte Verb „bleibt“.',
          'After initial “deshalb”, the finite verb “bleibt” follows.',
        ),
      ),
      question(
        'conn-q2',
        bi('Welcher Satz ist korrekt?', 'Which sentence is correct?'),
        [
          bi(
            'Obwohl es regnet, gehen wir spazieren.',
            'Obwohl es regnet, gehen wir spazieren.',
          ),
          bi(
            'Obwohl regnet es, gehen wir spazieren.',
            'Obwohl regnet es, gehen wir spazieren.',
          ),
          bi(
            'Obwohl es regnet, wir gehen spazieren.',
            'Obwohl es regnet, wir gehen spazieren.',
          ),
        ],
        0,
        bi(
          'Im obwohl-Satz steht „regnet“ am Ende. Danach beginnt der Hauptsatz mit „gehen“.',
          '“Regnet” ends the subordinate clause. The main clause then starts with “gehen”.',
        ),
      ),
    ],
  },
  {
    id: 'graphs',
    title: bi('Grafiken beschreiben', 'Describe a graph'),
    skills: ['lesen', 'schreiben', 'sprechen'],
    intro: bi(
      'Benenne Thema, Einheit und Zeitraum. Beschreibe die wichtigsten Unterschiede, bevor du sie deutest. Die Zahlen hier sind erfundene Übungsdaten.',
      'Identify the topic, unit and period. Describe the main differences before interpreting them. These numbers are fictional practice data.',
    ),
    entries: [
      entry(
        'frame',
        bi('Die Grafik einordnen', 'Introduce the graph'),
        bi(
          'Nenne nur Angaben, die tatsächlich vorliegen: Thema, Zeitraum, Einheit und gegebenenfalls Quelle.',
          'Only name information actually supplied: topic, period, unit and source where available.',
        ),
        bi(
          'Die Grafik zeigt den Anteil der Onlinekurse in den Jahren 2020 und 2025 in Prozent.',
          'The graph shows the percentage of online courses in 2020 and 2025.',
        ),
        bi(
          'Wie würdest du Thema, Zeitraum und Einheit nennen?',
          'How would you introduce the topic, period and unit?',
        ),
      ),
      entry(
        'trend',
        bi('Eine Veränderung beschreiben', 'Describe a change'),
        bi(
          '„Von … auf …“ nennt Ausgangs- und Endwert. „Um …“ bezeichnet die Differenz.',
          '“Von … auf …” gives start and end values. “Um …” gives the difference.',
        ),
        bi(
          'Der Anteil steigt von 20 auf 30 Prozent, also um 10 Prozentpunkte.',
          'The share rises from 20 to 30 percent: an increase of 10 percentage points.',
        ),
        bi(
          'Beschreibe einen Anstieg von 20 auf 30 Prozent.',
          'Describe a rise from 20 to 30 percent.',
        ),
      ),
      entry(
        'compare',
        bi('Vergleichen', 'Compare'),
        bi(
          'Vergleiche Werte mit derselben Einheit. „Doppelt so hoch“ bezeichnet ein Verhältnis von zwei zu eins.',
          'Compare values with the same unit. “Twice as high” means a two-to-one ratio.',
        ),
        bi(
          'Mit 40 Prozent ist der Anteil in Gruppe A doppelt so hoch wie in Gruppe B mit 20 Prozent.',
          'At 40 percent, the share in group A is twice that in group B at 20 percent.',
        ),
        bi(
          'Vergleiche Gruppe A (40 %) und Gruppe B (20 %).',
          'Compare group A (40%) with group B (20%).',
        ),
      ),
      entry(
        'interpret',
        bi(
          'Beobachtung und Deutung trennen',
          'Separate observation and interpretation',
        ),
        bi(
          'Eine Grafik zeigt nicht automatisch Ursachen. Kennzeichne eine Erklärung als Vermutung.',
          'A graph does not automatically establish causes. Label an explanation as a possibility.',
        ),
        bi(
          'Der Anteil ist gestiegen. Ein möglicher Grund könnte das größere Angebot sein.',
          'The share has increased. One possible reason could be the wider range available.',
        ),
        bi(
          'Ergänze eine vorsichtige Deutung des Anstiegs.',
          'Add a cautious interpretation of the increase.',
        ),
      ),
    ],
    questions: [
      question(
        'graph-q1',
        bi(
          'Von 20 % auf 30 %: Wie groß ist die Differenz?',
          'From 20% to 30%: what is the difference?',
        ),
        [
          bi('10 Prozentpunkte', '10 percentage points'),
          bi('30 Prozentpunkte', '30 percentage points'),
          bi('10 Personen', '10 people'),
        ],
        0,
        bi(
          '30 minus 20 ergibt 10 Prozentpunkte. Relativ zum Ausgangswert sind es 50 Prozent mehr.',
          '30 minus 20 is 10 percentage points. Relative to the starting value, this is a 50 percent increase.',
        ),
      ),
      question(
        'graph-q2',
        bi(
          'Die Grafik nennt keine Ursache. Welche Formulierung passt?',
          'The graph gives no cause. Which wording fits?',
        ),
        [
          bi('Die Grafik beweist die Ursache.', 'The graph proves the cause.'),
          bi(
            'Eine mögliche Erklärung wäre …',
            'One possible explanation would be …',
          ),
          bi('Der einzige Grund ist …', 'The only reason is …'),
        ],
        1,
        bi(
          '„Eine mögliche Erklärung“ unterscheidet eine Vermutung von einer belegten Ursache.',
          '“One possible explanation” distinguishes a hypothesis from an established cause.',
        ),
      ),
    ],
  },
  {
    id: 'listen-speak',
    title: bi('Zuhören und antworten', 'Listen and respond'),
    skills: ['hoeren', 'sprechen'],
    intro: bi(
      'Halte die Kernaussage fest und baue daraus eine strukturierte Antwort.',
      'Capture the main point and use it to build a structured response.',
    ),
    entries: [
      entry(
        'notes',
        bi('Gezielt notieren', 'Take focused notes'),
        bi(
          'Notiere Thema, Position, Gründe und wichtige Einschränkungen in Stichwörtern.',
          'Note the topic, position, reasons and important qualifications using keywords.',
        ),
        bi(
          'Thema: Onlinekurse · Vorteil: flexibel · Grenze: wenig persönlicher Austausch',
          'Topic: online courses · benefit: flexible · limitation: little personal interaction',
        ),
        bi(
          'Welche vier Arten von Information würdest du notieren?',
          'Which four types of information would you note?',
        ),
      ),
      entry(
        'signals',
        bi('Auf Signale achten', 'Listen for signposts'),
        bi(
          'Wörter wie „allerdings“, „zum Beispiel“ und „abschließend“ zeigen, wie die Aussage aufgebaut ist.',
          'Words such as “allerdings”, “zum Beispiel” and “abschließend” signal the structure.',
        ),
        bi(
          'Das Angebot ist flexibel. Allerdings fehlt manchmal der direkte Austausch.',
          'The offer is flexible. However, direct interaction is sometimes missing.',
        ),
        bi(
          'Was kündigt „allerdings“ hier an?',
          'What does “allerdings” signal here?',
        ),
      ),
      entry(
        'outline',
        bi('Eine Antwort gliedern', 'Outline a response'),
        bi(
          'Beginne mit deiner Hauptaussage, nenne einen Grund und ein Beispiel, und schließe mit einem kurzen Fazit.',
          'Start with your main point, give a reason and an example, and finish with a brief conclusion.',
        ),
        bi(
          'Ich halte … für sinnvoll. Dafür spricht … Ein Beispiel ist … Deshalb würde ich …',
          'I consider … useful. One reason is … An example is … Therefore, I would …',
        ),
        bi(
          'Sprich eine kurze Antwort mit diesen vier Schritten.',
          'Give a short response using these four steps.',
        ),
      ),
      entry(
        'self-check',
        bi('Die Aufnahme überprüfen', 'Review your recording'),
        bi(
          'Höre deine Aufnahme an: Ist die Hauptaussage klar? Sind Gründe verständlich? Welche Stelle möchtest du erneut formulieren?',
          'Listen to your recording: is the main point clear? Are the reasons understandable? Which part would you rephrase?',
        ),
        bi(
          'Mein Hauptargument ist klar. Den zweiten Satz möchte ich kürzer formulieren.',
          'My main argument is clear. I would like to make the second sentence shorter.',
        ),
        bi(
          'Nenne nach dem Anhören eine Stärke und einen nächsten Schritt.',
          'After listening, name one strength and one next step.',
        ),
      ),
    ],
    questions: [
      question(
        'listen-q1',
        bi(
          'Was ist für kurze Notizen am hilfreichsten?',
          'What is most useful for brief notes?',
        ),
        [
          bi(
            'Jedes Wort vollständig abschreiben.',
            'Write down every word in full.',
          ),
          bi(
            'Nur einzelne Zahlen ohne Bezug notieren.',
            'Note only numbers without context.',
          ),
          bi(
            'Kernaussage, Gründe und Einschränkungen festhalten.',
            'Capture the main point, reasons and qualifications.',
          ),
        ],
        2,
        bi(
          'Strukturierte Stichwörter helfen, den Gedankengang zu rekonstruieren.',
          'Structured keywords help you reconstruct the argument.',
        ),
      ),
      question(
        'listen-q2',
        bi(
          'Welche Selbstkontrolle führt zu einem konkreten nächsten Schritt?',
          'Which self-check produces a concrete next step?',
        ),
        [
          bi(
            'Ich formuliere den unklaren zweiten Satz neu.',
            'I will rephrase the unclear second sentence.',
          ),
          bi(
            'Alles muss sofort perfekt sein.',
            'Everything must be perfect immediately.',
          ),
          bi(
            'Die Länge beweist meine Sprachkompetenz.',
            'Length proves my language ability.',
          ),
        ],
        0,
        bi(
          'Eine bestimmte Stelle zu verbessern ist ein umsetzbares Ziel; die Aufnahme ist keine automatische Prüfungsauswertung.',
          'Improving a specific passage is actionable; a recording is not an automatic exam assessment.',
        ),
      ),
    ],
  },
];
