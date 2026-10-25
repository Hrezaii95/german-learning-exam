import { expect, type Page, type TestInfo } from "@playwright/test";

/** Print the visible learner state and retain real A4/Letter artifacts. */
export async function printLiveSheet(page: Page, info: TestInfo, name: string, verify: () => Promise<void>, exportPdf = true) {
  const pdfs: {format: "A4" | "Letter"; bytes: Buffer}[] = [];
  await expect(page.locator(".sheet-print-summary")).toHaveCount(0);
  await page.emulateMedia({ media: "print" });
  await verify();
  await page.evaluate(() => document.fonts.ready);
  if (exportPdf) {
    for (const format of ["A4", "Letter"] as const) {
      const path = info.outputPath(`${name}-${format}.pdf`);
      const bytes = await page.pdf({ path, format, printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" } });
      pdfs.push({format, bytes});
      await info.attach(`${name}-${format}`, { path, contentType: "application/pdf" });
    }
  }
  await page.emulateMedia({ media: "screen" });
  return pdfs;
}
