import { createCompleteBackup } from "../study/backup";

const destination = "https://german.learnilabs.com";
/** Loaded only in the Pages client entry. No request carries account cookies. */
export async function mountMoveBanner(): Promise<void> {
  if (!window.location.hostname.endsWith(".github.io") || document.getElementById("gl-move-banner")) return;
  try {
    const response = await fetch(`${destination}/api/health`, { method: "GET", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const health: unknown = await response.json();
    if (!health || typeof health !== "object" || !("ok" in health) || health.ok !== true || !("service" in health) || health.service !== "german-web") return;
    // Two entry chunks may finish the readiness request together.
    if (document.getElementById("gl-move-banner")) return;
    const banner = document.createElement("aside");
    banner.id = "gl-move-banner";
    banner.setAttribute("aria-label", "New learning address");
    banner.style.cssText = "position:fixed;inset-inline-end:max(.75rem,env(safe-area-inset-right,0px));bottom:calc(var(--measured-bottom-nav-height,5rem) + env(safe-area-inset-bottom,0px) + .75rem);z-index:80;width:min(26rem,calc(100vw - 1.5rem));max-height:calc(100dvh - var(--measured-bottom-nav-height,5rem) - 2rem);overflow:auto;box-sizing:border-box;padding:1rem;display:grid;gap:.75rem;border:1px solid var(--line,#e4ddd2);border-radius:1rem;background:var(--paper,#fffdf8);color:var(--ink,#203536);box-shadow:0 .4rem 1.5rem color-mix(in srgb,var(--ink,#203536) 18%,transparent)";
    const heading = document.createElement("strong");
    heading.textContent = "We moved to german.learnilabs.com";
    heading.style.cssText = "padding-inline-end:2rem;line-height:1.4";
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "×";
    dismiss.setAttribute("aria-label", "Dismiss new address notice");
    dismiss.style.cssText = "position:absolute;inset-block-start:.35rem;inset-inline-end:.35rem;width:2.5rem;height:2.5rem;font:inherit;font-size:1.5rem;cursor:pointer;border:0;border-radius:.5rem;background:transparent;color:var(--ink,#203536)";
    dismiss.addEventListener("click", () => banner.remove());
    const text = document.createElement("span");
    text.setAttribute("role", "status");
    text.textContent = "Download your progress backup, then choose the file at the new address. Nothing is uploaded automatically.";
    text.style.cssText = "line-height:1.5;font-size:.95rem";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Take my progress with me";
    button.style.cssText = "font:inherit;font-weight:600;min-height:2.75rem;padding:.65rem .9rem;cursor:pointer;border-radius:.6rem;border:1px solid var(--action,#345d4c);background:var(--action,#345d4c);color:var(--paper,#fffdf8)";
    button.addEventListener("click", () => {
      try {
        const backup = createCompleteBackup(window.localStorage);
        const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url; link.download = "german-learning-progress.json"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        window.open(`${destination}/account/import/`, "_blank", "noopener,noreferrer");
        text.setAttribute("role", "status");
        text.textContent = "Your backup download has started. Choose the file on the new site's Import progress page.";
      } catch {
        text.setAttribute("role", "alert");
        text.textContent = "Your backup could not be downloaded. Keep this page open and try again.";
      }
    });
    const importLink = document.createElement("a");
    importLink.href = `${destination}/account/import/`;
    importLink.target = "_blank";
    importLink.rel = "noopener noreferrer";
    importLink.textContent = "Open the new Import progress page";
    importLink.style.cssText = "color:var(--action,#345d4c);text-underline-offset:.2em;font-size:.9rem";
    banner.append(heading, dismiss, text, button, importLink);
    document.body.append(banner);
  } catch { /* No readiness signal: keep the existing learning experience. */ }
}

if (typeof window !== "undefined") {
  if (document.readyState === "complete") void mountMoveBanner();
  else window.addEventListener("load", () => { void mountMoveBanner(); }, { once: true });
}
