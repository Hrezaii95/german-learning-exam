import type {Locale} from '@/lib/i18n/catalog';

/** Russian intentionally receives the Armenian film; German uses English. */
export function launchVideoForLocale(locale: Locale) {
  const language = locale === 'hy' || locale === 'ru' ? 'hy' : 'en';
  return {
    language,
    src: `/lingovo/launch/Lingovo-Launch-${language === 'hy' ? 'Armenian' : 'English'}.mp4`,
    poster: `/lingovo/launch/launch-${language}-poster.jpg`,
    captions: `/lingovo/launch/launch-${language}.vtt`,
  };
}

const copy = {
  heroFirst: ['New language.','Neue Sprache.','Նոր լեզու։','Новый язык.'],
  heroSecond: ['New doors.','Neue Türen.','Նոր դռներ։','Новые двери.'],
  firstStep: ['FIRST STEP','ERSTER SCHRITT','ԱՌԱՋԻՆ ՔԱՅԼԸ','ПЕРВЫЙ ШАГ'],
  newBeginning: ['Hello. A new beginning.','Hallo. Ein neuer Anfang.','Բարև։ Մի նոր սկիզբ։','Привет. Новое начало.'],
  yourLanguage: ['In your language.','In deiner Sprache.','Քո լեզվով։','На вашем языке.'],
  nextChapter: ['YOUR NEXT CHAPTER ↗','DEIN NÄCHSTES KAPITEL ↗','ՔՈ ՀԱՋՈՐԴ ՔԱՅԼԸ ↗','ВАША НОВАЯ ГЛАВА ↗'],
  heroBody: ['From your first Hallo to advanced German. Practise with clear explanations in your language, original learning material and a pace that works for you.','Vom ersten Hallo bis zu fortgeschrittenem Deutsch. Übe mit klaren Erklärungen in deiner Sprache, Originalmaterial und in deinem eigenen Tempo.','Առաջին «Hallo»-ից մինչև առաջադեմ գերմաներեն։ Սովորի՛ր քո լեզվով բացատրություններով, բնօրինակ նյութերով և քո սեփական տեմպով։','От первого Hallo до продвинутого немецкого. Учитесь с понятными объяснениями на вашем языке, оригинальными материалами и в своём темпе.'],
  kicker: ['GERMAN · YOUR NEXT CHAPTER','DEUTSCH · DEIN NÄCHSTES KAPITEL','ԳԵՐՄԱՆԵՐԵՆ · ՔՈ ՀԱՋՈՐԴ ՔԱՅԼԸ','НЕМЕЦКИЙ · ВАША НОВАЯ ГЛАВА'],
  choose: ['Explore A1 and C1','A1 und C1 entdecken','Ծանոթանալ A1-ին և C1-ին','Посмотреть A1 и C1'],
  watch: ['Meet Lingovo in 30 seconds.','Lerne Lingovo in 30 Sekunden kennen.','Ծանոթացի՛ր Lingovo-ին 30 վայրկյանում։','Познакомьтесь с Lingovo за 30 секунд.'],
  videoKicker: ['WATCH · THEN TRY','ANSEHEN · DANN AUSPROBIEREN','ԴԻՏԻ՛Ր · ՀԵՏՈ ՓՈՐՁԻ՛Ր','ПОСМОТРИТЕ · ЗАТЕМ ПОПРОБУЙТЕ'],
  videoBody: ['A little German, every day. Watch our launch film, then try your first real lesson.','Jeden Tag ein bisschen Deutsch. Schau dir unseren Startfilm an und probiere danach deine erste richtige Lektion.','Մի փոքր գերմաներեն՝ ամեն օր։ Դիտի՛ր մեկնարկի տեսանյութը, հետո փորձի՛ր առաջին իսկական դասը։','Немного немецкого каждый день. Посмотрите наш стартовый ролик, затем попробуйте первый настоящий урок.'],
  previewNote: ['The film is a launch preview. A1 and C1 practice are available here now.','Der Film ist eine Startvorschau. A1- und C1-Übungen sind hier bereits verfügbar.','Տեսանյութը մեկնարկի նախադիտումն է։ A1 և C1 վարժություններն այստեղ արդեն հասանելի են։','Видео — анонс запуска. Практика A1 и C1 уже доступна здесь.'],
  videoHy: ['Armenian launch video','Startfilm auf Armenisch','Մեկնարկի տեսանյութ՝ հայերեն','Стартовый ролик на армянском'],
  videoEn: ['English launch video','Startfilm auf Englisch','Մեկնարկի տեսանյութ՝ անգլերեն','Стартовый ролик на английском'],
  openVideo: ['Open video','Video öffnen','Բացել տեսանյութը','Открыть видео'],
  videoError: ['The video could not load. Open it directly below.','Das Video konnte nicht geladen werden. Öffne es über den Link unten.','Տեսանյութը չհաջողվեց բեռնել։ Բացի՛ր այն ստորև նշված հղումով։','Видео не загрузилось. Откройте его по ссылке ниже.'],
  portalAlt: ['An illustrated doorway connects Yerevan with your next German-learning chapter.','Eine illustrierte Tür verbindet Jerewan mit deinem nächsten Deutschlern-Kapitel.','Պատկերազարդ դուռը կապում է Երևանը գերմաներենի ուսուցման քո հաջորդ քայլին։','Иллюстрированная дверь соединяет Ереван с вашей новой главой изучения немецкого.'],
  loopAlt: ['An illustrated book becomes a learning path.','Ein illustriertes Buch wird zum Lernweg.','Պատկերազարդ գիրքը վերածվում է ուսուցման ուղու։','Иллюстрированная книга превращается в путь обучения.'],
  skillsAlt: ['Reading, listening, writing and speaking around a German study desk.','Lesen, Hören, Schreiben und Sprechen an einem Deutschlern-Arbeitsplatz.','Կարդալ, լսել, գրել և խոսել՝ գերմաներենի ուսուցման միջավայրում։','Чтение, аудирование, письмо и речь в пространстве для изучения немецкого.'],
  skillLabels: [['Reading','Listening','Writing','Speaking'],['Lesen','Hören','Schreiben','Sprechen'],['Կարդալ','Լսել','Գրել','Խոսել'],['Чтение','Аудирование','Письмо','Речь']],
} as const;

export function landingCopy(locale: Locale) {
  const index = {en: 0, de: 1, hy: 2, ru: 3}[locale];
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as {[K in keyof typeof copy]: (typeof copy)[K][number]};
}
