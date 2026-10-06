// @vitest-environment jsdom
import { createElement as h } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider, LanguageSelector } from '../../apps/web/components/i18n/LocaleProvider';
import { LH1 } from '../../apps/web/components/i18n/LocalizedElements';
import { LOCALE_KEY } from '../../apps/web/lib/i18n/catalog';

const route = vi.hoisted(() => ({ pathname: '/lessons' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

beforeEach(() => { localStorage.clear(); document.title = 'Lessons | Lingovo'; route.pathname = '/lessons'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function page(heading: string, german = false) {
  return h(LocaleProvider, null, h(LanguageSelector),
    h('main', null, h(LH1, german ? { lang: 'de' } : {}, heading)),
  );
}

it('updates the tab title after language changes and route changes while preserving German lesson headings', async () => {
  const view = render(page('Lessons'));
  await waitFor(() => expect(document.title).toBe('Դասեր | Lingovo'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'de' } });
  await waitFor(() => expect(document.title).toBe('Lektionen | Lingovo'));
  route.pathname = '/lessons/01';
  view.rerender(page('Ich heiße Miriam.', true));
  await waitFor(() => expect(document.title).toBe('Ich heiße Miriam. · Lektion 1 | Lingovo'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
  await waitFor(() => expect(document.title).toBe('Ich heiße Miriam. · Lesson 1 | Lingovo'));
  expect(localStorage.getItem(LOCALE_KEY)).toBe('en');
});

it.each(['/', '/learn'])('owns the landing title on %s and repairs late production metadata', async pathname => {
  route.pathname = pathname;
  document.title = 'Lingovo — German learning, one clear next step';
  render(page('Lessons'));
  expect(document.title).toBe('Դասեր | Lingovo');
  // Reproduce the observed production ordering: metadata arrives after the
  // page effect and the first animation frame have both already completed.
  await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const writes = vi.spyOn(document, 'title', 'set');
  await act(async () => { document.title = 'Lingovo — German learning, one clear next step'; });
  expect(document.title).toBe('Դասեր | Lingovo');
  expect(writes).toHaveBeenCalledTimes(2); // External overwrite + one repair.
});

it('handles replacement title elements, live h1 changes and route cleanup without stale writes', async () => {
  const view = render(page('Lessons'));
  const initialTitle = document.head.querySelector('title')!;
  await act(async () => {
    const replacement = document.createElement('title');
    replacement.textContent = 'Stale server metadata';
    initialTitle.replaceWith(replacement);
  });
  expect(document.title).toBe('Դասեր | Lingovo');

  // This updates only the heading. The locale/path effect does not rerun.
  view.rerender(page('Vocabulary'));
  await act(async () => {});
  expect(document.title).toBe(`${document.querySelector('main h1')!.textContent} | Lingovo`);

  route.pathname = '/lessons/02';
  view.rerender(page('Ich bin Journalistin.', true));
  await act(async () => { document.title = 'Lesson 1 | Lingovo'; });
  expect(document.title).toBe('Ich bin Journalistin. · Դաս 2 | Lingovo');
  view.unmount();
  await act(async () => { document.title = 'Title after unmount'; });
  expect(document.title).toBe('Title after unmount');
});
