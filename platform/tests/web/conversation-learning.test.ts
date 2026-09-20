import {describe,it,expect} from "vitest";
import {conversationBookmark,readConversationBookmark,conversationLines,conversationTags,spellingName,spellingUtterance,spellingAlphabet,spellingCard,conversationRecallQuestions} from "../../apps/web/lib/study/conversation-learning";
import {conversationFrames} from "../../apps/web/lib/study/sheet-topics";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {cardsForSheet} from "../../apps/web/lib/study/sheet-cards";
const cards=loadWordCards().cards;
describe("conversation context",()=>{
  it("restores every topic, register and speaker role",()=>{
    for(const frame of conversationFrames)for(const formal of [true,false])for(const role of ["ask","answer"] as const)expect(readConversationBookmark(conversationBookmark(frame.id,formal,role))).toEqual({id:frame.id,formal,role});
    for(const hash of ["#conversation-missing-formal-ask","#conversation-name-formal-other","#conversation-name","#"])expect(readConversationBookmark(hash)).toBeNull();
  });
  it("changes both sides of the du/Sie wellbeing exchange",()=>{
    const frame=conversationFrames.find(frame=>frame.id==="wellbeing")!;
    expect(conversationLines(frame,false)).toEqual({question:"Wie geht’s dir?",answer:"Gut, danke. Und dir?"});
    expect(conversationLines(frame,true)).toEqual({question:"Wie geht’s Ihnen?",answer:"Gut, danke. Und Ihnen?"});
    expect(conversationTags("languages").lessons).toEqual([3]);expect(conversationTags("work").lessons).toEqual([2]);expect(conversationTags("name").lessons).toEqual([1]);
  });
  it("builds recall from selected cards and keeps shared save identities",()=>{
    const all=cardsForSheet(cards,"conversation");expect(conversationRecallQuestions([],all)).toEqual([]);
    for(const card of all){const questions=conversationRecallQuestions([card],all);expect(questions).toHaveLength(1);expect(questions[0]!.item.id).toBe(`card-${card.id}`);expect(questions[0]!.options).toContain(questions[0]!.answers[0]);}
  });
});
describe("German name spelling",()=>{
  it("keeps umlauts and Eszett while ignoring name separators",()=>{
    expect(spellingName("Anna-Marie Groß")).toEqual({letters:["A","N","N","A","M","A","R","I","E","G","R","O","ß"],error:""});
    expect(spellingName("a\u0308 Ö Ü ẞ").letters).toEqual(["Ä","Ö","Ü","ß"]);
    for(const name of ["", "123", "René", "A".repeat(33)])expect(spellingName(name).error).not.toBe("");
  });
  it("reuses every canonical letter cue, including the distinct V/W/J names",()=>{
    expect(spellingAlphabet).toHaveLength(30);for(const letter of spellingAlphabet)expect(spellingCard(letter,cards),letter).toBeDefined();
    expect(spellingUtterance(["V","W","J","ß"],cards)).toBe("vau, we, jot, Eszett");
  });
});
