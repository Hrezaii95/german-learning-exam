"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { translate, type Locale } from '@/lib/i18n/catalog';

/** Keep tab titles aligned with the already localized, visible page heading. */
export function LocaleDocumentTitle({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  useEffect(() => {
    // Isolated components without a Next route do not change their host title.
    if (!pathname) return;
    let active = true;
    const update = () => {
      if (!active) return;
      const heading = document.querySelector('main h1')?.textContent?.trim().replace(/\s+/g, ' ');
      if (!heading) return;
      const lesson = pathname.match(/\/lessons\/0*(\d+)(?:\/|$)/)?.[1];
      const context = lesson ? ` · ${translate(`Lesson ${Number(lesson)}`, locale)}` : '';
      const title = `${heading}${context} | Lingovo`;
      // Our write also notifies the head observer. Equality makes that next
      // notification a no-op rather than a mutation loop.
      if (document.title !== title) document.title = title;
    };

    // Production hydration can commit Next's metadata after page effects and
    // animation frames. Repair a late title replacement using the current h1.
    const headObserver = new MutationObserver(update);
    headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });

    // Some pages replace their heading without navigating (word-card browsing,
    // for example). Observe the main region, but react only to h1 changes.
    const isHeading = (node: Node) => node instanceof Element
      && (node.matches('h1') || Boolean(node.querySelector('h1')));
    const headingObserver = new MutationObserver(records => {
      if (records.some(record => {
        const element = record.target instanceof Element ? record.target : record.target.parentElement;
        return Boolean(element?.closest('h1'))
          || [...record.addedNodes, ...record.removedNodes].some(isHeading);
      })) update();
    });
    const main = document.querySelector('main');
    if (main) headingObserver.observe(main, { childList: true, subtree: true, characterData: true });

    update();
    const frame = window.requestAnimationFrame(update);
    return () => {
      active = false;
      headObserver.disconnect();
      headingObserver.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [locale, pathname]);

  return null;
}
