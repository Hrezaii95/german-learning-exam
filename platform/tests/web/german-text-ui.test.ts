/** @vitest-environment jsdom */
import {createElement} from "react";
import {afterEach,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {GermanText} from "../../apps/web/components/study/StudyProvider";
afterEach(cleanup);

it("preserves punctuation and spaces while keeping sentence endings attached to their words",()=>{
  for(const text of ["Mia ist meine Enkelin.","Hallo, Anna! Wie geht’s?","… Hallo!", "Preis: 20,50 €.","Ja; nein: vielleicht…"]){
    const {container,unmount}=render(createElement(GermanText,{text}));
    expect(container.textContent).toBe(text);
    unmount();
  }
  render(createElement(GermanText,{text:"Mia ist meine Enkelin."}));
  const word=screen.getByRole("button",{name:"Look up Enkelin"});
  expect(word.textContent).toBe("Enkelin.");
  expect(word.nextSibling?.textContent??"").toBe("");
});

it("keeps one keyboard entry and moves between words with arrow keys",async()=>{
  const user=userEvent.setup();
  render(createElement(GermanText,{text:"Hallo, Anna!"}));
  const words=screen.getAllByRole("button");
  expect(words.map(word=>word.tabIndex)).toEqual([0,-1]);
  words[0]!.focus();
  await user.keyboard("{ArrowRight}");
  expect(document.activeElement).toBe(words[1]);
  expect(words.map(word=>word.tabIndex)).toEqual([-1,0]);
  expect(words[1]!.getAttribute("aria-label")).toBe("Look up Anna");
});
