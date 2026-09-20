import {describe,it,expect} from "vitest";
import {numberParts,listeningNumbers,numberRecallQuestions} from "../../apps/web/lib/study/number-learning";
import {germanNumber} from "../../apps/web/lib/study/sheet-topics";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {cardsForSheet} from "../../apps/web/lib/study/sheet-cards";
import {wordStudyTags} from "../../apps/web/lib/study/tags";
const cards=cardsForSheet(loadWordCards().cards,"numbers");
describe("number reading order",()=>{
  it("recombines every number through 9999 and larger boundary examples exactly",()=>{
    for(const value of [...Array.from({length:10000},(_,n)=>n),10000,10001,21021,123456,999999,1000000])expect(numberParts(value).map(part=>part.spoken).join("")).toBe(germanNumber(value));
    expect(()=>numberParts(-1)).toThrow(RangeError);expect(()=>numberParts(1.5)).toThrow(RangeError);expect(()=>numberParts(1000001)).toThrow(RangeError);
  });
  it("makes the units-before-tens reversal visible after hundreds and thousands",()=>{
    expect(numberParts(1452).map(part=>part.spoken)).toEqual(["eintausend","vierhundert","zwei","und","fünfzig"]);
    expect(numberParts(101).map(part=>part.spoken)).toEqual(["einhundert","eins"]);
    expect(numberParts(1000000)[0]).toMatchObject({spoken:"eine Million",role:"whole"});
  });
});
describe("number practice selection",()=>{
  it("uses only visible cards and the selected difficulty range",()=>{
    for(const range of ["all","foundation","teens","tens"] as const){const pool=listeningNumbers(cards,range);expect(pool.length).toBeGreaterThan(0);expect(pool.length).toBeLessThanOrEqual(8);for(const item of pool){expect(cards).toContain(item.card);if(range==="foundation")expect(item.value).toBeLessThanOrEqual(12);if(range==="teens"){expect(item.value).toBeGreaterThanOrEqual(13);expect(item.value).toBeLessThanOrEqual(19);}if(range==="tens")expect(item.value).toBeGreaterThanOrEqual(20);}}
    const one=cards.filter(card=>card.id==="N021");expect(listeningNumbers(one,"all").map(item=>item.value)).toEqual([21]);expect(listeningNumbers(one,"teens")).toEqual([]);
  });
  it("keeps each recall answer and saved card tied to the visible selection",()=>{
    expect(numberRecallQuestions([])).toEqual([]);
    for(const card of cards){for(const question of numberRecallQuestions([card])){expect(question.options).toContain(question.answers[0]);expect(question.item.id).toBe(`card-${card.id}`);}}
    expect(numberRecallQuestions(cards)).toHaveLength(8);
  });
  it("includes the course noun Million with number tags and article practice",()=>{
    const million=cards.find(card=>card.rows.some(row=>row.singular.text==="die Million"));
    expect(million).toBeDefined();expect(wordStudyTags(million!).concepts).toContain("numbers");
    expect(numberRecallQuestions([million!])[0]).toMatchObject({prompt:"___ Million",answers:["die"],answerText:"die Million"});
  });
});
