/**
 * Definitions for German-interface practice, not UI or dictionary translations.
 * A literal German translation would give away the answer in a recall prompt
 * and turn meaning recognition into matching identical strings.
 */
const GERMAN_STUDY_GLOSSES: Readonly<Record<string, string>> = Object.freeze({
  "Austria": "Land mit der Hauptstadt Wien",
  "Bye": "kurzer, informeller Abschiedsgruß",
  "Eritrea": "Land am Roten Meer mit der Hauptstadt Asmara",
  "Fine, thank you.": "Antwort: Es geht dir gut; du bedankst dich.",
  "France": "Land mit der Hauptstadt Paris",
  "Germany": "Land mit der Hauptstadt Berlin",
  "Good day / Hello": "höflicher Gruß am Tag",
  "Good evening": "Gruß am Abend",
  "Good morning": "Gruß am Morgen",
  "Good night": "Abschiedsgruß vor dem Schlafen",
  "Goodbye": "höflicher Gruß beim Abschied",
  "Great as well.": "Antwort: Der anderen Person geht es bestens; dir ebenso.",
  "Great!": "begeisterte Antwort: Dir geht es bestens.",
  "Hello": "kurzer, informeller Gruß bei einer Begegnung",
  "Not so well.": "Antwort: Du fühlst dich eher schlecht.",
  "Not too bad.": "Antwort: Dein Befinden ist mittelmäßig.",
  "Spain": "Land mit der Hauptstadt Madrid",
  "Switzerland": "Land mit dem Regierungssitz Bern",
  "Turkey": "Land mit der Hauptstadt Ankara",
  "USA": "Land mit der Hauptstadt Washington, D.C.",
  "Very well, thank you.": "Antwort: Dir geht es besonders gut; du bedankst dich.",
  "age": "Anzahl der Lebensjahre",
  "alone": "ohne andere Personen",
  "apprenticeship/training": "Vorbereitung auf einen Beruf mit praktischen und theoretischen Aufgaben",
  "architect": "Person, die Gebäude entwirft und plant",
  "automotive mechatronics engineer": "Person, die Fahrzeuge und ihre Elektronik wartet und repariert",
  "child": "junger Mensch, der noch nicht erwachsen ist",
  "company": "Unternehmen, in dem Menschen arbeiten",
  "divorced": "Familienstand nach dem rechtlichen Ende einer Ehe",
  "doctor": "Person, die kranke Menschen untersucht und behandelt",
  "engineer": "Person mit technischer Hochschulausbildung, die technische Lösungen entwickelt",
  "hairdresser": "Person, die beruflich Haare schneidet und frisiert",
  "internship": "begrenzte Zeit, in der man praktische Erfahrungen in einem Betrieb sammelt",
  "job": "umgangssprachliches Wort für eine bezahlte Arbeit",
  "journalist": "Person, die Nachrichten recherchiert und für Medien berichtet",
  "marital status": "Angabe dazu, ob jemand zum Beispiel ledig oder in einer Ehe ist",
  "married": "in einer rechtlich geschlossenen Ehe lebend",
  "origin": "Land oder Ort, aus dem eine Person ursprünglich stammt",
  "parcel delivery agent": "Person, die beruflich Pakete zu den Empfängern bringt",
  "pensioner": "Person, die im Ruhestand lebt und eine Rente erhält",
  "place of residence": "Ort, an dem eine Person lebt",
  "position/job": "bestimmter Arbeitsplatz in einem Betrieb",
  "profession": "Tätigkeit, die man gelernt hat oder zum Lebensunterhalt ausübt",
  "school student": "Person, die eine Schule besucht",
  "shop assistant": "Person, die in einem Geschäft Waren anbietet und Kunden berät",
  "single person": "Person ohne feste Partnerin oder festen Partner",
  "studies": "Ausbildung an einer Universität oder Hochschule",
  "teacher": "Person, die beruflich unterrichtet",
  "to be": "Grundform zu bin, bist und ist",
  "to be called": "einen bestimmten Namen haben",
  "to come": "sich zu einem Ort bewegen oder aus einem Land stammen",
  "to learn": "sich Wissen oder neue Fähigkeiten aneignen",
  "university student": "Person, die an einer Universität oder Hochschule lernt",
  "waiter / waitress": "Person, die im Restaurant Gäste bedient",
  "year": "Zeitraum von zwölf Monaten",
});

/** Include the requested form when one gloss has masculine/feminine answers. */
export function germanStudyGloss(meaning: string, germanTarget?: string): string | null {
  const definition = GERMAN_STUDY_GLOSSES[meaning];
  if (!definition) return null;
  if (definition.startsWith("Person, ")) {
    if (germanTarget?.startsWith("der ")) return `Männliche Bezeichnung: ${definition}`;
    if (germanTarget?.startsWith("die ")) return `Weibliche Bezeichnung: ${definition}`;
  }
  return definition;
}

/** Generic Q&A targets have no English gloss in the published projection. */
const GERMAN_QUESTION_CUES: Readonly<Record<string, string>> = Object.freeze({
  "qa:identity": "Frage nach der Identität einer anderen Person.",
  "qa:name-casual": "Frage eine vertraute Person nach ihrem Namen. Verwende du.",
  "qa:name-formal": "Frage eine Person höflich nach ihrem Namen. Verwende Sie.",
  "qa:origin-casual": "Frage, aus welchem Land eine Person kommt. Verwende du.",
  "qa:origin-formal": "Frage höflich, aus welchem Land eine Person kommt. Verwende Sie.",
  "qa:wellbeing-casual": "Erkundige dich nach dem Befinden einer vertrauten Person. Verwende dir.",
  "qa:wellbeing-formal": "Erkundige dich höflich nach dem Befinden einer Person. Verwende Ihnen.",
  "qa:age-casual": "Frage eine vertraute Person nach ihrem Lebensalter. Verwende du.",
  "qa:age-formal": "Frage eine Person höflich nach ihrem Lebensalter. Verwende Sie.",
  "qa:profession-casual-main": "Frage nach der beruflichen Tätigkeit. Verwende du und von Beruf.",
  "qa:profession-formal-main": "Frage höflich nach der beruflichen Tätigkeit. Verwende Sie und von Beruf.",
  "qa:residence-casual": "Frage, an welchem Ort eine Person lebt. Verwende du.",
  "qa:residence-formal": "Frage höflich, an welchem Ort eine Person lebt. Verwende Sie.",
  "qa:work-formal-main": "Frage höflich nach der beruflichen Tätigkeit. Verwende machen und Sie.",
});

export function germanStudyQuestionCue(targetId: string | null): string | null {
  return targetId ? GERMAN_QUESTION_CUES[targetId] ?? null : null;
}
