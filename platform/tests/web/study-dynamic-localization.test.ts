import {describe, expect, it} from "vitest";
import {translateStudyDynamic} from "../../apps/web/lib/i18n/study-dynamic";
import {translate} from "../../apps/web/lib/i18n/catalog";
import {abilityLevels, abilityMeaning, abilitySentence, frequencyMeaning, frequencyWords, hobbyModels, hobbyPeople} from "../../apps/web/lib/study/hobbies-sheet";
import {hobbyContrasts} from "../../apps/web/lib/study/hobby-learning";
import {foodMeaning, foodModels, foodModes, foodSentence} from "../../apps/web/lib/study/food-sheet";
import {officeMeaning, officeModels, officeSentence, type OfficeMode} from "../../apps/web/lib/study/office-sheet";
import {travelMeaning, travelModes, travelPeople, travelSentence, travelVerbs} from "../../apps/web/lib/study/travel-sheet";
import {pastActivities, pastMeaning, pastModes, pastPeople, pastSentence} from "../../apps/web/lib/study/past-sheet";
import {journeyActivities, journeyMeaning, journeyPeople, journeySentence, monthEnglish} from "../../apps/web/lib/study/journey-sheet";
import {clockHours, clockMeaning, clockMinutes, planMeaning, timePlaces, weekDaysEnglish} from "../../apps/web/lib/study/time-sheet";
import {timedPlanMeaning} from "../../apps/web/lib/study/time-learning";
import {colourSwatches, objectModels} from "../../apps/web/lib/study/object-sheet";
import {defaultObjectSettings, objectDescription, objectMaterials, objectShapes} from "../../apps/web/lib/study/object-learning";

const locales = ["hy", "ru", "de"] as const;

function allSourceMeanings(): Set<string> {
  const texts = new Set<string>();
  hobbyModels.forEach((_, h) => {
    hobbyPeople.forEach((__, p) => abilityLevels.forEach((___, a) => [false, true].forEach(q => texts.add(abilityMeaning(h, p, a, q)))));
    frequencyWords.forEach((__, f) => texts.add(frequencyMeaning(h, f)));
    hobbyContrasts(h).forEach(row => texts.add(row.en));
  });
  foodModels.forEach((_, f) => foodModes.forEach(m => [false, true].forEach(n => texts.add(foodMeaning(f, m.id, n)))));
  officeModels.forEach((_, i) => (["identify", "have", "need", "find"] as OfficeMode[]).forEach(m => [false, true].forEach(n => [false, true].forEach(p => texts.add(officeMeaning(i, m, n, p))))));
  travelVerbs.forEach((_, v) => travelPeople.forEach((__, p) => travelModes.forEach(m => texts.add(travelMeaning(v, p, m.id)))));
  pastActivities.forEach((_, a) => pastPeople.forEach((__, p) => pastModes.forEach(m => texts.add(pastMeaning(a, p, m.id)))));
  journeyActivities.forEach((_, a) => journeyPeople.forEach((__, p) => [false, true].forEach(q => texts.add(journeyMeaning(a, p, q)))));
  clockHours.forEach(h => clockMinutes.forEach(m => ["official", "everyday"].forEach(mode => texts.add(clockMeaning(h, m, mode as "official" | "everyday")))));
  weekDaysEnglish.forEach((_, d) => timePlaces.forEach((__, p) => texts.add(planMeaning(d, p))));
  Object.values(monthEnglish).forEach(month => texts.add(`I traveled to Hamburg in ${month}.`));
  objectModels.forEach((_, index) => {
    const base = defaultObjectSettings(index);
    // Every object-dependent material, colour, shape and negated identity.
    for (const negative of [false, true]) for (const colour of colourSwatches) for (const material of objectMaterials[index]!) for (const shape of objectShapes[index]!) {
      objectDescription({...base, negative, colour: colour[0], material, shape}).forEach(line => texts.add(line.en));
    }
    texts.add(`This is a ${objectModels[index]!.en}.`);
    texts.add(`This is not a ${objectModels[index]!.en}.`);
  });
  return texts;
}

