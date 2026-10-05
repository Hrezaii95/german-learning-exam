// App-authored practice. These items are not transcriptions, translations or answer keys from the book.
export type Bilingual = { de: string; en: string };
export const bi = (de: string, en: string): Bilingual => ({ de, en });
export type Skill = 'lesen' | 'hoeren' | 'schreiben' | 'sprechen';
export type Exercise = {
  id: string;
  kind: 'choice' | 'multi' | 'gap' | 'order' | 'write' | 'speak';
  prompt: Bilingual;
  text?: string;
  options?: string[];
  answer?: string[];
  hint: Bilingual;
  explanation: Bilingual;
  model?: string;
  checklist?: Bilingual[];
  minWords?: number;
};
export type Lesson = {
  id: string;
  revision: string;
  origin: 'app-demo' | 'provisional-source' | 'reviewed-source';
  skill: Skill;
  title: Bilingual;
  objective: Bilingual;
  strategy: Bilingual;
  minutes: number;
  bookPage: number;
  passage: string;
  support: string;
  audio?: boolean;
  audioUrl?: string;
  sectionId?: string;
  provenance?: {
    sourceId: string;
    sourceSha256: string;
    unitId: string;
    revision: string;
    status: string;
    semanticApproved: boolean;
    relationshipsReviewed: boolean;
    sectionId?: string;
    textSha256?: string;
    bundleManifest?: string;
    sourcePath?: string;
  };
  teacher: {
    warmup: Bilingual;
    teach: Bilingual;
    support: Bilingual;
    challenge: Bilingual;
    exit: Bilingual;
  };
  exercises: Exercise[];
};
const q = (
  id: string,
  kind: Exercise['kind'],
  prompt: Bilingual,
  options: string[],
  answer: string[],
  hint: Bilingual,
  explanation: Bilingual,
): Exercise => ({ id, kind, prompt, options, answer, hint, explanation });
const coach = (
  warmup: Bilingual,
  teach: Bilingual,
  support: Bilingual,
  challenge: Bilingual,
  exit: Bilingual,
) => ({ warmup, teach, support, challenge, exit });
export const lessons: Lesson[] = [
  {
    id: 'reading-campus',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'lesen',
    title: bi('Den roten Faden finden', 'Find the main idea'),
    minutes: 12,
    bookPage: 23,
    objective: bi(
      'Kernaussage und Belege in einem kurzen Sachtext unterscheiden.',
      'Distinguish a main claim from supporting evidence in a short academic text.',
    ),
    strategy: bi(
      'Lies zuerst die Frage. Markiere anschließend Aussage, Begründung und Einschränkung. Eine richtige Antwort muss durch den Text belegt sein.',
      'Read the question first. Identify the claim, reason and limitation. A correct answer needs evidence in the text.',
    ),
    passage:
      'Die Universitätsbibliothek testet längere Öffnungszeiten. Seit April bleibt sie an drei Abenden bis 23 Uhr geöffnet. In einer Befragung begrüßten besonders berufstätige Studierende die Änderung. Die Zahl der ausgeliehenen Bücher blieb jedoch unverändert. Nach sechs Monaten soll geprüft werden, ob die zusätzlichen Personalkosten dauerhaft getragen werden können.',
    support:
      'The university library is trialling longer opening hours on three evenings. Working students especially welcome this. Book loans have not increased; the cost of extra staff will be reviewed after six months.',
    teacher: coach(
      bi(
        'Wann und wo lernt ihr am besten? Sammelt zwei Bedürfnisse.',
        'Where and when do you study best? Collect two needs.',
      ),
      bi(
        'Lass Lernende für jede Antwort einen Textbeleg nennen. Vergleicht „begrüßen“ und „ausleihen“.',
        'Ask for textual evidence for every answer. Contrast welcoming a change with borrowing books.',
      ),
      bi(
        'Markiere Zeitangaben und erkläre „jedoch“.',
        'Highlight time expressions and explain “jedoch”.',
      ),
      bi(
        'Formuliert eine neutrale Überschrift und eine offene Forschungsfrage.',
        'Write a neutral headline and an unanswered research question.',
      ),
      bi(
        'Welche Schlussfolgerung lässt der Text nicht zu?',
        'Which conclusion cannot be drawn from the text?',
      ),
    ),
    exercises: [
      q(
        'rc-1',
        'choice',
        bi(
          'Welche Aussage fasst den Text am besten zusammen?',
          'Which statement best summarises the text?',
        ),
        [
          'Die Bibliothek erprobt längere Öffnungszeiten und prüft deren Finanzierung.',
          'Mehr ausgeliehene Bücher finanzieren längere Öffnungszeiten.',
          'Alle Bibliotheken bleiben künftig bis 23 Uhr geöffnet.',
        ],
        ['0'],
        bi(
          'Achte auf „testet“ und den letzten Satz.',
          'Look at “testet” and the final sentence.',
        ),
        bi(
          'Der Versuch und seine Finanzierung bilden den roten Faden. Mehr Ausleihen werden ausdrücklich nicht berichtet.',
          'The trial and its funding are the main thread. The text explicitly says loans did not increase.',
        ),
      ),
      q(
        'rc-2',
        'multi',
        bi(
          'Welche ZWEI Aussagen sind belegt?',
          'Which TWO statements are supported?',
        ),
        [
          'Die längeren Öffnungszeiten gelten an drei Abenden.',
          'Berufstätige Studierende begrüßen die Änderung besonders.',
          'Die Finanzierung ist dauerhaft gesichert.',
          'Die Zahl der Ausleihen ist gestiegen.',
        ],
        ['0', '1'],
        bi(
          'Trenne Beobachtungen von geplanten Prüfungen.',
          'Distinguish observations from planned reviews.',
        ),
        bi(
          'Drei Abende und die Rückmeldung berufstätiger Studierender stehen im Text. Finanzierung und höhere Ausleihen sind nicht belegt.',
          'Three evenings and working students’ feedback are explicit. Permanent funding and increased borrowing are not supported.',
        ),
      ),
      q(
        'rc-3',
        'gap',
        bi(
          'Welches Wort im Text signalisiert einen Gegensatz?',
          'Which word in the text signals a contrast?',
        ),
        [],
        ['jedoch'],
        bi(
          'Suche im Satz über die ausgeliehenen Bücher.',
          'Look in the sentence about borrowed books.',
        ),
        bi(
          '„Jedoch“ stellt die unveränderten Ausleihen der positiven Rückmeldung gegenüber.',
          '“Jedoch” contrasts unchanged borrowing with positive feedback.',
        ),
      ),
    ],
  },
  {
    id: 'reading-argument',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'lesen',
    title: bi('Argumente verbinden', 'Connect an argument'),
    minutes: 14,
    bookPage: 18,
    objective: bi(
      'Bezüge und Konnektoren nutzen, um eine Argumentation zu ordnen.',
      'Use references and connectors to order an argument.',
    ),
    strategy: bi(
      'Suche zuerst die Einführung. Wörter wie „dieser“ brauchen einen Bezug. „Deshalb“ leitet eine Folge ein; „allerdings“ eine Einschränkung.',
      'Find the introduction first. Words like “dieser” need an antecedent. “Deshalb” introduces a consequence; “allerdings” a limitation.',
    ),
    passage:
      'Viele Hochschulen fördern das Fahrradfahren. Ein neues Leihsystem soll den Weg zwischen den Gebäuden erleichtern. Dieser Service ist für Studierende kostenlos. Allerdings fehlen an manchen Standorten sichere Abstellplätze. Deshalb plant die Hochschule zusätzliche Fahrradständer.',
    support:
      'A university introduces free bike rental for travel between buildings. Some locations lack safe parking, so the university plans more bike stands.',
    teacher: coach(
      bi(
        'Was macht einen Text zusammenhängend? Sammelt Verweiswörter.',
        'What makes a text coherent? Collect reference words.',
      ),
      bi(
        'Deckt den Text nach dem Lesen ab und rekonstruiert die Argumentation.',
        'Hide the passage after reading and reconstruct its argument.',
      ),
      bi(
        'Beginnt mit dem Satz ohne Rückverweis.',
        'Start with the sentence that does not refer backwards.',
      ),
      bi(
        'Ersetzt „deshalb“ durch eine passende Konstruktion mit „weil“.',
        'Replace “deshalb” with an appropriate “weil” construction.',
      ),
      bi(
        'Erklärt einen Rückverweis mit eigenen Worten.',
        'Explain one reference in your own words.',
      ),
    ),
    exercises: [
      q(
        'ra-1',
        'order',
        bi(
          'Ordne die Sätze zu einer logischen Kurzfassung.',
          'Order the sentences into a logical summary.',
        ),
        [
          'Deshalb werden zusätzliche Fahrradständer geplant.',
          'Die Hochschule führt ein kostenloses Leihsystem ein.',
          'Allerdings fehlen sichere Abstellplätze.',
        ],
        ['1', '2', '0'],
        bi(
          'Einführung → Problem → Reaktion.',
          'Introduction → problem → response.',
        ),
        bi(
          'Zuerst wird das System eingeführt, dann das Problem genannt, dann die Reaktion beschrieben.',
          'The system is introduced first, followed by the problem and the response.',
        ),
      ),
      q(
        'ra-2',
        'choice',
        bi(
          'Worauf bezieht sich „Dieser Service“?',
          'What does “Dieser Service” refer to?',
        ),
        [
          'Auf die Fahrradständer',
          'Auf das neue Leihsystem',
          'Auf die Hochschulgebäude',
        ],
        ['1'],
        bi(
          'Lies den unmittelbar vorhergehenden Satz.',
          'Read the immediately preceding sentence.',
        ),
        bi(
          '„Dieser Service“ nimmt das neue Leihsystem wieder auf.',
          '“Dieser Service” refers back to the new rental system.',
        ),
      ),
      q(
        'ra-3',
        'gap',
        bi(
          'Ergänze mit „deshalb“ oder „allerdings“: Es fehlen Abstellplätze. ___ plant die Hochschule zusätzliche Fahrradständer.',
          'Complete with “deshalb” or “allerdings”: Es fehlen Abstellplätze. ___ plant die Hochschule zusätzliche Fahrradständer.',
        ),
        [],
        ['deshalb'],
        bi(
          'Der zweite Satz beschreibt eine Folge.',
          'The second sentence describes a consequence.',
        ),
        bi(
          '„Deshalb“ verbindet Ursache und Folge. „Allerdings“ würde einen Gegensatz ausdrücken.',
          '“Deshalb” connects cause and consequence. “Allerdings” would express contrast.',
        ),
      ),
    ],
  },
  {
    id: 'listening-details',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'hoeren',
    title: bi('Das Wesentliche heraushören', 'Listen for key details'),
    minutes: 12,
    bookPage: 55,
    audio: true,
    objective: bi(
      'Termin, Anlass und Handlungsauftrag aus einer Ansage heraushören.',
      'Identify a time, a reason and an action from an announcement.',
    ),
    strategy: bi(
      'Lies die Fragen vor dem Hören. Notiere Stichwörter statt ganzer Sätze. Prüfe beim zweiten Hören besonders Zahlen und Änderungen.',
      'Read the questions before listening. Note keywords instead of full sentences. On a second listen, check numbers and changes.',
    ),
    passage:
      'Guten Morgen! Das Tutorium zur Statistik findet morgen ausnahmsweise um vierzehn Uhr statt, nicht um dreizehn Uhr. Der Raum bleibt unverändert: B zweihundertvier. Bitte bringen Sie Ihren Laptop mit. Die Übungsdatei steht heute Abend im Lernportal bereit. Eine Anmeldung ist nicht erforderlich.',
    support:
      'The statistics tutorial is tomorrow at 14:00 instead of 13:00. The room is unchanged: B204. Bring a laptop; the exercise file will be in the learning portal this evening. No registration is required.',
    teacher: coach(
      bi(
        'Welche Informationen braucht ihr für eine Terminänderung?',
        'What information do you need when an appointment changes?',
      ),
      bi(
        'Spiele die Ansage einmal ohne Mitschrift, dann mit einem Raster: wann, wo, was.',
        'Play once without notes, then use a when / where / what grid.',
      ),
      bi(
        'Erkläre „ausnahmsweise“ vor dem Hören.',
        'Explain “ausnahmsweise” before listening.',
      ),
      bi(
        'Lasst Lernende eine ähnliche Ansage mit zwei Änderungen formulieren.',
        'Have learners create a similar announcement with two changes.',
      ),
      bi(
        'Nenne die Änderung und eine unveränderte Information.',
        'Name the change and one unchanged detail.',
      ),
    ),
    exercises: [
      q(
        'ld-1',
        'choice',
        bi(
          'Wann beginnt das Tutorium morgen?',
          'When does tomorrow’s tutorial start?',
        ),
        ['Um 13 Uhr', 'Um 14 Uhr', 'Um 12 Uhr'],
        ['1'],
        bi(
          'Die erste Uhrzeit ist der neue Termin.',
          'The first time mentioned is the new time.',
        ),
        bi(
          'Die Ansage sagt „um vierzehn Uhr … nicht um dreizehn Uhr“.',
          'The announcement says “at fourteen … not at thirteen”.',
        ),
      ),
      q(
        'ld-2',
        'gap',
        bi(
          'In welchem Raum findet es statt?',
          'In which room does it take place?',
        ),
        [],
        ['B204', 'B 204', 'B zweihundertvier'],
        bi(
          'Notiere Buchstabe und Raumnummer.',
          'Write the letter and room number.',
        ),
        bi(
          'Der Raum bleibt B204. Nur die Uhrzeit ändert sich.',
          'The room remains B204. Only the time changes.',
        ),
      ),
      q(
        'ld-3',
        'multi',
        bi(
          'Welche ZWEI Aussagen stimmen?',
          'Which TWO statements are correct?',
        ),
        [
          'Ein Laptop soll mitgebracht werden.',
          'Eine Anmeldung ist nötig.',
          'Die Datei ist heute Abend online verfügbar.',
          'Das Tutorium findet in einem neuen Raum statt.',
        ],
        ['0', '2'],
        bi(
          'Achte auf „bitte bringen“ und „steht … bereit“.',
          'Listen for “bitte bringen” and “steht … bereit”.',
        ),
        bi(
          'Laptop mitbringen und die Datei am Abend abrufen: Das sind die beiden belegten Aussagen.',
          'Bringing a laptop and accessing the file that evening are the supported statements.',
        ),
      ),
    ],
  },
  {
    id: 'listening-positions',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'hoeren',
    title: bi('Standpunkte unterscheiden', 'Distinguish viewpoints'),
    minutes: 15,
    bookPage: 70,
    audio: true,
    objective: bi(
      'Zwei Positionen vergleichen, ohne Zustimmung und Einschränkung zu verwechseln.',
      'Compare two viewpoints while distinguishing support from reservations.',
    ),
    strategy: bi(
      'Notiere für jede Person: Position, Begründung, Einschränkung. Ein „aber“ kann die Aussage entscheidend verändern.',
      'For each speaker, note position, reason and limitation. A “but” can change the meaning significantly.',
    ),
    passage:
      'Anna sagt: Ich finde aufgezeichnete Vorlesungen hilfreich, weil ich schwierige Stellen wiederholen kann. Den Austausch im Seminar ersetzen sie aber nicht. Ben sagt: Für mich sind Aufzeichnungen vor allem praktisch, wenn ich wegen meiner Arbeit nicht teilnehmen kann. Ich schaue sie allerdings oft erst kurz vor der Prüfung an.',
    support:
      'Anna values replaying difficult sections but says recordings cannot replace seminar discussion. Ben uses recordings when work prevents attendance, although he often watches them only just before the exam.',
    teacher: coach(
      bi(
        'Wann helfen Aufzeichnungen? Sammelt Vor- und Nachteile.',
        'When do recordings help? Collect advantages and disadvantages.',
      ),
      bi(
        'Erstellt zwei Spalten mit Aussagen von Anna und Ben. Begründet jede Zuordnung.',
        'Create Anna and Ben columns. Justify each attribution.',
      ),
      bi(
        'Pausiere nach jedem Sprecher und sammle ein Schlüsselwort.',
        'Pause after each speaker and collect one keyword.',
      ),
      bi(
        'Formuliert eine Gemeinsamkeit und einen Unterschied ohne Zitat.',
        'Paraphrase one similarity and one difference.',
      ),
      bi(
        'Welche Einschränkung nennt Anna?',
        'What limitation does Anna mention?',
      ),
    ),
    exercises: [
      q(
        'lp-1',
        'choice',
        bi(
          'Wer nennt das Wiederholen schwieriger Stellen als Vorteil?',
          'Who mentions replaying difficult sections as an advantage?',
        ),
        ['Ben', 'Anna', 'Beide ausdrücklich'],
        ['1'],
        bi(
          'Höre auf „weil ich … wiederholen kann“.',
          'Listen for “weil ich … wiederholen kann”.',
        ),
        bi(
          'Anna nennt das gezielte Wiederholen. Ben betont die Vereinbarkeit mit seiner Arbeit.',
          'Anna mentions targeted replay. Ben emphasises fitting lectures around work.',
        ),
      ),
      q(
        'lp-2',
        'choice',
        bi(
          'Welche Einschränkung nennt Ben?',
          'What reservation does Ben mention?',
        ),
        [
          'Die Aufnahmen sind zu teuer.',
          'Er schaut sie oft erst kurz vor der Prüfung.',
          'Schwierige Stellen lassen sich nicht wiederholen.',
        ],
        ['1'],
        bi(
          'Achte auf seinen Satz mit „allerdings“.',
          'Listen to his sentence with “allerdings”.',
        ),
        bi(
          'Ben verschiebt das Anschauen häufig bis kurz vor die Prüfung. Kosten erwähnt er nicht.',
          'Ben often delays watching until shortly before the exam. He does not mention costs.',
        ),
      ),
      q(
        'lp-3',
        'multi',
        bi(
          'Welche ZWEI Aussagen geben die Positionen korrekt wieder?',
          'Which TWO statements reflect the positions accurately?',
        ),
        [
          'Anna hält Austausch weiterhin für wichtig.',
          'Ben nutzt Aufzeichnungen wegen seiner Arbeit.',
          'Anna möchte alle Seminare abschaffen.',
          'Ben schaut jede Aufnahme sofort.',
        ],
        ['0', '1'],
        bi(
          'Unterscheide geäußerte Positionen von übertriebenen Schlussfolgerungen.',
          'Distinguish stated positions from exaggerated conclusions.',
        ),
        bi(
          'Beide sehen einen Nutzen. Anna betont Austausch; Ben nennt seine Arbeit als Anlass.',
          'Both see a benefit. Anna values discussion; Ben cites work as a reason.',
        ),
      ),
    ],
  },
  {
    id: 'writing-position',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'schreiben',
    title: bi('Eine Position begründen', 'Build a supported position'),
    minutes: 20,
    bookPage: 95,
    objective: bi(
      'Eine These mit Begründung, Beispiel und Einschränkung entwickeln.',
      'Develop a claim with a reason, example and qualification.',
    ),
    strategy: bi(
      'Plane vor dem Schreiben: Position → Grund → Beispiel → Gegenargument → Schluss. Präzision ist wichtiger als möglichst viele Konnektoren.',
      'Plan before writing: position → reason → example → counterargument → conclusion. Precision matters more than the number of connectors.',
    ),
    passage:
      'Diskussionsfrage: Sollten Hochschulen alle Vorlesungen zusätzlich als Aufzeichnung bereitstellen? Berücksichtige zeitliche Flexibilität und den persönlichen Austausch.',
    support:
      'Discussion: Should universities provide recordings of all lectures? Consider flexibility and face-to-face discussion. The practice length below is a demo target, not an official exam requirement.',
    teacher: coach(
      bi(
        'Positioniert euch: dafür, dagegen oder unter Bedingungen?',
        'Choose a position: for, against or conditional?',
      ),
      bi(
        'Modelliere eine These und unterscheide Begründung von Beispiel. Danach gegenseitiges Feedback mit der Checkliste.',
        'Model a claim and distinguish reason from example. Then use the checklist for peer feedback.',
      ),
      bi(
        'Biete Satzanfänge an: „Ich halte … für sinnvoll, weil …“.',
        'Offer starters: “Ich halte … für sinnvoll, weil …”.',
      ),
      bi(
        'Fordere ein ernst genommenes Gegenargument und eine differenzierte Antwort.',
        'Require a substantial counterargument and a nuanced response.',
      ),
      bi(
        'Unterstreiche im eigenen Text den stärksten Beleg.',
        'Underline the strongest support in your text.',
      ),
    ),
    exercises: [
      q(
        'wp-1',
        'choice',
        bi(
          'Welcher Satz enthält eine Begründung?',
          'Which sentence gives a reason?',
        ),
        [
          'Aufzeichnungen sind ein aktuelles Thema.',
          'Aufzeichnungen sind hilfreich, weil Studierende schwierige Passagen wiederholen können.',
          'Viele Menschen haben eine Meinung.',
        ],
        ['1'],
        bi(
          'Eine Begründung beantwortet die Frage „Warum?“.',
          'A reason answers “Why?”.',
        ),
        bi(
          'Der weil-Satz nennt einen konkreten Nutzen und stützt die Behauptung.',
          'The “weil” clause names a specific benefit and supports the claim.',
        ),
      ),
      q(
        'wp-2',
        'order',
        bi(
          'Ordne die Bausteine zu einem kurzen Argument.',
          'Order the building blocks into a short argument.',
        ),
        [
          'So kann beispielsweise eine Studentin nach einer Arbeitsschicht den Stoff nachholen.',
          'Daher halte ich ergänzende Aufzeichnungen für sinnvoll.',
          'Aufzeichnungen ermöglichen zeitlich flexibles Lernen.',
        ],
        ['2', '0', '1'],
        bi(
          'Allgemeiner Grund → konkretes Beispiel → Schluss.',
          'General reason → specific example → conclusion.',
        ),
        bi(
          'Das Beispiel veranschaulicht den Nutzen; „daher“ schließt die Argumentation ab.',
          'The example illustrates the benefit; “daher” introduces the conclusion.',
        ),
      ),
      {
        id: 'wp-3',
        kind: 'write',
        prompt: bi(
          'Schreibe eine begründete Stellungnahme (Übungsziel: 100–150 Wörter).',
          'Write a supported position (practice target: 100–150 words).',
        ),
        minWords: 100,
        hint: bi(
          'Notiere zuerst deine These und ein Gegenargument.',
          'First note your claim and one counterargument.',
        ),
        explanation: bi(
          'Vergleiche Aufbau und Begründungen mit dem Beispiel. Es gibt mehrere gute Lösungen; eine Wortzahl ist keine Qualitätsbewertung.',
          'Compare structure and reasons with the example. Several answers are valid; a word count is not a quality score.',
        ),
        model:
          'Meiner Ansicht nach sollten Hochschulen Vorlesungen zusätzlich aufzeichnen. So könnten Studierende, die neben dem Studium arbeiten, verpasste Inhalte nachholen. Außerdem lassen sich schwierige Erklärungen wiederholt anhören. Ein Einwand ist, dass Studierende dann seltener persönlich teilnehmen. Deshalb sollten Aufzeichnungen durch Seminare ergänzt werden, in denen Fragen und Diskussionen im Mittelpunkt stehen. Sie wären damit eine Ergänzung und kein Ersatz für gemeinsamen Unterricht.',
        checklist: [
          bi('Meine Position ist klar.', 'My position is clear.'),
          bi(
            'Ich nenne einen Grund und ein konkretes Beispiel.',
            'I give a reason and a concrete example.',
          ),
          bi(
            'Ich berücksichtige ein Gegenargument.',
            'I consider a counterargument.',
          ),
          bi(
            'Ich habe Verben, Bezüge und Konnektoren geprüft.',
            'I checked verbs, references and connectors.',
          ),
        ],
      },
    ],
  },
  {
    id: 'writing-data',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'schreiben',
    title: bi('Daten präzise beschreiben', 'Describe data precisely'),
    minutes: 20,
    bookPage: 105,
    objective: bi(
      'Zahlen vergleichen und Beobachtung von Interpretation trennen.',
      'Compare figures and separate observation from interpretation.',
    ),
    strategy: bi(
      'Nenne Thema und Einheit. Beschreibe die wichtigste Veränderung. Prozentpunkte sind nicht Prozent. Erfinde keine Ursachen.',
      'State the topic and unit. Describe the main change. Percentage points are not percent. Do not invent causes.',
    ),
    passage:
      'Fiktive Übungsdaten: In einer gleich aufgebauten Befragung an einer Hochschule nutzten 2022 30 % und 2025 45 % der Befragten regelmäßig Lernvideos. Der Anteil regelmäßiger Lerngruppen blieb bei 25 %. Angaben zu Gründen wurden nicht erhoben.',
    support:
      'Fictional practice data: regular learning-video use rose from 30% in 2022 to 45% in 2025. Regular study-group use stayed at 25%. Reasons were not collected.',
    teacher: coach(
      bi(
        'Was ist der Unterschied zwischen 15 Prozent und 15 Prozentpunkten?',
        'What is the difference between 15 percent and 15 percentage points?',
      ),
      bi(
        'Lasst Zahlenpaare vergleichen und jede unbelegte Ursache streichen.',
        'Compare pairs of figures and remove unsupported causal claims.',
      ),
      bi(
        'Nutze ein Satzmuster: „Der Anteil stieg von … auf …“.',
        'Use a sentence frame: “Der Anteil stieg von … auf …”.',
      ),
      bi(
        'Berechne die relative Zunahme und erkläre, warum die Einheit entscheidend ist.',
        'Calculate the relative increase and explain why the unit matters.',
      ),
      bi(
        'Formuliere einen Satz, der keine Ursache behauptet.',
        'Write one sentence without claiming a cause.',
      ),
    ),
    exercises: [
      q(
        'wd-1',
        'gap',
        bi(
          'Um wie viele Prozentpunkte stieg der Anteil der Lernvideo-Nutzung? Gib nur die Zahl ein.',
          'By how many percentage points did learning-video use rise? Enter only the number.',
        ),
        [],
        ['15'],
        bi('Rechne 45 minus 30.', 'Calculate 45 minus 30.'),
        bi(
          '45 − 30 = 15 Prozentpunkte. Die relative Zunahme beträgt dagegen 50 Prozent.',
          '45 − 30 = 15 percentage points. The relative increase is 50 percent.',
        ),
      ),
      q(
        'wd-2',
        'choice',
        bi(
          'Welche Aussage bleibt bei den Daten?',
          'Which statement stays within the evidence?',
        ),
        [
          'Lernvideos verursachen bessere Noten.',
          'Der Anteil regelmäßiger Lerngruppen blieb unverändert.',
          'Alle Studierenden bevorzugen Videos.',
        ],
        ['1'],
        bi(
          'Gründe und Noten wurden nicht erhoben.',
          'Reasons and grades were not measured.',
        ),
        bi(
          '25 % in beiden Jahren belegt einen unveränderten Anteil. Die anderen Aussagen gehen über die Angaben hinaus.',
          '25% in both years supports an unchanged proportion. The other claims go beyond the data.',
        ),
      ),
      {
        id: 'wd-3',
        kind: 'write',
        prompt: bi(
          'Fasse die Angaben sachlich zusammen (Übungsziel: 70–110 Wörter).',
          'Summarise the data neutrally (practice target: 70–110 words).',
        ),
        minWords: 70,
        hint: bi(
          'Beginne mit Thema und Zeitraum. Vergleiche dann beide Lernformen.',
          'Start with the topic and period. Then compare both study methods.',
        ),
        explanation: bi(
          'Prüfe Zahlen, Einheiten und Reichweite deiner Aussage. Das Beispiel zeigt eine mögliche knappe Fassung.',
          'Check numbers, units and the scope of your claim. The example shows one concise version.',
        ),
        model:
          'Die fiktiven Befragungsdaten vergleichen zwei Lernformen in den Jahren 2022 und 2025. Der Anteil der Befragten, die regelmäßig Lernvideos nutzten, stieg von 30 auf 45 Prozent. Das entspricht einer Zunahme um 15 Prozentpunkte. Der Anteil regelmäßiger Lerngruppen blieb dagegen bei 25 Prozent. Über die Gründe dieser Entwicklung lassen sich aus den Angaben keine Aussagen ableiten.',
        checklist: [
          bi(
            'Thema und Zeitraum sind genannt.',
            'I name the topic and period.',
          ),
          bi(
            'Alle Zahlen und Einheiten stimmen.',
            'All figures and units are correct.',
          ),
          bi(
            'Ich vergleiche beide Lernformen.',
            'I compare both study methods.',
          ),
          bi('Ich erfinde keine Ursachen.', 'I do not invent causes.'),
        ],
      },
    ],
  },
  {
    id: 'speaking-advice',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'sprechen',
    title: bi('Einen Rat geben', 'Give useful advice'),
    minutes: 15,
    bookPage: 121,
    objective: bi(
      'Auf ein konkretes Problem mit begründetem, höflichem Rat reagieren.',
      'Respond to a specific problem with polite, reasoned advice.',
    ),
    strategy: bi(
      'Greife das Problem auf. Gib einen konkreten Vorschlag mit Begründung. Schließe mit einem umsetzbaren ersten Schritt.',
      'Acknowledge the problem. Give a concrete suggestion and reason. Finish with a practical first step.',
    ),
    passage:
      'Eine Kommilitonin arbeitet neben dem Studium. Sie verpasst häufig Vorlesungen und fühlt sich vor den Prüfungen überfordert. Sie fragt dich, wie sie ihr Lernen besser organisieren kann.',
    support:
      'A fellow student works alongside her studies. She often misses lectures and feels overwhelmed before exams. She asks how to organise her learning better.',
    teacher: coach(
      bi(
        'Was unterscheidet einen hilfreichen Rat von einem Vorwurf?',
        'What distinguishes helpful advice from blame?',
      ),
      bi(
        'Spielt das Gespräch zu zweit. Die zuhörende Person notiert Vorschlag und Begründung.',
        'Role-play in pairs. The listener notes the suggestion and reason.',
      ),
      bi(
        'Biete „An deiner Stelle würde ich …“ und „Du könntest …“ an.',
        'Offer “An deiner Stelle würde ich …” and “Du könntest …”.',
      ),
      bi(
        'Die Partnerin lehnt den ersten Vorschlag ab; reagiere flexibel.',
        'The partner rejects the first suggestion; respond flexibly.',
      ),
      bi(
        'Welcher erste Schritt ist realistisch?',
        'Which first step is realistic?',
      ),
    ),
    exercises: [
      q(
        'sa-1',
        'choice',
        bi(
          'Welcher Einstieg passt zu einem höflichen Rat?',
          'Which opening suits polite advice?',
        ),
        [
          'Du machst alles falsch.',
          'An deiner Stelle würde ich feste Lernzeiten einplanen.',
          'Das ist nicht mein Problem.',
        ],
        ['1'],
        bi(
          'Suche eine konstruktive, nicht vorwurfsvolle Formulierung.',
          'Look for constructive language without blame.',
        ),
        bi(
          '„An deiner Stelle würde ich …“ macht einen Vorschlag, ohne der Person Vorwürfe zu machen.',
          '“An deiner Stelle würde ich …” offers a suggestion without blaming the person.',
        ),
      ),
      q(
        'sa-2',
        'order',
        bi('Ordne die Gesprächsschritte.', 'Order the speaking steps.'),
        [
          'Schlage vor, heute einen Wochenplan zu erstellen.',
          'Zeige Verständnis für die Doppelbelastung.',
          'Empfiehl feste Lernzeiten und erkläre den Nutzen.',
        ],
        ['1', '2', '0'],
        bi(
          'Verständnis → Rat mit Grund → erster Schritt.',
          'Understanding → reasoned advice → first step.',
        ),
        bi(
          'Der Aufbau verbindet Empathie mit einem konkreten, begründeten Vorschlag.',
          'This structure combines empathy with a concrete, reasoned suggestion.',
        ),
      ),
      {
        id: 'sa-3',
        kind: 'speak',
        prompt: bi(
          'Gib deiner Kommilitonin einen Rat. Nutze den Übungstimer und höre deine Aufnahme anschließend an.',
          'Give your fellow student advice. Use the practice timer, then listen to your recording.',
        ),
        hint: bi(
          'Sprich mit der Person, nicht über sie. Nutze nur Stichwörter.',
          'Speak to the person, not about her. Use keyword notes only.',
        ),
        explanation: bi(
          'Beurteile Verständlichkeit und Aufbau mit der Checkliste. Es erfolgt keine automatische Aussprache- oder TestDaF-Bewertung.',
          'Use the checklist to review clarity and structure. There is no automatic pronunciation or TestDaF scoring.',
        ),
        model:
          'Ich kann gut verstehen, dass dich Arbeit und Studium gleichzeitig belasten. An deiner Stelle würde ich für jede Woche zwei feste Lernzeiten einplanen. So sammelt sich vor der Prüfung weniger Stoff an. Vielleicht könntest du auch mit einer Lerngruppe Mitschriften austauschen. Als ersten Schritt würde ich heute alle Termine in einen Wochenplan eintragen.',
        checklist: [
          bi('Ich gehe auf das Problem ein.', 'I address the problem.'),
          bi(
            'Mein Rat ist konkret und höflich.',
            'My advice is specific and polite.',
          ),
          bi('Ich begründe meinen Vorschlag.', 'I explain my suggestion.'),
          bi(
            'Ich spreche verständlich und mit sinnvollen Pausen.',
            'I speak clearly with useful pauses.',
          ),
        ],
      },
    ],
  },
  {
    id: 'speaking-weigh',
    revision: 'demo-2',
    origin: 'app-demo',
    skill: 'sprechen',
    title: bi('Optionen abwägen', 'Weigh the options'),
    minutes: 18,
    bookPage: 125,
    objective: bi(
      'Zwei Möglichkeiten vergleichen und eine begründete Entscheidung formulieren.',
      'Compare two options and justify a decision.',
    ),
    strategy: bi(
      'Vergleiche dieselben Kriterien für beide Optionen. Nenne einen Nachteil deiner bevorzugten Lösung und erkläre deine Priorität.',
      'Compare the same criteria for both options. Acknowledge a drawback of your preferred choice and explain your priority.',
    ),
    passage:
      'Deine Lerngruppe kann sich entweder abends online oder samstags auf dem Campus treffen. Online entfallen die Fahrzeiten, aber Ablenkungen zu Hause sind möglich. Auf dem Campus gibt es einen ruhigen Raum, jedoch müssen zwei Mitglieder jeweils 45 Minuten anreisen.',
    support:
      'Your study group can meet online in the evening or on campus on Saturdays. Online saves travel but may involve distractions. Campus offers a quiet room, but two members each travel 45 minutes.',
    teacher: coach(
      bi(
        'Wählt drei Kriterien für ein gutes Lerntreffen.',
        'Choose three criteria for a good study meeting.',
      ),
      bi(
        'Erstellt eine Vergleichsmatrix und hört anschließend auf nachvollziehbare Prioritäten.',
        'Create a comparison matrix, then listen for clear priorities.',
      ),
      bi(
        'Nutze „Einerseits … andererseits …“ und „Für mich überwiegt …“.',
        'Use “Einerseits … andererseits …” and “Für mich überwiegt …”.',
      ),
      bi(
        'Ändere ein Kriterium: Die Internetverbindung ist instabil. Wie ändert sich die Empfehlung?',
        'Change one criterion: internet is unstable. How does the recommendation change?',
      ),
      bi(
        'Welcher Nachteil bleibt bei deiner bevorzugten Lösung?',
        'What drawback remains in your preferred option?',
      ),
    ),
    exercises: [
      q(
        'sw-1',
        'multi',
        bi(
          'Welche ZWEI Kriterien nennt die Situation ausdrücklich?',
          'Which TWO criteria are explicitly mentioned?',
        ),
        [
          'Fahrzeit',
          'Mietkosten',
          'Konzentrationsbedingungen',
          'Prüfungsnoten',
        ],
        ['0', '2'],
        bi(
          'Achte auf Anreise, Ruhe und Ablenkung.',
          'Look for travel, quiet and distraction.',
        ),
        bi(
          'Fahrzeit und Konzentrationsbedingungen sind genannt. Kosten und Noten nicht.',
          'Travel time and conditions for concentration are mentioned. Costs and grades are not.',
        ),
      ),
      q(
        'sw-2',
        'choice',
        bi(
          'Welche Formulierung wägt wirklich ab?',
          'Which formulation genuinely weighs the options?',
        ),
        [
          'Online ist immer besser.',
          'Obwohl der Campus ruhiger ist, bevorzuge ich online, weil wir dadurch Fahrzeit sparen.',
          'Es gibt zwei Möglichkeiten.',
        ],
        ['1'],
        bi(
          'Eine Abwägung nennt einen Gegengrund und eine Priorität.',
          'A balanced judgement names a counterpoint and a priority.',
        ),
        bi(
          'Der Satz erkennt den Vorteil des Campus an und priorisiert die Zeitersparnis.',
          'The sentence acknowledges the campus advantage and prioritises saving time.',
        ),
      ),
      {
        id: 'sw-3',
        kind: 'speak',
        prompt: bi(
          'Empfiehl deiner Lerngruppe eine Option und begründe deine Wahl.',
          'Recommend one option to your study group and justify your choice.',
        ),
        hint: bi(
          'Nutze drei Stichwörter: Vorteil, Nachteil, Priorität.',
          'Use three keywords: advantage, drawback, priority.',
        ),
        explanation: bi(
          'Beide Entscheidungen sind vertretbar. Entscheidend ist, ob dein Vergleich und deine Priorität nachvollziehbar sind.',
          'Either decision can be justified. What matters is a clear comparison and priority.',
        ),
        model:
          'Beide Möglichkeiten haben Vorteile. Auf dem Campus könnten wir uns in einem ruhigen Raum gut konzentrieren. Allerdings wäre die Anreise für zwei Mitglieder lang. Ich würde deshalb zunächst ein Treffen online vorschlagen. Die gesparte Zeit könnten wir zum Lernen nutzen. Damit Ablenkungen begrenzt bleiben, sollten wir eine klare Tagesordnung und kurze Pausen vereinbaren.',
        checklist: [
          bi('Ich vergleiche beide Optionen.', 'I compare both options.'),
          bi(
            'Ich nenne mindestens einen Nachteil meiner Wahl.',
            'I acknowledge a drawback of my choice.',
          ),
          bi(
            'Meine Priorität und Entscheidung sind klar.',
            'My priority and decision are clear.',
          ),
          bi(
            'Mein Schluss enthält eine konkrete Empfehlung.',
            'I end with a concrete recommendation.',
          ),
        ],
      },
    ],
  },
];

