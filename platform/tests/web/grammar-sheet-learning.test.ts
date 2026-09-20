import {describe,expect,it} from "vitest";
import {learningVerbs,verbAnatomy,verbRecallQuestions,selectedVerbs} from "../../apps/web/lib/study/verb-learning";
import {questionRecallQuestions,questionTags,builderReply} from "../../apps/web/lib/study/question-learning";
import {questionWords,questionBuilders} from "../../apps/web/lib/study/questions";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {cardsForSheet} from "../../apps/web/lib/study/sheet-cards";
import {defaultStudyScope,matchesStudyScope} from "../../apps/web/lib/study/scope";
import {wordStudyTags} from "../../apps/web/lib/study/tags";
const model=(verb:string)=>learningVerbs.find(model=>model.verb===verb)!;
describe("published verb forms explained without generating new forms",()=>{
  it("reconstructs every published form exactly",()=>{
    expect(learningVerbs.length).toBeGreaterThan(100);
    for(const verb of learningVerbs)for(let person=0;person<6;person++){
      const parts=verbAnatomy(verb,person);
      expect(`${parts.stem}${parts.ending}${parts.rest?` ${parts.rest}`:""}`).toBe(verb.forms[person]);
    }
  });
  it("teaches linking vowels, sibilants, changed stems and whole-word exceptions accurately",()=>{
    expect(verbAnatomy(model("arbeiten"),1)).toMatchObject({stem:"arbeit",ending:"est",changed:false});
    expect(verbAnatomy(model("lesen"),1)).toMatchObject({stem:"lies",ending:"t",changed:true});
    expect(verbAnatomy(model("heißen"),1)).toMatchObject({stem:"heiß",ending:"t",changed:false});
    expect(verbAnatomy(model("sprechen"),1)).toMatchObject({stem:"sprich",ending:"st",changed:true});
    expect(verbAnatomy(model("sammeln"),0)).toMatchObject({stem:"samml",ending:"e",changed:true});
    expect(verbAnatomy(model("sammeln"),3)).toMatchObject({stem:"sammel",ending:"n",changed:false});
    expect(verbAnatomy(model("können"),0)).toMatchObject({stem:"kann",ending:""});
    expect(verbAnatomy(model("möchten"),2)).toMatchObject({stem:"möcht",ending:"e"});
    expect(verbAnatomy(model("sein"),1)).toMatchObject({stem:"bist",ending:"",whole:true});
    expect(()=>verbAnatomy(model("wohnen"),8)).toThrow(RangeError);
  });
  it("distinguishes separable prefixes and reflexive pronouns",()=>{
    expect(verbAnatomy(model("ankommen"),1)).toMatchObject({stem:"komm",ending:"st",rest:"an",restLabel:"Separable prefix"});
    expect(verbAnatomy(model("sich freuen"),1)).toMatchObject({stem:"freu",ending:"st",rest:"dich",restLabel:"Reflexive pronoun"});
  });
  it("builds recall only from the visible source cards",()=>{
    const cards=cardsForSheet(loadWordCards().cards,"verbs");
    expect(verbRecallQuestions(cards)).toHaveLength(8);
    expect(verbRecallQuestions([])).toEqual([]);
    for(const card of cards){
      const questions=verbRecallQuestions([card]);
      if(selectedVerbs([card]).length)expect(questions.length).toBeGreaterThan(0);
      for(const question of questions){expect(question.options).toContain(question.answers[0]);expect(question.item.studyTags).toEqual(wordStudyTags(card));}
    }
  });
});
describe("selected question practice",()=>{
  it("retains the original eight patterns for the full course",()=>{expect(questionRecallQuestions(()=>true)).toHaveLength(8);});
  it("handles every lesson and a source selection with no matching material",()=>{
    for(let lesson=1;lesson<=12;lesson++){
      const scope={...defaultStudyScope(),mode:"one" as const,lessons:[lesson],source:"course" as const};
      const matches=(tags:Parameters<typeof matchesStudyScope>[0])=>matchesStudyScope(tags,scope);
      const questions=questionRecallQuestions(matches);
      expect(questions.length).toBeGreaterThan(0);
      for(const question of questions){expect(matches(question.item.studyTags!)).toBe(true);expect(question.options).toContain(question.answers[0]);}
    }
    expect(questionRecallQuestions(tags=>tags.source==="teacher-extra")).toEqual([]);
  });
  it("keeps preview question words separate and builds full affirmative replies",()=>{
    expect(questionWords.filter(word=>questionTags(word).source==="study-extra").map(word=>word.id)).toEqual(["warum","wen","wem","wessen"]);
    for(const builder of questionBuilders){expect(builderReply(builder.answer,false)).toBe(builder.answer);expect(builderReply(builder.answer,true)).toMatch(/^Ja, [a-zäöü]/u);}
    expect(builderReply("Ich wohne in Berlin.",true)).toBe("Ja, ich wohne in Berlin.");
  });
});
