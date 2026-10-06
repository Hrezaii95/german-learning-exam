"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LanguageSelector, useLocale } from "@/components/i18n/LocaleProvider";
import { translate } from "@/lib/i18n/catalog";
import type { ShellNavCurrent } from "@/lib/content/nav";
import "./lingovo-shell.css";

const COPY = {
  en: { courses: "Courses", a1: "A1 learning", c1: "C1 preparation", review: "Review", a1Review: "A1 review", menu: "Menu", close: "Close menu", primary: "Main navigation", skip: "Skip to main content", home: "Lingovo home", foundations: "A1 · German foundations", courseNav: "A1 course navigation", overview: "Overview", lessons: "Lessons", practice: "Practice", resources: "Resources", resourceNav: "A1 resources", saved: "Saved vocabulary" },
  de: { courses: "Kurse", a1: "A1 lernen", c1: "C1-Vorbereitung", review: "Wiederholen", a1Review: "A1 wiederholen", menu: "Menü", close: "Menü schließen", primary: "Hauptnavigation", skip: "Zum Hauptinhalt", home: "Lingovo Startseite", foundations: "A1 · Deutschgrundlagen", courseNav: "A1-Kursnavigation", overview: "Übersicht", lessons: "Lektionen", practice: "Üben", resources: "Materialien", resourceNav: "A1-Materialien", saved: "Gespeicherte Wörter" },
  hy: { courses: "Դասընթացներ", a1: "Սովորել A1", c1: "C1 պատրաստում", review: "Կրկնել", a1Review: "Կրկնել A1", menu: "Ցանկ", close: "Փակել ցանկը", primary: "Հիմնական նավարկում", skip: "Անցնել հիմնական բովանդակությանը", home: "Lingovo գլխավոր էջ", foundations: "A1 · Գերմաներենի հիմունքներ", courseNav: "A1 դասընթացի նավարկում", overview: "Ամփոփում", lessons: "Դասեր", practice: "Վարժվել", resources: "Նյութեր", resourceNav: "A1 ուսումնական նյութեր", saved: "Պահված բառեր" },
  ru: { courses: "Курсы", a1: "Учиться A1", c1: "Подготовка C1", review: "Повторение", a1Review: "Повторение A1", menu: "Меню", close: "Закрыть меню", primary: "Основная навигация", skip: "Перейти к основному содержимому", home: "Lingovo — главная", foundations: "A1 · Основы немецкого", courseNav: "Навигация курса A1", overview: "Обзор", lessons: "Уроки", practice: "Практика", resources: "Материалы", resourceNav: "Материалы A1", saved: "Сохранённые слова" },
};

function useHeaderCopy() {
  const { locale } = useLocale();
  return COPY[locale as keyof typeof COPY] ?? COPY.en;
}

/** Shared by the public catalogue, A1 learning pages and the C1 workspace. */
export function LingovoAppHeader({ track, current, mainId = "main-content" }: {
  track?: "a1" | "c1" | undefined;
  current?: string | null | undefined;
  mainId?: string;
}) {
  const copy = useHeaderCopy();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const navId = useId();
  const reviewHref = track === "c1" ? "/prepare/c1/review" : "/review";
  const isReview = current === "review" || pathname.replace(/\/$/, "") === reviewHref;

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    header.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const focusOutside = (event: FocusEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const links = [
    { href: "/learn", label: copy.courses, active: current === "learn" || /^\/learn\/?$/.test(pathname) },
    { href: "/dashboard", label: copy.a1, active: track === "a1" && !isReview },
    { href: "/prepare/c1", label: copy.c1, active: track === "c1" && !isReview },
    { href: reviewHref, label: track ? copy.review : copy.a1Review, active: isReview },
  ];

  return <>
    <a className="lingovo-skip-link" href={`#${mainId}`} onClick={event => {
      const main = document.getElementById(mainId);
      if (!main || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: "start" });
    }}>{copy.skip}</a>
    <header className="lingovo-app-header" ref={header}>
      <div className="lingovo-app-header__inner">
        <Link href="/" className="lingovo-app-brand" aria-label={copy.home}>lingovo<span aria-hidden="true">.</span></Link>
        <nav className="lingovo-app-nav" id={navId} aria-label={copy.primary} data-open={open}>
          {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={link.active ? (pathname.replace(/\/$/, "") === link.href ? "page" : "location") : undefined}>{link.label}</Link>)}
        </nav>
        <div className="lingovo-app-header__controls">
          <LanguageSelector />
          <button type="button" ref={trigger} className="lingovo-menu-toggle" aria-expanded={open} aria-controls={navId} aria-label={open ? copy.close : copy.menu} onClick={() => setOpen(value => !value)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={open ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            <span>{copy.menu}</span>
          </button>
        </div>
      </div>
    </header>
  </>;
}

const A1_RESOURCES = [
  { key: "saved", href: "/saved", label: "My review" },
  { key: "book", href: "/book", label: "Interactive book" },
  { key: "cheat-sheets", href: "/cheat-sheets", label: "Cheat sheets" },
  { key: "vocabulary", href: "/vocabulary", label: "Vocabulary" },
  { key: "verbs", href: "/verbs", label: "Verbs" },
  { key: "grammar", href: "/grammar", label: "Grammar" },
  { key: "phrases", href: "/phrases", label: "Phrases & Q&A" },
  { key: "listening", href: "/listening", label: "Listening" },
  { key: "concepts", href: "/concepts", label: "Concepts" },
  { key: "hubs", href: "/hubs", label: "Study library" },
  { key: "search", href: "/search", label: "Search" },
  { key: "references", href: "/references", label: "References" },
  { key: "settings", href: "/settings", label: "Settings" },
];

export function A1CourseNavigation({ current }: { current: ShellNavCurrent }) {
  const copy = useHeaderCopy();
  const { locale } = useLocale();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!disclosure.current?.contains(event.target as Node) && disclosure.current) disclosure.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && disclosure.current?.open && disclosure.current.contains(document.activeElement)) {
        event.preventDefault(); disclosure.current.open = false; summary.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <div className="lingovo-course-bar">
    <div className="lingovo-course-bar__inner">
      <span className="lingovo-course-name">{copy.foundations}</span>
      <nav className="lingovo-course-nav" aria-label={copy.courseNav}>
        <Link href="/dashboard" aria-current={current === "dashboard" ? "page" : undefined}>{copy.overview}</Link>
        <Link href="/lessons" aria-current={current === "lessons" ? "page" : undefined}>{copy.lessons}</Link>
        <Link href="/practice" aria-current={current === "practice" ? "page" : undefined}>{copy.practice}</Link>
        <details className="lingovo-resources" ref={disclosure}>
          <summary ref={summary} data-current={A1_RESOURCES.some(item => item.key === current) || undefined}>{copy.resources}<span aria-hidden="true">⌄</span></summary>
          <nav className="lingovo-resources__panel" aria-label={copy.resourceNav}>
            {A1_RESOURCES.map(item => <Link key={item.key} href={item.href} aria-current={current === item.key ? "page" : undefined} onClick={() => { if (disclosure.current) disclosure.current.open = false; }}>{item.key === "saved" ? copy.saved : translate(item.label, locale)}</Link>)}
          </nav>
        </details>
      </nav>
    </div>
  </div>;
}
