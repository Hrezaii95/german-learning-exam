import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {SubjectVocabularyVisual} from "../../apps/web/components/study/SubjectIllustration";
import {loadSubjectVocabulary} from "../../apps/web/lib/study/subject-sheets.server";

const vocabulary=loadSubjectVocabulary();
const illustrated=vocabulary.map(item=>({item,markup:renderToStaticMarkup(createElement(SubjectVocabularyVisual,{...item,subject:item.studyTags.concepts[0]??"everyday"}))}));

describe("published vocabulary illustration coverage",()=>{
  it("gives every published word a meaningful illustration or a deliberate number/letter symbol",()=>{
    const placeholders=illustrated.filter(({markup})=>markup.includes('data-subject-visual="source-glyph"')).map(({item})=>`${item.cardId}: ${item.de}`);
    expect(placeholders).toEqual([]);
    expect(illustrated.length).toBe(1338);
  });

  it("preserves the approved Home illustrations and meaningful number/letter symbols",()=>{
    const home=illustrated.filter(({item})=>item.studyTags.concepts.includes("home"));
    expect(home.length).toBe(31);
    for(const {markup} of home)expect(markup).toMatch(/data-subject-visual="(?:home|object):/);
    expect(illustrated.filter(({markup})=>markup.includes('data-subject-visual="number"'))).toHaveLength(101);
    expect(illustrated.filter(({markup})=>markup.includes('data-subject-visual="letter"'))).toHaveLength(30);
  });

  it("uses the outline illustration style around every accurate country flag",()=>{
    const countries=illustrated.filter(({markup})=>markup.includes('data-subject-visual="country:'));
    expect(countries).toHaveLength(41);
    for(const {markup} of countries){
      expect(markup).toContain('stroke="currentColor"');
      expect(markup).toContain('stroke-width="2.6"');
      expect(markup).toContain('opacity=".055"');
      expect(markup).toContain("/flags/");
      expect(markup).toContain("<image ");
    }
  });
});
