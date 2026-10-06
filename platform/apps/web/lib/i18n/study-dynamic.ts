import {abilityLevels, abilityMeaning, abilitySentence, frequencyMeaning, frequencySentence, frequencyWords, hobbyModels, hobbyPeople} from "../study/hobbies-sheet";
import {foodMeaning, foodModels, foodModes, foodSentence} from "../study/food-sheet";
import {officeMeaning, officeModels, officeSentence, type OfficeMode} from "../study/office-sheet";
import {travelMeaning, travelModes, travelPeople, travelSentence, travelVerbs} from "../study/travel-sheet";
import {pastActivities, pastMeaning, pastModes, pastPeople, pastSentence} from "../study/past-sheet";
import {journeyActivities, journeyMeaning, journeyPeople, journeySentence, monthEnglish, seasonSentence} from "../study/journey-sheet";
import {clockHours, clockMeaning, clockMinutes, clockSentence, planMeaning, planSentence, timePlaces, weekDaysEnglish} from "../study/time-sheet";
import {timedPlanSentence} from "../study/time-learning";
import {colourSwatches, materialModels, objectModels} from "../study/object-sheet";
import {objectMaterials} from "../study/object-learning";

type StudyLocale = "hy" | "ru" | "de";
type Translation = Record<StudyLocale, string>;
const capitalize = (text: string) => text[0]!.toUpperCase() + text.slice(1);
const hySubjects = ["Ես", "Դու", "Նա", "Մենք", "Դուք", "Դուք"] as const;
const hyAuxiliaries = ["եմ", "ես", "է", "ենք", "եք", "եք"] as const;
const hyNegativeAuxiliaries = ["չեմ", "չես", "չի", "չենք", "չեք", "չեք"] as const;
const hyQuestionNegativeAuxiliaries = ["չե՞մ", "չե՞ս", "չի՞", "չե՞նք", "չե՞ք", "չե՞ք"] as const;
const ruSubjects = ["Я", "Ты", "Он", "Мы", "Вы", "Вы"] as const;
const ruAbility = ["умею", "умеешь", "умеет", "умеем", "умеете", "умеете"] as const;
const ruCan = ["могу", "можешь", "может", "можем", "можете", "можете"] as const;

// These are grammatical phrases, not a word-substitution dictionary. In
// particular, Russian cases and agreement and Armenian verb forms are authored
// for the role in which they occur. Only known builder output is accepted.
const hobbies = [
  {hyInf: "լողալ", hyObject: "", hyPresent: "լողում", ruInf: "плавать", ruPresent: "плаваю"},
  {hyInf: "ուտելիք պատրաստել", hyObject: "ուտելիք", hyPresent: "պատրաստում", ruInf: "готовить", ruPresent: "готовлю"},
  {hyInf: "պարել", hyObject: "", hyPresent: "պարում", ruInf: "танцевать", ruPresent: "танцую"},
  {hyInf: "երգել", hyObject: "", hyPresent: "երգում", ruInf: "петь", ruPresent: "пою"},
  {hyInf: "կարդալ", hyObject: "", hyPresent: "կարդում", ruInf: "читать", ruPresent: "читаю"},
  {hyInf: "հեծանիվ վարել", hyObject: "հեծանիվ", hyPresent: "վարում", ruInf: "ездить на велосипеде", ruPresent: "езжу на велосипеде"},
  {hyInf: "ձի վարել", hyObject: "ձի", hyPresent: "վարում", ruInf: "ездить верхом", ruPresent: "езжу верхом"},
  {hyInf: "կիթառ նվագել", hyObject: "կիթառ", hyPresent: "նվագում", ruInf: "играть на гитаре", ruPresent: "играю на гитаре"},
] as const;
const hySkill = ["շատ լավ", "լավ", "մի փոքր"] as const;
const ruSkill = ["очень хорошо", "хорошо", "немного"] as const;
const hyFrequency = ["միշտ", "հաճախ", "երբեմն", "երբեք"] as const;
const ruFrequency = ["всегда", "часто", "иногда", "никогда"] as const;

