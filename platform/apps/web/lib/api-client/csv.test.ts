import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, serializeCsv } from "./csv";
test("formula markers after whitespace or line breaks remain text", () => {
  for (const value of ["=SUM(1,2)", " +cmd", "\n=1+1", "\r@SUM(1)", "\t-2", "  @A1", "\nplain"]) assert.ok(csvCell(value).startsWith('"\''), value);
  assert.equal(csvCell("safe value"), '"safe value"');
});
test("CSV quotes, line breaks and Unicode round trip without dropping fields", () => {
  assert.equal(serializeCsv([{ student: 'Anna "A"', note: "Tür\nBank" }]), '"student","note"\r\n"Anna ""A""","Tür\nBank"');
});