export const skillNames: Record<Skill, Bilingual> = {
  lesen: bi('Lesen', 'Reading'),
  hoeren: bi('Hören', 'Listening'),
  schreiben: bi('Schreiben', 'Writing'),
  sprechen: bi('Sprechen', 'Speaking'),
};
export const bookMap = [
  {
    skill: 'lesen' as Skill,
    page: 12,
    tasks: bi(
      'Lückentext · Abschnitte ordnen · Multiple Choice · Sprachhandlungen · Aussagen zuordnen · Begriffspaare · Fehler in Zusammenfassungen',
      'Cloze · Paragraph order · Multiple choice · Speech acts · Statement categories · Concept pairs · Summary errors',
    ),
  },
  {
    skill: 'hoeren' as Skill,
    page: 53,
    tasks: bi(
      'Kurzantworten · Zuordnung · Zusammenfassungen prüfen · Personen zuordnen · Gliederung · Multiple Choice · Audio und Text vergleichen',
      'Short answers · Matching · Summary checking · Speaker matching · Outlines · Multiple choice · Comparing audio and text',
    ),
  },
  {
    skill: 'schreiben' as Skill,
    page: 93,
    tasks: bi(
      'Argumentieren · Text und Grafik zusammenfassen',
      'Argumentative writing · Summarising text and graphics',
    ),
  },
  {
    skill: 'sprechen' as Skill,
    page: 118,
    tasks: bi(
      'Rat geben · Optionen abwägen · Zusammenfassen · Vergleichen · Präsentieren · Stellung nehmen · Maßnahmen kritisieren',
      'Giving advice · Weighing options · Summarising · Comparing · Presenting · Taking a position · Critiquing measures',
    ),
  },
];
export type Word = {
  id: string;
  de: string;
  en: string;
  example: string;
  tag: string;
};
export const words: Word[] = [
  [
    'vorlesung',
    'die Vorlesung, -en',
    'lecture',
    'Die Vorlesung beginnt um neun Uhr.',
    'Studium',
  ],
  [
    'befragung',
    'die Befragung, -en',
    'survey',
    'An der Befragung nahmen Studierende teil.',
    'Forschung',
  ],
  [
    'anteil',
    'der Anteil, -e',
    'proportion / share',
    'Der Anteil stieg auf 45 Prozent.',
    'Daten',
  ],
  [
    'beleg',
    'der Beleg, -e',
    'evidence / supporting example',
    'Für diese Aussage fehlt ein Beleg.',
    'Argumentation',
  ],
  [
    'einschraenkung',
    'die Einschränkung, -en',
    'limitation / qualification',
    'Diese Regel gilt mit einer Einschränkung.',
    'Argumentation',
  ],
  [
    'austausch',
    'der Austausch',
    'exchange / discussion',
    'Der persönliche Austausch ist wichtig.',
    'Studium',
  ],
  [
    'aufzeichnung',
    'die Aufzeichnung, -en',
    'recording',
    'Ich schaue mir die Aufzeichnung an.',
    'Studium',
  ],
  [
    'begründen',
    'begründen',
    'to justify',
    'Bitte begründen Sie Ihre Entscheidung.',
    'Argumentation',
  ],
  [
    'abwägen',
    'abwägen',
    'to weigh up',
    'Wir müssen beide Möglichkeiten abwägen.',
    'Argumentation',
  ],
  [
    'zusammenfassen',
    'zusammenfassen',
    'to summarise',
    'Fassen Sie die Ergebnisse kurz zusammen.',
    'Argumentation',
  ],
  [
    'ableiten',
    'ableiten',
    'to infer / derive',
    'Daraus lässt sich keine Ursache ableiten.',
    'Forschung',
  ],
  [
    'erheben',
    'erheben',
    'to collect (data)',
    'Die Daten wurden im Mai erhoben.',
    'Forschung',
  ],
  [
    'vergleichen',
    'vergleichen',
    'to compare',
    'Vergleichen Sie die beiden Angaben.',
    'Daten',
  ],
  [
    'zunehmen',
    'zunehmen',
    'to increase',
    'Die Nutzung hat deutlich zugenommen.',
    'Daten',
  ],
  [
    'unveraendert',
    'unverändert',
    'unchanged',
    'Der Anteil blieb unverändert.',
    'Daten',
  ],
  [
    'allerdings',
    'allerdings',
    'however / admittedly',
    'Der Raum ist ruhig, allerdings weit entfernt.',
    'Konnektoren',
  ],
  [
    'deshalb',
    'deshalb',
    'therefore',
    'Es regnet, deshalb bleiben wir zu Hause.',
    'Konnektoren',
  ],
  [
    'obwohl',
    'obwohl',
    'although',
    'Obwohl es spät ist, lernt sie weiter.',
    'Konnektoren',
  ],
  [
    'hingegen',
    'hingegen',
    'by contrast',
    'Die zweite Gruppe hingegen blieb klein.',
    'Konnektoren',
  ],
  [
    'ausserdem',
    'außerdem',
    'in addition',
    'Außerdem spart die Lösung Zeit.',
    'Konnektoren',
  ],
  [
    'vorschlag',
    'der Vorschlag, Vorschläge',
    'suggestion',
    'Dein Vorschlag ist gut umsetzbar.',
    'Argumentation',
  ],
  [
    'ueberwiegen',
    'überwiegen',
    'to outweigh',
    'Für mich überwiegen die Vorteile.',
    'Argumentation',
  ],
  [
    'erforderlich',
    'erforderlich',
    'required / necessary',
    'Eine Anmeldung ist nicht erforderlich.',
    'Studium',
  ],
  [
    'ausnahmsweise',
    'ausnahmsweise',
    'as an exception',
    'Heute beginnt der Kurs ausnahmsweise später.',
    'Studium',
  ],
].map(([id, de, en, example, tag]) => ({ id, de, en, example, tag }));