const foods = [
  {hy: "համբուրգերներ", hyOrder: "մեկ համբուրգեր", ru: "гамбургеры", ruOrder: "гамбургер", plural: true},
  {hy: "աղցան", hyOrder: "մեկ աղցան", ru: "салат", ruOrder: "салат", plural: false},
  {hy: "տորթ", hyOrder: "մեկ տորթ", ru: "торт", ruOrder: "торт", plural: false},
  {hy: "թեյ", hyOrder: "մեկ թեյ", ru: "чай", ruOrder: "чай", plural: false},
  {hy: "ապուր", hyOrder: "մեկ ապուր", ru: "суп", ruOrder: "суп", plural: false},
  {hy: "լոլիկներ", hyOrder: "մեկ լոլիկ", ru: "помидоры", ruOrder: "помидор", plural: true},
  {hy: "շոկոլադ", hyOrder: "մի կտոր շոկոլադ", ru: "шоколад", ruOrder: "кусочек шоколада", plural: false},
  {hy: "բուլկիներ", hyOrder: "մեկ բուլկի", ru: "булочки", ruOrder: "булочку", plural: true},
  {hy: "ձվեր", hyOrder: "մեկ ձու", ru: "яйца", ruOrder: "яйцо", plural: true},
  {hy: "միս", hyOrder: "մեկ բաժին միս", ru: "мясо", ruOrder: "порцию мяса", plural: false},
  {hy: "պանիր", hyOrder: "մի կտոր պանիր", ru: "сыр", ruOrder: "кусочек сыра", plural: false},
  {hy: "կարտոֆիլ ֆրի", hyOrder: "մեկ բաժին կարտոֆիլ ֆրի", ru: "картофель фри", ruOrder: "порцию картофеля фри", plural: false},
] as const;

const office = [
  {hy: ["օրացույց", "օրացույցներ"], ru: ["календарь", "календари"], ruGenitive: ["календаря", "календарей"], ruNeed: "нужен"},
  {hy: ["պլանշետ", "պլանշետներ"], ru: ["планшет", "планшеты"], ruGenitive: ["планшета", "планшетов"], ruNeed: "нужен"},
  {hy: ["մկնիկ", "մկնիկներ"], ru: ["мышь", "мыши"], ruGenitive: ["мыши", "мышей"], ruNeed: "нужна"},
  {hy: ["գրիչ", "գրիչներ"], ru: ["ручка", "ручки"], ruGenitive: ["ручки", "ручек"], ruAccusative: "ручку", ruNeed: "нужна"},
  {hy: ["գաղտնաբառ", "գաղտնաբառեր"], ru: ["пароль", "пароли"], ruGenitive: ["пароля", "паролей"], ruNeed: "нужен"},
  {hy: ["հաղորդագրություն", "հաղորդագրություններ"], ru: ["сообщение", "сообщения"], ruGenitive: ["сообщения", "сообщений"], ruNeed: "нужно"},
  {hy: ["տպիչ", "տպիչներ"], ru: ["принтер", "принтеры"], ruGenitive: ["принтера", "принтеров"], ruNeed: "нужен"},
] as const;