describe("grammar-aware generated study meanings", () => {
  it("covers every published control combination in Armenian, Russian and German", () => {
    const meanings = allSourceMeanings();
    expect(meanings.size).toBeGreaterThan(1900);
    const missing: string[] = [];
    for (const source of meanings) for (const locale of locales) {
      const result = translateStudyDynamic(source, locale);
      if (!result || result === source || /undefined|\[object Object\]/u.test(result)) missing.push(`${locale}: ${source} → ${result}`);
    }
    expect(missing).toEqual([]);
  });

  it("preserves du, ihr and Sie instead of silently overwriting identical English keys", () => {
    expect([1, 4, 5].map(p => travelMeaning(0, p, "statement"))).toEqual([
      "You arrive at eight.", "You (plural) arrive at eight.", "You (formal) arrive at eight.",
    ]);
    for (const person of [1, 4, 5]) {
      expect(translateStudyDynamic(travelMeaning(0, person, "statement"), "de")).toBe(travelSentence(0, person, "statement"));
      expect(translateStudyDynamic(pastMeaning(0, person, "question"), "de")).toBe(pastSentence(0, person, "question"));
      expect(translateStudyDynamic(journeyMeaning(0, person, true), "de")).toBe(journeySentence(0, person, true));
    }
    expect(translateStudyDynamic(travelMeaning(0, 1, "statement"), "ru")).toBe("Ты приезжаешь в восемь.");
    expect(translateStudyDynamic(travelMeaning(0, 4, "statement"), "ru")).toBe("Вы приезжаете в восемь.");
    expect(translateStudyDynamic(travelMeaning(0, 5, "statement"), "hy")).toBe("Դուք ժամը ութին ժամանում եք։");
  });

  it("keeps ability, negated ability questions, enjoyment and frequency distinct", () => {
    expect(translateStudyDynamic(abilityMeaning(0, 1, 4, true), "hy")).toBe("Դու ընդհանրապես չե՞ս կարող լողալ։");
    expect(translateStudyDynamic(abilityMeaning(0, 1, 4, true), "ru")).toBe("Ты совсем не умеешь плавать?");
    expect(translateStudyDynamic(abilityMeaning(4, 2, 0, false), "hy")).toBe("Նա կարող է շատ լավ կարդալ։");
    expect(translateStudyDynamic(frequencyMeaning(5, 3), "hy")).toBe("Ես երբեք հեծանիվ չեմ վարում։");
    expect(translateStudyDynamic(frequencyMeaning(5, 3), "ru")).toBe("Я никогда не езжу на велосипеде.");
    expect(translateStudyDynamic(hobbyContrasts(7)[1]!.en, "ru")).toBe("Я люблю играть на гитаре.");
    expect(translateStudyDynamic(abilityMeaning(0, 4, 1, true), "de")).toBe(abilitySentence(0, 4, 1, true));
  });

  it("uses Russian cases and number agreement in office and food sentences", () => {
    expect(translateStudyDynamic(officeMeaning(3, "find", false, false), "ru")).toBe("Я ищу ручку.");
    expect(translateStudyDynamic(officeMeaning(3, "have", true, false), "ru")).toBe("У меня нет ручки.");
    expect(translateStudyDynamic(officeMeaning(3, "have", true, true), "ru")).toBe("У меня нет ручек.");
    expect(translateStudyDynamic(officeMeaning(2, "need", false, false), "ru")).toBe("Мне нужна мышь.");
    expect(translateStudyDynamic(officeMeaning(5, "need", true, false), "ru")).toBe("Мне не нужно сообщение.");
    expect(translateStudyDynamic(officeMeaning(5, "need", false, true), "hy")).toBe("Ինձ հաղորդագրություններ են պետք։");
    expect(translateStudyDynamic(foodMeaning(8, "like", false), "ru")).toBe("Мне нравятся яйца.");
    expect(translateStudyDynamic(foodMeaning(9, "take", false), "ru")).toBe("Я возьму порцию мяса.");
    expect(translateStudyDynamic(foodMeaning(3, "enjoy", true), "ru")).toBe("Я не люблю пить чай.");
    expect(translateStudyDynamic(foodMeaning(7, "wish", false), "ru")).toBe("Мне хотелось бы булочку.");
    expect(translateStudyDynamic(foodMeaning(3, "take", true), "de")).toBe(foodSentence(3, "take", true));
    expect(translateStudyDynamic(officeMeaning(0, "find", true, false), "de")).toBe(officeSentence(0, "find", true, false));
  });

  it("inflects names and destinations and retains past time and unspecified gender", () => {
    expect(translateStudyDynamic(travelMeaning(3, 2, "modal"), "ru")).toBe("Он может позвонить Анне.");
    expect(translateStudyDynamic(travelMeaning(2, 1, "w-question"), "ru")).toBe("Когда ты забираешь Анну?");
    expect(translateStudyDynamic(travelMeaning(7, 4, "w-question"), "hy")).toBe("Դուք ի՞նչ եք այսօր գնում։");
    expect(translateStudyDynamic(pastMeaning(4, 2, "time-first"), "ru")).toBe("Вчера он читал газету.");
    expect(translateStudyDynamic(pastMeaning(0, 1, "question"), "hy")).toBe("Դու երեկ աշխատե՞լ ես։");
    expect(translateStudyDynamic(journeyMeaning(2, 0, false), "ru")).toBe("Я пошёл / пошла в кафе.");
    expect(translateStudyDynamic(journeyMeaning(2, 3, false), "ru")).toBe("Мы пошли в кафе.");
    expect(translateStudyDynamic(journeyMeaning(14, 2, true), "ru")).toBe("Он забрал Анну на вокзале?");
    expect(translateStudyDynamic(journeyMeaning(14, 2, true), "hy")).toBe("Նա կայարանում Աննային դիմավորել և տարե՞լ է։");
    expect(translateStudyDynamic("I traveled to Hamburg in March.", "hy")).toBe("Մարտին ես Համբուրգ եմ մեկնել։");
  });

  it("uses destination and weekday phrases and preserves every selectable clock value", () => {
    expect(translateStudyDynamic(planMeaning(1, 5), "ru")).toBe("Мы идём на концерт во вторник.");
    expect(translateStudyDynamic(planMeaning(2, 8), "ru")).toBe("Мы идём на выставку в среду.");
    const timed = timedPlanMeaning({day: 5, place: 5, hour: 15, minute: 30, front: true, withTime: true});
    expect(translateStudyDynamic(timed, "hy")).toBe("Մենք շաբաթ օրը ժամը 15:30-ին գնալու ենք համերգի։");
    expect(translateStudyDynamic(timed, "de")).toBe("Wir gehen am Samstag um fünfzehn Uhr dreißig ins Konzert.");
    const missing: string[] = [];
    for (const [day] of weekDaysEnglish.entries()) for (const [place] of timePlaces.entries()) for (const hour of clockHours) for (const minute of clockMinutes) {
      const source = timedPlanMeaning({day, place, hour, minute, front: false, withTime: true});
      for (const locale of locales) if (!translateStudyDynamic(source, locale)) missing.push(`${locale}: ${source}`);
    }
    expect(missing).toEqual([]);
    expect(translateStudyDynamic(clockMeaning(15, 30, "everyday"), "hy")).toBe("Ժամը 03:30 կամ 15:30 է՝ կախված համատեքստից։");
    expect(translateStudyDynamic(clockMeaning(0, 0, "official"), "ru")).toBe("Сейчас 00:00.");
  });

  it("handles object gender, plural watch and materials without guessing a pronoun antecedent", () => {
    expect(translateStudyDynamic("The watch is made of metal.", "ru")).toBe("Часы сделаны из металла.");
    expect(translateStudyDynamic("The bottle is made of glass.", "ru")).toBe("Бутылка сделана из стекла.");
    expect(translateStudyDynamic("The book is made of paper.", "hy")).toBe("Գիրքը պատրաստված է թղթից։");
    expect(translateStudyDynamic("That is not a key.", "de")).toBe("Das ist kein Schlüssel.");
    expect(translateStudyDynamic("It is blue.", "de")).toBe("Der Gegenstand ist blau.");
    expect(translateStudyDynamic("It is angular.", "ru")).toBe("Предмет угловатой формы.");
  });

  it("declines unknown prose, unsupported values and all German study stimuli", () => {
    for (const source of ["I can fly a spaceship well.", "We are going to the moon on Monday at 12:00.", "We are going to the cinema on Monday at 24:00.", "We are going to the cinema on Monday at 12:01.", "It is 25:00.", "Ich kann gut schwimmen.", "Die Uhr ist aus Metall.", "Anna kommt um acht Uhr an."]) {
      for (const locale of locales) expect(translateStudyDynamic(source, locale)).toBeNull();
    }
    expect(translateStudyDynamic("I like eggs.", "en")).toBeNull();
  });

  it("uses grammatical meanings through the public catalog and nested English cue template", () => {
    expect(translate("I do not have any pens.", "ru")).toBe("У меня нет ручек.");
    expect(translate("Say it in German: I will have a portion of meat.", "ru")).toContain("Я возьму порцию мяса.");
    expect(translate("You (formal) arrive at eight.", "de")).toBe("Sie kommen um acht Uhr an.");
    expect(translate("I like eggs.", "en")).toBe("I like eggs.");
  });
});
