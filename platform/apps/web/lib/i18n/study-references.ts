type ReferenceLocale = 'hy' | 'ru' | 'de';

// These are the finite labels used by the course's bibliographic formatter,
// not a general-purpose prose translator. File names, numbers, URLs, German
// section titles and copyright holders remain exactly identifiable.
const labels: readonly [string, string, string, string][] = [
  ['German–English glossary', 'գերմաներեն–անգլերեն բառարան', 'немецко-английский словарь', 'Deutsch–Englisch-Glossar'],
  ['Deutsch–Englisch glossary', 'գերմաներեն–անգլերեն բառարան', 'немецко-английский словарь', 'Deutsch–Englisch-Glossar'],
  ['coursebook and workbook exercises', 'դասագրքի և աշխատանքային տետրի վարժություններ', 'упражнения учебника и рабочей тетради', 'Übungen im Kurs- und Arbeitsbuch'],
  ['Teacher jobs handout', 'ուսուցչի մասնագիտությունների թերթիկ', 'лист преподавателя с профессиями', 'Berufsliste der Lehrkraft'],
  ['Workbook transcripts PDF', 'աշխատանքային տետրի ձայնագրությունների տեքստերի PDF', 'PDF с текстами аудиозаписей рабочей тетради', 'PDF mit Transkripten zum Arbeitsbuch'],
  ['Core phrase components', 'հիմնական արտահայտությունների բաղադրիչներ', 'части основных выражений', 'Bestandteile der grundlegenden Wendungen'],
  ['Components of fixed greetings', 'կայուն ողջույնների բաղադրիչներ', 'части устойчивых приветствий', 'Bestandteile fester Begrüßungen'],
  ['Component of Vielen Dank', 'Vielen Dank արտահայտության բաղադրիչ', 'часть выражения Vielen Dank', 'Bestandteil von Vielen Dank'],
  ['grammar summary', 'քերականության ամփոփում', 'обзор грамматики', 'Grammatikübersicht'],
  ['readings and profession list', 'ընթերցանության տեքստեր և մասնագիտությունների ցանկ', 'тексты для чтения и список профессий', 'Lesetexte und Berufsliste'],
  ['profession lists and surname reading', 'մասնագիտությունների ցանկեր և ազգանունների մասին ընթերցանության տեքստ', 'списки профессий и текст о фамилиях', 'Berufslisten und Lesetext über Nachnamen'],
  ['Vocabulary guide: Alphabet and spelling', 'բառապաշարի ուղեցույց՝ այբուբեն և տառ առ տառ արտասանում', 'словарное пособие: алфавит и произнесение по буквам', 'Wortschatzleitfaden: Alphabet und Buchstabieren'],
  ['alphabet recording', 'այբուբենի ձայնագրություն', 'аудиозапись алфавита', 'Alphabetaufnahme'],
  ['review listening test', 'կրկնության լսողական ստուգում', 'аудирование для повторения', 'Hörtest zur Wiederholung'],
  ['writing test', 'գրավոր ստուգում', 'письменный тест', 'Schreibtest'],
  ['optional activity', 'ըստ ցանկության առաջադրանք', 'дополнительное задание', 'freiwillige Aufgabe'],
  ['picture lexicon', 'պատկերային բառարան', 'картинный словарь', 'Bildlexikon'],
  ['review/test', 'կրկնություն/ստուգում', 'повторение/тест', 'Wiederholung/Test'],
  ['Glossary', 'Բառարան', 'Словарь', 'Glossar'],
  ['coursebook', 'դասագիրք', 'учебник', 'Kursbuch'],
  ['printed', 'տպագիր', 'печатная нумерация', 'gedruckte'],
  ['introduction', 'ներածություն', 'введение', 'Einführung'],
  ['possessives', 'ստացական ձևեր', 'притяжательные формы', 'Possessivformen'],
  ['negation', 'ժխտում', 'отрицание', 'Verneinung'],
  ['reading', 'ընթերցանության տեքստ', 'текст для чтения', 'Lesetext'],
  ['review', 'կրկնություն', 'повторение', 'Wiederholung'],
  ['tasks', 'առաջադրանքներ', 'задания', 'Aufgaben'],
  ['task', 'առաջադրանք', 'задание', 'Aufgabe'],
  ['track', 'ձայնագրություն', 'дорожка', 'Titel'],
  ['row', 'տող', 'строка', 'Zeile'],
  ['action', 'գործնական առաջադրանքներ', 'практические задания', 'Aktionsseiten'],
  ['italic', 'շեղատառ', 'курсив', 'kursiv'],
  ['Module', 'մոդուլ', 'модуль', 'Modul'],
  ['Lesson', 'դաս', 'урок', 'Lektion'],
  ['and', 'և', 'и', 'und'],
];

export function translateStudyReference(source: string, locale: ReferenceLocale): string | null {
  if (source === '© Hueber Verlag.') return source;
  if (!/^(?:Glossary |KB |AB |Teacher jobs handout |Workbook transcripts PDF |Vocabulary guide: |Momente A1\.1 (?:German–English|Deutsch–Englisch) glossary|Core phrase components|Components of fixed greetings|Component of Vielen Dank)/.test(source)) return null;
  const column = locale === 'hy' ? 1 : locale === 'ru' ? 2 : 3;
  let result = source;
  for (const row of labels) result = result.replaceAll(new RegExp(`\\b${row[0]}\\b`, 'g'), row[column]!);
  const page = locale === 'hy' ? 'էջ' : locale === 'ru' ? 'стр.' : 'S.';
  const exercise = locale === 'hy' ? 'վարժ.' : locale === 'ru' ? 'упр.' : 'Aufg.';
  const lesson = locale === 'hy' ? 'դաս' : locale === 'ru' ? 'урок' : 'Lektion';
  return result.replace(/\bpp?\.\s*(?=\d)/g, `${page} `)
    .replace(/\bex\.\s*(?=\d)/g, `${exercise} `)
    .replace(/\bL(?=\d)/g, `${lesson} `);
}