const travel = [
  {hyPresent: "ժամանում", hyQuestion: "ժամանո՞ւմ", hyInf: "ժամանել", hyDetail: "ժամը ութին", hyAsk: "", hyWh: "ե՞րբ", ruForms: ["приезжаю", "приезжаешь", "приезжает", "приезжаем", "приезжаете", "приезжаете"], ruInf: "приехать", ruDetail: "в восемь", ruAsk: "", ruWh: "Когда"},
  {hyPresent: "մեկնում", hyQuestion: "մեկնո՞ւմ", hyInf: "մեկնել", hyDetail: "ինքնաթիռով ժամը իննին", hyAsk: "ինքնաթիռով", hyWh: "ե՞րբ", ruForms: ["вылетаю", "вылетаешь", "вылетает", "вылетаем", "вылетаете", "вылетаете"], ruInf: "вылететь", ruDetail: "в девять", ruAsk: "", ruWh: "Когда"},
  {hyPresent: "դիմավորում և տանում", hyQuestion: "դիմավորո՞ւմ և տանում", hyInf: "դիմավորել և տանել", hyDetail: "Աննային օդանավակայանում", hyAsk: "Աննային", hyWh: "ե՞րբ", ruForms: ["забираю", "забираешь", "забирает", "забираем", "забираете", "забираете"], ruInf: "забрать", ruDetail: "Анну в аэропорту", ruAsk: "Анну", ruWh: "Когда"},
  {hyPresent: "զանգահարում", hyQuestion: "զանգահարո՞ւմ", hyInf: "զանգահարել", hyDetail: "Աննային", hyAsk: "Աննային", hyWh: "ե՞րբ", ruForms: ["звоню", "звонишь", "звонит", "звоним", "звоните", "звоните"], ruInf: "позвонить", ruDetail: "Анне", ruAsk: "Анне", ruWh: "Когда"},
  {hyPresent: "նստում", hyQuestion: "նստո՞ւմ", hyInf: "նստել", hyDetail: "մետրո", hyAsk: "մետրո", hyWh: "ե՞րբ", ruForms: ["сажусь", "садишься", "садится", "садимся", "садитесь", "садитесь"], ruInf: "сесть", ruDetail: "в метро", ruAsk: "в метро", ruWh: "Когда"},
  {hyPresent: "փոխում", hyQuestion: "փոխո՞ւմ", hyInf: "փոխել", hyDetail: "Համբուրգում գնացք", hyAsk: "գնացք", hyWh: "որտե՞ղ", ruForms: ["делаю", "делаешь", "делает", "делаем", "делаете", "делаете"], ruInf: "сделать", ruDetail: "пересадку в Гамбурге", ruAsk: "пересадку", ruWh: "Где"},
  {hyPresent: "իջնում", hyQuestion: "իջնո՞ւմ", hyInf: "իջնել", hyDetail: "գլխավոր կայարանում", hyAsk: "", hyWh: "որտե՞ղ", ruForms: ["выхожу", "выходишь", "выходит", "выходим", "выходите", "выходите"], ruInf: "выйти", ruDetail: "на главном вокзале", ruAsk: "", ruWh: "Где"},
  {hyPresent: "գնում", hyQuestion: "գնո՞ւմ", hyInf: "գնել", hyDetail: "այսօր հաց", hyAsk: "այսօր", hyWh: "ի՞նչ", ruForms: ["покупаю", "покупаешь", "покупает", "покупаем", "покупаете", "покупаете"], ruInf: "купить", ruDetail: "хлеб сегодня", ruAsk: "сегодня", ruWh: "Что"},
  {hyPresent: "մեկնում", hyQuestion: "մեկնո՞ւմ", hyInf: "մեկնել", hyDetail: "ժամը տասին", hyAsk: "", hyWh: "ե՞րբ", ruForms: ["отправляюсь", "отправляешься", "отправляется", "отправляемся", "отправляетесь", "отправляетесь"], ruInf: "отправиться", ruDetail: "в десять", ruAsk: "", ruWh: "Когда"},
  {hyPresent: "դիտում", hyQuestion: "դիտո՞ւմ", hyInf: "դիտել", hyDetail: "այսօր երեկոյան հեռուստացույց", hyAsk: "հեռուստացույց", hyWh: "ե՞րբ", ruForms: ["смотрю", "смотришь", "смотрит", "смотрим", "смотрите", "смотрите"], ruInf: "посмотреть", ruDetail: "телевизор сегодня вечером", ruAsk: "телевизор", ruWh: "Когда"},
] as const;

