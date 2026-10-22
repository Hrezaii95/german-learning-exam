import assert from "node:assert/strict";
import { test } from "node:test";
import { validateScope, validateProgress, pagination } from "../src/classes/validation.js";

test("scope v1 preserves documented filters and rejects oversized or invalid input", () => {
  assert.deepEqual(validateScope({ v: 1, book: "momente-a1", upTo: { lesson: 5, page: 62 }, skills: ["gender"], count: 20 }),
    { v: 1, book: "momente-a1", upTo: { lesson: 5, page: 62 }, skills: ["gender"], count: 20 });
  assert.throws(() => validateScope({ v: 2 }));
  assert.throws(() => validateScope({ v: 1, skills: ["sql"] }));
  assert.throws(() => validateScope({ v: 1, count: 10001 }));
  assert.throws(() => validateScope({ v: 1, upTo: { lesson: -1 } }));
});

test("assignment snapshots enforce score bounds and supported skill names", () => {
  assert.deepEqual(validateProgress({ assignmentId: "a", answered: 10, correct: 7, completed: false,
    bySkill: { gender: { answered: 10, correct: 7 } } }),
    { assignmentId: "a", answered: 10, correct: 7, completed: false, bySkill: { gender: { answered: 10, correct: 7 } } });
  assert.throws(() => validateProgress({ assignmentId: "a", answered: 2, correct: 3, completed: false, bySkill: {} }));
  assert.throws(() => validateProgress({ assignmentId: "a", answered: 2, correct: 2, completed: "yes", bySkill: {} }));
  assert.throws(() => validateProgress({ assignmentId: "a", answered: 2, correct: 2, completed: false, bySkill: { notes: { answered: 1, correct: 1 } } }));
});

test("pagination uses bounded integers, rejecting malformed values", () => {
  assert.deepEqual(pagination(new URL("https://example.invalid/api")), { limit: 50, offset: 0 });
  assert.deepEqual(pagination(new URL("https://example.invalid/api?limit=100&offset=20")), { limit: 100, offset: 20 });
  for (const q of ["limit=-1", "limit=101", "limit=1.5", "offset=-1", "offset=abc"]) assert.throws(() => pagination(new URL(`https://example.invalid/api?${q}`)));
});
