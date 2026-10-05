'use client';
import { translate, localize } from '../lib/i18n.js';

import { useStudy } from './study-store.js';
import { Button } from './ui/button.js';
import Link from './site-link.js';
import { lessons } from '../lib/course.js';
import {
  defaultScope,
  type ReviewItem,
  type StudyScope,
} from '../lib/flow-state.js';
import { reviewItems, scopeTitle } from '../lib/study-flow.js';
import type { Locale } from '../lib/catalog.js';

export function SaveReview({ item, lang }: { item: ReviewItem; lang: Locale }) {
  const store = useStudy();
  const t = (de: string, en: string) => (translate(de, en, lang));
  const saved = reviewItems(store.state).some((i) => i.id === item.id);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={!store.ready}
      aria-pressed={saved}
      onClick={() =>
        store.setState((s) => ({
          ...s,
          savedWords:
            saved && item.id.startsWith('word:')
              ? s.savedWords.filter((id) => 'word:' + id !== item.id)
              : s.savedWords,
          flow: {
            ...s.flow,
            saved: saved
              ? s.flow.saved.filter((i) => i.id !== item.id)
              : [...s.flow.saved, { ...item, savedAt: Date.now() }],
          },
        }))
      }
    >
      {saved
        ? t('Gemerkt ✓', 'Saved ✓')
        : t('Für meine Wiederholung merken', 'Save to My review')}
    </Button>
  );
}
export function ScopeControl({ lang }: { lang: Locale }) {
  const { state, setState, ready, error } = useStudy();
  const scope = state.flow.scope;
  const t = (de: string, en: string) => (translate(de, en, lang));
  function update(p: Partial<StudyScope>) {
    setState((s) => ({
      ...s,
      flow: { ...s.flow, scope: { ...s.flow.scope, ...p } },
    }));
  }
  return (
    <details className="flow-scope">
      <summary>
        <span>{t('Lernauswahl', 'Study selection')}</span>
        <strong>{scopeTitle(scope, lang)}</strong>
        <span>{t('Ändern', 'Change')}</span>
      </summary>
      <div className="flow-scope-body">
        <label>
          {t('Mein Fokus', 'My focus')}
          <select
            aria-label={t('Mein Fokus', 'My focus')}
            disabled={!ready}
            value={scope.mode}
            onChange={(e) =>
              update({
                mode: e.target.value as StudyScope['mode'],
                lessonId: scope.lessonId || lessons[0].id,
              })
            }
          >
            <option value="all">{t('Alles', 'Everything')}</option>
            <option value="skill">{t('Eine Fertigkeit', 'One skill')}</option>
            <option value="lesson">{t('Eine Lektion', 'One lesson')}</option>
            <option value="pages">
              {t('Ein Abschnitt im Buch', 'A book section')}
            </option>
            <option value="assignment">
              {t('Lehrauftrag', 'Teacher assignment')}
            </option>
          </select>
        </label>
        {scope.mode === 'skill' && (
          <label>
            {t('Fertigkeit', 'Skill')}
            <select
              aria-label={t('Fertigkeit', 'Skill')}
              value={scope.skill}
              onChange={(e) =>
                update({ skill: e.target.value as StudyScope['skill'] })
              }
            >
              {[
                ['lesen', 'Lesen', 'Reading'],
                ['hoeren', 'Hören', 'Listening'],
                ['schreiben', 'Schreiben', 'Writing'],
                ['sprechen', 'Sprechen', 'Speaking'],
              ].map(([id, de, en]) => (
                <option key={id} value={id}>
                  {t(de, en)}
                </option>
              ))}
            </select>
          </label>
        )}
        {scope.mode === 'lesson' && (
          <label>
            {t('Lektion', 'Lesson')}
            <select
              aria-label={t('Lektion', 'Lesson')}
              value={scope.lessonId}
              onChange={(e) => update({ lessonId: e.target.value })}
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {localize(l.title, lang)}
                </option>
              ))}
            </select>
          </label>
        )}
        {scope.mode === 'pages' && (
          <>
            <label>
              {t('Ab PDF-Seite', 'From PDF page')}
              <input
                type="number"
                min="1"
                max="110"
                value={scope.from}
                onChange={(e) => {
                  const from = Math.max(
                    1,
                    Math.min(110, Number(e.target.value) || 1),
                  );
                  update({ from, to: Math.max(from, scope.to) });
                }}
              />
            </label>
            <label>
              {t('Bis PDF-Seite', 'To PDF page')}
              <input
                type="number"
                min={scope.from}
                max="110"
                value={scope.to}
                onChange={(e) =>
                  update({
                    to: Math.max(
                      scope.from,
                      Math.min(110, Number(e.target.value) || scope.from),
                    ),
                  })
                }
              />
            </label>
          </>
        )}
        {scope.mode === 'assignment' && (
          <fieldset>
            <legend>{t('Lektionen im Auftrag', 'Assignment lessons')}</legend>
            {lessons.map((l) => (
              <label className="flow-check" key={l.id}>
                <input
                  type="checkbox"
                  checked={scope.assignment.includes(l.id)}
                  onChange={(e) =>
                    update({
                      assignment: e.target.checked
                        ? [...scope.assignment, l.id]
                        : scope.assignment.filter((id) => id !== l.id),
                    })
                  }
                />
                {localize(l.title, lang)}
              </label>
            ))}
          </fieldset>
        )}
        <p>
          {t(
            'Die Auswahl gilt für Übungen, verknüpfte Quellen, Wortschatz und Wiederholung. Buchabschnitte verwenden PDF-Seiten; nicht verknüpfte Inhalte werden nicht zugeordnet.',
            'Your selection applies to practice, linked sources, vocabulary and review. Book sections use PDF pages; unlinked content is not assigned to them.',
          )}
        </p>
        <Button
          variant="ghost"
          onClick={() =>
            setState((s) => ({
              ...s,
              flow: { ...s.flow, scope: defaultScope() },
            }))
          }
        >
          {t('Auswahl zurücksetzen', 'Reset selection')}
        </Button>
        {error && (
          <p role="alert">
            {t(
              'Speichern nicht verfügbar. Sichere deine Arbeit unter Fortschritt.',
              'Saving is unavailable. Back up your work in Progress.',
            )}
          </p>
        )}
      </div>
    </details>
  );
}
export function DailyReturn({ lang, view }: { lang: Locale; view: string }) {
  const { state } = useStudy();
  const session = state.flow.session;
  const t = (de: string, en: string) => (translate(de, en, lang));
  if (
    view === 'today' ||
    !session ||
    session.items.every((i) => i.done || i.skipped)
  )
    return null;
  return (
    <aside className="flow-return">
      <span>
        {t(
          'Deine heutige Übung ist gespeichert.',
          'Your daily session is saved.',
        )}{' '}
        {session.items.filter((i) => i.done).length}/{session.items.length}
      </span>
      <Link href="/today">
        {t('Zur Tagesübung zurück', 'Return to today’s practice')} →
      </Link>
    </aside>
  );
}