// Russian past tense marks gender. The first and second singular persons have
// no gender in the source, so show both forms instead of inventing one.
type PastPhrase = {hyDetail: string; hyPart: string; ru: readonly [string, string, string]};
const past: readonly PastPhrase[] = [
  {hyDetail: "", hyPart: "աշխատել", ru: ["работал", "работала", "работали"]},
  {hyDetail: "", hyPart: "զբոսնել", ru: ["гулял", "гуляла", "гуляли"]},
  {hyDetail: "լապշա", hyPart: "եփել", ru: ["готовил лапшу", "готовила лапшу", "готовили лапшу"]},
  {hyDetail: "գերմաներեն", hyPart: "սովորել", ru: ["учил немецкий", "учила немецкий", "учили немецкий"]},
  {hyDetail: "թերթ", hyPart: "կարդացել", ru: ["читал газету", "читала газету", "читали газету"]},
  {hyDetail: "սուրճ", hyPart: "խմել", ru: ["пил кофе", "пила кофе", "пили кофе"]},
  {hyDetail: "հաղորդագրություններ", hyPart: "գրել", ru: ["писал сообщения", "писала сообщения", "писали сообщения"]},
  {hyDetail: "երկար", hyPart: "քնել", ru: ["долго спал", "долго спала", "долго спали"]},
  {hyDetail: "լվացք", hyPart: "արել", ru: ["стирал бельё", "стирала бельё", "стирали бельё"]},
  {hyDetail: "գրասեղանը կարգի", hyPart: "բերել", ru: ["прибрал письменный стол", "прибрала письменный стол", "прибрали письменный стол"]},
  {hyDetail: "հաց", hyPart: "գնել", ru: ["купил хлеб", "купила хлеб", "купили хлеб"]},
  {hyDetail: "ընկերներին", hyPart: "հրավիրել", ru: ["пригласил друзей", "пригласила друзей", "пригласили друзей"]},
  {hyDetail: "հեռուստացույց", hyPart: "դիտել", ru: ["смотрел телевизор", "смотрела телевизор", "смотрели телевизор"]},
  {hyDetail: "ամանները", hyPart: "լվացել", ru: ["мыл посуду", "мыла посуду", "мыли посуду"]},
  {hyDetail: "երկար հեռախոսով", hyPart: "խոսել", ru: ["долго говорил по телефону", "долго говорила по телефону", "долго говорили по телефону"]},
  {hyDetail: "թռչուններ", hyPart: "լուսանկարել", ru: ["фотографировал птиц", "фотографировала птиц", "фотографировали птиц"]},
];
const journeys: readonly PastPhrase[] = [
  {hyDetail: "Համբուրգ", hyPart: "մեկնել", ru: ["поехал в Гамбург", "поехала в Гамбург", "поехали в Гамбург"]},
  {hyDetail: "Ավստրիա", hyPart: "թռչել", ru: ["полетел в Австрию", "полетела в Австрию", "полетели в Австрию"]},
  {hyDetail: "սրճարան", hyPart: "գնացել", ru: ["пошёл в кафе", "пошла в кафе", "пошли в кафе"]},
  {hyDetail: "նավահանգիստ ոտքով", hyPart: "գնացել", ru: ["пошёл пешком к гавани", "пошла пешком к гавани", "пошли пешком к гавани"]},
  {hyDetail: "երկուշաբթի", hyPart: "ժամանել", ru: ["приехал в понедельник", "приехала в понедельник", "приехали в понедельник"]},
  {hyDetail: "ժամը ութին", hyPart: "մեկնել", ru: ["отправился в восемь", "отправилась в восемь", "отправились в восемь"]},
  {hyDetail: "այնտեղ երկար", hyPart: "մնացել", ru: ["долго оставался там", "долго оставалась там", "долго оставались там"]},
  {hyDetail: "Ալպերում արշավի", hyPart: "գնացել", ru: ["ходил в поход в Альпах", "ходила в поход в Альпах", "ходили в поход в Альпах"]},
  {hyDetail: "առագաստանավով", hyPart: "նավարկել", ru: ["ходил под парусом", "ходила под парусом", "ходили под парусом"]},
  {hyDetail: "տասը մետր բարձրությամբ ցատկահարթակից", hyPart: "ցատկել", ru: ["прыгнул с десятиметровой вышки", "прыгнула с десятиметровой вышки", "прыгнули с десятиметровой вышки"]},
  {hyDetail: "Աննային", hyPart: "այցելել", ru: ["навестил Анну", "навестила Анну", "навестили Анну"]},
  {hyDetail: "Ամանորի գիշերը", hyPart: "տոնել", ru: ["отмечал Новый год", "отмечала Новый год", "отмечали Новый год"]},
  {hyDetail: "նավեր", hyPart: "լուսանկարել", ru: ["фотографировал корабли", "фотографировала корабли", "фотографировали корабли"]},
  {hyDetail: "հեծանվային զբոսանքի", hyPart: "գնացել", ru: ["совершил велопрогулку", "совершила велопрогулку", "совершили велопрогулку"]},
  {hyDetail: "կայարանում Աննային", hyPart: "դիմավորել և տարել", ru: ["забрал Анну на вокзале", "забрала Анну на вокзале", "забрали Анну на вокзале"]},
];

