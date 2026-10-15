import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {SubjectIcon,SubjectVocabularyVisual} from "../../apps/web/components/study/SubjectIllustration";
import {studyConcepts,type StudyConcept} from "../../apps/web/lib/study/scope";

const visual=(de:string,category="Noun",cardId="source-test",subject:StudyConcept="everyday")=>renderToStaticMarkup(createElement(SubjectVocabularyVisual,{de,category,cardId,subject}));

describe("subject overview illustrations",()=>{
  it("gives every canonical subject a distinct decorative topic drawing",()=>{
    const paths=studyConcepts.map(({id})=>{
      const markup=renderToStaticMarkup(createElement(SubjectIcon,{subject:id}));
      expect(markup).toContain(`data-subject-icon="${id}"`);
      expect(markup).toContain('aria-hidden="true"');
      return markup.match(/<path d="([^"]+)"/)?.[1];
    });
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(studyConcepts.length);
  });

  it("uses exact object and guarded home matches without guessing from the subject",()=>{
    expect(visual("die Uhr")).toContain('data-subject-visual="object:watch"');
    expect(visual("der Tisch")).toContain('data-subject-visual="home:tisch"');
    expect(visual("das Hotelzimmer")).toContain('data-subject-visual="home:hotelzimmer"');
    for(const word of ["das Buchregal","das unbekannte Objekt","constructor"]){
      const markup=visual(word,"Noun","unknown","home");
      expect(markup).toContain('data-subject-visual="source-glyph"');
      expect(markup).not.toContain("home-illustration");
      expect(markup).not.toContain("object-vocabulary-illustration");
    }
  });

  it("uses a country flag only for an exact registered country name",()=>{
    const country=visual("die Schweiz","Country");
    expect(country).toContain('data-subject-visual="country:CH"');
    expect(country).toContain("/flags/ch.svg");
    for(const word of ["Deutsch","Französisch"]){
      const language=visual(word,"Language");
      expect(language).toContain('data-subject-visual="language"');
      expect(language).not.toContain("/flags/");
    }
    expect(visual("Schweizer Käse")).not.toContain("/flags/");
  });

  it("keeps colour words distinct from food nouns and gives activities semantic drawings",()=>{
    expect(visual("orange")).toContain('data-subject-visual="colour:orange"');
    expect(visual("die Orange")).toContain('data-subject-visual="semantic:citrus"');
    expect(visual("der Tee")).toContain('data-subject-visual="food:3"');
    expect(visual("schwimmen","Verb")).toContain('data-subject-visual="hobby:0"');
    expect(visual("der Bus")).toContain('data-subject-visual="semantic:bus"');
    expect(visual("die Ärztin","Profession")).toContain('data-subject-visual="semantic:medical"');
    expect(visual("der Buschtrommler","Profession")).toContain('data-subject-visual="source-glyph"');
  });

  it("uses canonical source identifiers for number and alphabet glyphs",()=>{
    const number=visual("einundzwanzig","Number","N021");
    expect(number).toContain('data-subject-visual="number"');
    expect(number).toContain(">21</text>");
    const letter=visual("be","Alphabet","A02");
    expect(letter).toContain('data-subject-visual="letter"');
    expect(letter).toContain(">B</text>");
    expect(visual("unlisted","Alphabet","A31")).toContain('data-subject-visual="source-glyph"');
    expect(visual("unlisted","Number","N999")).toContain('data-subject-visual="source-glyph"');
  });
});