export function normalise(value: string) {
  return value
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('de')
    .replace(/\s+/g, ' ');
}
export function grade(ex: Exercise, response: string[]): boolean | null {
  if (ex.kind === 'write' || ex.kind === 'speak') return null;
  if (!ex.answer || !response.length) return false;
  if (ex.kind === 'gap')
    return ex.answer.some((a) => normalise(a) === normalise(response[0]));
  const actual = ex.kind === 'multi' ? [...new Set(response)].sort() : response;
  const expected = ex.kind === 'multi' ? [...ex.answer].sort() : ex.answer;
  return (
    actual.length === expected.length &&
    actual.every((v, i) => v === expected[i])
  );
}
export type Attempt = {
  exerciseId: string;
  lessonId: string;
  revision: string;
  response: string[];
  correct: boolean | null;
  at: number;
  selfReviewed: boolean;
};
export type CardReview = { due: number; interval: number; reviews: number };
export function scheduleCard(
  previous: CardReview | undefined,
  rating: 'again' | 'hard' | 'good',
  now: number,
): CardReview {
  const interval =
    rating === 'again'
      ? 0
      : rating === 'hard'
        ? 1
        : Math.max(2, Math.min(60, (previous?.interval || 1) * 2));
  return {
    interval,
    reviews: (previous?.reviews || 0) + 1,
    due: now + (rating === 'again' ? 60000 : interval * 86400000),
  };
}
export function latestAttempts(attempts: Attempt[], lesson: Lesson) {
  return Object.fromEntries(
    attempts
      .filter((a) => a.lessonId === lesson.id && a.revision === lesson.revision)
      .map((a) => [a.exerciseId, a]),
  );
}
export function lessonProgress(attempts: Attempt[], lesson: Lesson) {
  const last = latestAttempts(attempts, lesson);
  return lesson.exercises.filter(
    (e) => last[e.id]?.correct === true || last[e.id]?.selfReviewed === true,
  ).length;
}
export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
// Future reviewed packages enter through a separate adapter. Never promote prepare/layout receipts to course approval.
export type AcceptedLessonEnvelope = {
  schemaVersion: 1;
  lesson: Omit<Lesson, 'origin'> & { origin: 'reviewed-source' };
  provenance: {
    sourceId: string;
    sourceSha256: string;
    unitId: string;
    revision: string;
    status: string;
    semanticApproved: boolean;
    relationshipsReviewed: boolean;
  };
};
export function validateLessonEnvelope(
  record: AcceptedLessonEnvelope,
  source: { source_id: string; sha256: string; units: { unit_id: string }[] },
) {
  return (
    record.schemaVersion === 1 &&
    record.lesson.origin === 'reviewed-source' &&
    record.provenance.status === 'accepted' &&
    record.provenance.semanticApproved === true &&
    record.provenance.relationshipsReviewed === true &&
    !!record.provenance.revision &&
    record.provenance.sourceId === source.source_id &&
    record.provenance.sourceSha256 === source.sha256 &&
    source.units.some((u) => u.unit_id === record.provenance.unitId)
  );
}