function russianPast(phrase: PastPhrase, person: number): string {
  if (person >= 3) return phrase.ru[2];
  if (person === 2) return phrase.ru[0];
  const masculine = phrase.ru[0].split(" ");
  const feminine = phrase.ru[1].split(" ");
  return masculine.map((word, index) => word === feminine[index] ? word : `${word} / ${feminine[index]}`).join(" ");
}

function armenianPast(phrase: PastPhrase, person: number, question: boolean, yesterday = false, timeFirst = false): string {
  const subject = timeFirst ? hySubjects[person]!.toLowerCase() : hySubjects[person]!;
  // All authored participles here end in -ել, including the irregular stems.
  const participle = question ? phrase.hyPart.replace(/ել$/u, "ե՞լ") : phrase.hyPart;
  return [timeFirst ? "Երեկ" : "", subject, yesterday && !timeFirst ? "երեկ" : "", phrase.hyDetail, participle, hyAuxiliaries[person]].filter(Boolean).join(" ") + "։";
}

const hyDays = ["երկուշաբթի", "երեքշաբթի", "չորեքշաբթի", "հինգշաբթի", "ուրբաթ", "շաբաթ օրը", "կիրակի"] as const;
const ruDays = ["в понедельник", "во вторник", "в среду", "в четверг", "в пятницу", "в субботу", "в воскресенье"] as const;
const hyDestinations = ["կինոթատրոն", "թանգարան", "թատրոն", "սրճարան", "լողավազան", "համերգի", "ռեստորան", "մարզասրահ", "ցուցահանդեսի", "դիսկոտեկ", "բար", "ակումբ"] as const;
const ruDestinations = ["в кино", "в музей", "в театр", "в кафе", "в бассейн", "на концерт", "в ресторан", "в спортзал", "на выставку", "на дискотеку", "в бар", "в клуб"] as const;

function localPlan(day: number, place: number, time?: string): Omit<Translation, "de"> {
  return {
    hy: `Մենք ${hyDays[day]}${time ? ` ժամը ${time}-ին` : ""} գնալու ենք ${hyDestinations[place]}։`,
    ru: `Мы идём ${ruDestinations[place]} ${ruDays[day]}${time ? ` в ${time}` : ""}.`,
  };
}

const months = [
  ["Հունվարին", "В январе"], ["Փետրվարին", "В феврале"], ["Մարտին", "В марте"],
  ["Ապրիլին", "В апреле"], ["Մայիսին", "В мае"], ["Հունիսին", "В июне"],
  ["Հուլիսին", "В июле"], ["Օգոստոսին", "В августе"], ["Սեպտեմբերին", "В сентябре"],
  ["Հոկտեմբերին", "В октябре"], ["Նոյեմբերին", "В ноябре"], ["Դեկտեմբերին", "В декабре"],
] as const;
const objects = [
  {hy: "սեղան", hyDefinite: "Սեղանը", ru: "стол", ruSubject: "Стол сделан"},
  {hy: "գիրք", hyDefinite: "Գիրքը", ru: "книга", ruSubject: "Книга сделана"},
  {hy: "ժամացույց", hyDefinite: "Ժամացույցը", ru: "часы", ruSubject: "Часы сделаны"},
  {hy: "շիշ", hyDefinite: "Շիշը", ru: "бутылка", ruSubject: "Бутылка сделана"},
  {hy: "բանալի", hyDefinite: "Բանալին", ru: "ключ", ruSubject: "Ключ сделан"},
] as const;
const materials = [
  ["փայտից", "из дерева"], ["թղթից", "из бумаги"], ["մետաղից", "из металла"],
  ["պլաստիկից", "из пластика"], ["ապակուց", "из стекла"], ["սինթետիկ նյութից", "из синтетического материала"],
] as const;
const colours = [
  ["սպիտակ", "белого"], ["սև", "чёрного"], ["մոխրագույն", "серого"],
  ["կարմիր", "красного"], ["կապույտ", "синего"], ["կանաչ", "зелёного"],
  ["դեղին", "жёлтого"], ["նարնջագույն", "оранжевого"], ["շագանակագույն", "коричневого"],
] as const;

