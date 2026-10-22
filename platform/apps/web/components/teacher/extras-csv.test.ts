import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, teacherPackFromCsv } from "./extras-csv";
test("quoted commas, newlines and escaped quotes preserve vocabulary", () => {
  assert.deepEqual(parseCsv('German,English\r\n"die Tür","the door, or gate"\r\n"sagen","say ""hello""\nagain"'), [["German", "English"], ["die Tür", "the door, or gate"], ["sagen", 'say "hello"\nagain']]);
});
test("malformed quotes and uneven rows fail before producing a pack", () => {
  assert.throws(() => parseCsv('German,"English'), /not closed/);
  assert.throws(() => parseCsv('"German"oops,English'), /Unexpected/);
  assert.throws(() => teacherPackFromCsv('German,English,Lesson\nder Hund,dog,1,extra', "class-1", "Words"), /column count/);
});
test("teacher extras retain Unicode and explicit gender, class source and pending review", () => {
  const { pack } = teacherPackFromCsv('German,English,Lesson,Page,Tags,Gender,Plural\ndie Tu\u0308r,door,2,12,home;objects,f,Türen', "class-1", "At home");
  assert.equal(pack.items[0]?.lemma, "Tür"); assert.equal(pack.items[0]?.gender, "f"); assert.equal(pack.items[0]?.source, "teacher-extra");
  assert.equal(pack.review.status, "pending-german-review"); assert.equal(pack.items[0]?.unitId, pack.units[0]?.id);
  assert.deepEqual(pack.items[0]?.forms?.plural, ["Türen"]);
});
test("duplicates flag review without silently deleting a second meaning", () => {
  const { pack, warnings } = teacherPackFromCsv('German,English,Lesson\ndie Bank,bank,1\ndie Bank,bench,1', "class-1", "Meanings");
  assert.equal(pack.items.length, 2); assert.ok(warnings.some(w => w.includes("duplicate")));
});
test("article conflicts and invalid lesson/page reject publication", () => {
  assert.throws(() => teacherPackFromCsv('German,English,Lesson,Gender\nder Hund,dog,1,f', "class-1", "Words"), /disagree/);
  assert.throws(() => teacherPackFromCsv('German,English,Lesson\nHund,dog,0', "class-1", "Words"), /valid lesson/);
  assert.throws(() => teacherPackFromCsv('German,English,Lesson,Page\nHund,dog,1,NaN', "class-1", "Words"), /invalid page/);
});
