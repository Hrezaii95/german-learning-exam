"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** A manual popover stays usable above the full-screen book dialog too. */
export function SelectionMeaning({ lookup }: { lookup: (text: string) => void }) {
  const [text, setText] = useState("");
  const [host, setHost] = useState<Element | null>(null);
  const popover = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const read = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setText("");
        return;
      }
      const parent = (node: Node | null) => node instanceof Element ? node : node?.parentElement;
      const start = parent(selection.anchorNode);
      const end = parent(selection.focusNode);
      // A sibling of a modal is inert, even when its popover is in the top layer.
      setHost(start?.closest("dialog[open]") ?? null);
      const excluded = "input,textarea,[contenteditable=true],.study-dictionary,.study-selection-meaning";
      const value = selection.toString().replace(/\s+/g, " ").trim();
      // Both endpoints must be German study text. Never capture form input.
      setText(start?.closest('[lang="de"]') && end?.closest('[lang="de"]') &&
        !start.closest(excluded) && !end.closest(excluded) && value.length <= 500 ? value : "");
    };
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, []);
  useEffect(() => {
    if (text) popover.current?.showPopover();
    else popover.current?.hidePopover();
  }, [text, host]);
  const toolbar = <div ref={popover} popover="manual" className="study-selection-meaning" aria-label="Selected text tools">
    <span lang="de">{text}</span>
    <button type="button" className="study-primary" onPointerDown={event => event.preventDefault()}
      onClick={() => { const value = text; window.getSelection()?.removeAllRanges(); setText(""); lookup(value); }}>
      Meaning of selection
    </button>
    <button type="button" className="study-icon-button" aria-label="Dismiss selection"
      onClick={() => { window.getSelection()?.removeAllRanges(); setText(""); }}>✕</button>
  </div>;
  return host ? createPortal(toolbar, host) : toolbar;
}