let messages: Map<string, Translation> | undefined;

function generatedMessages(): Map<string, Translation> {
  if (messages) return messages;
  const result = new Map<string, Translation>();
  const add = (source: string, translation: Translation) => result.set(source, translation);

  hobbyModels.forEach((model, hobby) => {
    const words = hobbies[hobby]!;
    hobbyPeople.forEach((_, person) => abilityLevels.forEach((__, level) => [false, true].forEach(question => {
      const negative = level >= 3;
      const hyDegree = level === 3 ? "այնքան էլ լավ" : "ընդհանրապես";
      const hy = negative
        ? `${hySubjects[person]} ${hyDegree} ${question ? hyQuestionNegativeAuxiliaries[person] : hyNegativeAuxiliaries[person]} կարող ${words.hyInf}։`
        : `${hySubjects[person]} ${question ? "կարո՞ղ" : "կարող"} ${hyAuxiliaries[person]} ${hySkill[level]} ${words.hyInf}։`;
      const ru = level === 4
        ? `${ruSubjects[person]} совсем не ${ruAbility[person]} ${words.ruInf}`
        : level === 3
          ? `${ruSubjects[person]} не очень хорошо ${ruAbility[person]} ${words.ruInf}`
          : `${ruSubjects[person]} ${ruAbility[person]} ${ruSkill[level]} ${words.ruInf}`;
      add(abilityMeaning(hobby, person, level, question), {hy, ru: ru + (question ? "?" : "."), de: abilitySentence(hobby, person, level, question)});
    })));
    frequencyWords.forEach((_, frequency) => add(frequencyMeaning(hobby, frequency), {
      hy: frequency === 3
        ? ["Ես երբեք", words.hyObject, "չեմ", words.hyPresent].filter(Boolean).join(" ") + "։"
        : words.hyObject ? `Ես ${hyFrequency[frequency]} ${words.hyObject} եմ ${words.hyPresent}։` : `Ես ${hyFrequency[frequency]} ${words.hyPresent} եմ։`,
      ru: `Я ${ruFrequency[frequency]} ${frequency === 3 ? "не " : ""}${words.ruPresent}.`,
      de: frequencySentence(hobby, frequency),
    }));
    add(`I like ${model.ing}.`, {
      hy: `Ես սիրում եմ ${words.hyInf}։`, ru: `Я люблю ${words.ruInf}.`,
      de: `Ich ${model.forms[0]} gern${model.tail ? ` ${model.tail}` : ""}.`,
    });
  });

  foodModels.forEach((model, food) => foodModes.forEach(({id: mode}) => [false, true].forEach(negative => {
    const words = foods[food]!;
    const drink = model.verb === "trinke";
    const hy = mode === "like" ? `Ես ${negative ? "չեմ սիրում" : "սիրում եմ"} ${words.hy}։`
      : mode === "enjoy" ? negative ? `Ես չեմ սիրում ${words.hy} ${drink ? "խմել" : "ուտել"}։` : `Ես հաճույքով եմ ${words.hy} ${drink ? "խմում" : "ուտում"}։`
      : mode === "wish" ? `Ես ${negative ? "չէի ցանկանա" : "կուզենայի"} ${words.hyOrder}։`
      : `Ես ${negative ? "չեմ վերցնի" : "կվերցնեմ"} ${words.hyOrder}։`;
    const ru = mode === "like" ? `Мне ${negative ? "не " : ""}${words.plural ? "нравятся" : "нравится"} ${words.ru}.`
      : mode === "enjoy" ? `Я ${negative ? "не " : ""}люблю ${drink ? "пить" : "есть"} ${words.ru}.`
      : mode === "wish" ? `Мне ${negative ? "не " : ""}хотелось бы ${words.ruOrder}.`
      : `Я ${negative ? "не буду брать" : "возьму"} ${words.ruOrder}.`;
    add(foodMeaning(food, mode, negative), {hy, ru, de: foodSentence(food, mode, negative)});
  })));

  officeModels.forEach((_, index) => (["identify", "have", "need", "find"] as const satisfies readonly OfficeMode[]).forEach(mode => [false, true].forEach(negative => [false, true].forEach(plural => {
    const words = office[index]!;
    const number = plural ? 1 : 0;
    const hyNoun = words.hy[number];
    const hy = mode === "identify" ? `${plural ? "Սրանք" : "Սա"} ${hyNoun} ${negative ? plural ? "չեն" : "չէ" : plural ? "են" : "է"}։`
      : mode === "have" ? `Ես ${hyNoun} ${negative ? "չունեմ" : "ունեմ"}։`
      : mode === "need" ? `Ինձ ${hyNoun} ${negative ? plural ? "պետք չեն" : "պետք չէ" : plural ? "են պետք" : "է պետք"}։`
      : `Ես ${hyNoun} ${negative ? "չեմ" : "եմ"} փնտրում։`;
    const ruNoun = words.ru[number];
    const ruObject = !plural && "ruAccusative" in words ? words.ruAccusative : ruNoun;
    const ru = mode === "identify" ? `Это ${negative ? "не " : ""}${ruNoun}.`
      : mode === "have" ? negative ? `У меня нет ${words.ruGenitive[number]}.` : `У меня есть ${ruNoun}.`
      : mode === "need" ? `Мне ${negative ? "не " : ""}${plural ? "нужны" : words.ruNeed} ${ruNoun}.`
      : `Я ${negative ? "не " : ""}ищу ${ruObject}.`;
    add(officeMeaning(index, mode, negative, plural), {hy, ru, de: officeSentence(index, mode, negative, plural)});
  }))));

  travelVerbs.forEach((_, verb) => travelPeople.forEach((__, person) => travelModes.forEach(({id: mode}) => {
    const words = travel[verb]!;
    const hy = mode === "w-question"
      ? [hySubjects[person], words.hyWh, hyAuxiliaries[person], words.hyAsk, words.hyPresent].filter(Boolean).join(" ") + "։"
      : mode === "modal" ? `${hySubjects[person]} կարող ${hyAuxiliaries[person]} ${words.hyDetail} ${words.hyInf}։`
      : `${hySubjects[person]} ${words.hyDetail} ${mode === "yes-no" ? words.hyQuestion : words.hyPresent} ${hyAuxiliaries[person]}։`;
    const ru = mode === "w-question" ? [words.ruWh, ruSubjects[person]!.toLowerCase(), words.ruForms[person], words.ruAsk].filter(Boolean).join(" ") + "?"
      : mode === "modal" ? `${ruSubjects[person]} ${ruCan[person]} ${words.ruInf} ${words.ruDetail}.`
      : `${ruSubjects[person]} ${words.ruForms[person]} ${words.ruDetail}${mode === "yes-no" ? "?" : "."}`;
    add(travelMeaning(verb, person, mode), {hy, ru, de: travelSentence(verb, person, mode)});
  })));

  pastActivities.forEach((_, activity) => pastPeople.forEach((__, person) => pastModes.forEach(({id: mode}) => {
    const words = past[activity]!;
    const ru = mode === "time-first" ? `Вчера ${ruSubjects[person]!.toLowerCase()} ${russianPast(words, person)}.`
      : `${ruSubjects[person]} ${russianPast(words, person)} вчера${mode === "question" ? "?" : "."}`;
    add(pastMeaning(activity, person, mode), {
      hy: armenianPast(words, person, mode === "question", true, mode === "time-first"), ru,
      de: pastSentence(activity, person, mode),
    });
  })));
  journeyActivities.forEach((_, activity) => journeyPeople.forEach((__, person) => [false, true].forEach(question => {
    const words = journeys[activity]!;
    add(journeyMeaning(activity, person, question), {
      hy: armenianPast(words, person, question),
      ru: `${ruSubjects[person]} ${russianPast(words, person)}${question ? "?" : "."}`,
      de: journeySentence(activity, person, question),
    });
  })));

  clockHours.forEach(hour => clockMinutes.forEach(minute => {
    add(clockMeaning(hour, minute, "official"), {
      hy: `Ժամը ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} է։`,
      ru: `Сейчас ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}.`,
      de: clockSentence(hour, minute, "official"),
    });
    const early = `${String(hour % 12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const late = `${String(hour % 12 + 12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    add(clockMeaning(hour, minute, "everyday"), {
      hy: `Ժամը ${early} կամ ${late} է՝ կախված համատեքստից։`,
      ru: `Сейчас ${early} или ${late}, в зависимости от контекста.`,
      de: `Je nach Kontext ist es ${early} oder ${late} Uhr.`,
    });
  }));
  weekDaysEnglish.forEach((_, day) => timePlaces.forEach((__, place) => add(planMeaning(day, place), {...localPlan(day, place), de: planSentence(day, place, false)})));
  Object.entries(monthEnglish).forEach(([month, english], index) => add(`I traveled to Hamburg in ${english}.`, {
    hy: `${months[index]![0]} ես Համբուրգ եմ մեկնել։`,
    ru: `${months[index]![1]} я поехал / поехала в Гамбург.`,
    de: seasonSentence(month),
  }));

  objectModels.forEach((item, index) => {
    const words = objects[index]!;
    [false, true].forEach(negative => ["This", "That"].forEach(demonstrative => add(`${demonstrative} is ${negative ? "not " : ""}a ${item.en}.`, {
      hy: `${demonstrative === "This" ? "Սա" : "Դա"} ${words.hy} ${negative ? "չէ" : "է"}։`,
      ru: `Это ${negative ? "не " : ""}${words.ru}.`,
      de: `Das ist ${negative ? item.negative : item.indefinite} ${item.noun}.`,
    })));
    materialModels.forEach(([material, english], materialIndex) => {
      if (!objectMaterials[index]!.includes(material)) return;
      add(`The ${item.en} is made of ${english}.`, {
        hy: `${words.hyDefinite} պատրաստված է ${materials[materialIndex]![0]}։`,
        ru: `${words.ruSubject} ${materials[materialIndex]![1]}.`,
        de: `${capitalize(item.article)} ${item.noun} ist aus ${material}.`,
      });
    });
  });
  colourSwatches.forEach(([german, english], index) => add(`It is ${english}.`, {
    // The English string does not carry its antecedent's gender. Using an
    // explicit neutral noun avoids an incorrect Russian/German pronoun.
    hy: `Առարկան ${colours[index]![0]} է։`,
    ru: `Предмет ${colours[index]![1]} цвета.`,
    de: `Der Gegenstand ist ${german}.`,
  }));
  add("It is round.", {hy: "Առարկան կլոր է։", ru: "Предмет круглой формы.", de: "Der Gegenstand ist rund."});
  add("It is angular.", {hy: "Առարկան անկյունավոր է։", ru: "Предмет угловатой формы.", de: "Der Gegenstand ist eckig."});

  messages = result;
  return result;
}

/**
 * Localize only complete English meanings generated by the published study
 * controls. German stimuli and unknown prose return null, allowing the caller
 * to use its literal catalog. Timed plans are grammar-aware over the same
 * finite days, destinations and five-minute clock values as their controls.
 */
export function translateStudyDynamic(text: string, locale: "hy" | "ru" | "de" | "en"): string | null {
  if (locale === "en") return null;
  const known = generatedMessages().get(text);
  if (known) return known[locale];
  const plan = /^We are going to (.+) on (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at ([01]\d|2[0-3]):([0-5][05])\.$/.exec(text);
  if (!plan) return null;
  const day = weekDaysEnglish.findIndex(value => value === plan[2]);
  const place = timePlaces.findIndex(value => value.en === plan[1]);
  if (day < 0 || place < 0) return null;
  const hour = Number(plan[3]);
  const minute = Number(plan[4]);
  if (locale === "de") return timedPlanSentence({day, place, hour, minute, front: false, withTime: true});
  return localPlan(day, place, `${plan[3]}:${plan[4]}`)[locale];
}
