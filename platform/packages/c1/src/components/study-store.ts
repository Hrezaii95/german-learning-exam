'use client';
/* oxlint-disable react/react-compiler -- Browser storage and capability detection intentionally run after SSR hydration. */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { freshStudy, parseStudy, type StudyState } from '../lib/study-state.js';
function useStudyState() {
  const [state, setState] = useState<StudyState>(freshStudy);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wortweg-study-v2');
      if (raw) setState(parseStudy(JSON.parse(raw)));
    } catch {
      setError(true);
      setBlocked(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !blocked)
      try {
        localStorage.setItem('wortweg-study-v2', JSON.stringify(state));
      } catch {
        setError(true);
      }
  }, [state, ready, blocked]);
  function restore(value: StudyState) {
    setState(value);
    setBlocked(false);
    setError(false);
  }
  return { state, setState, ready, error, restore };
}
export type StudyStore = ReturnType<typeof useStudyState>;
const StudyContext = createContext<StudyStore | null>(null);
export function StudyProvider({ children }: { children: ReactNode }) {
  const store = useStudyState();
  return createElement(StudyContext.Provider, { value: store }, children);
}
export function useStudy() {
  const store = useContext(StudyContext);
  if (!store) throw new Error('StudyProvider is required');
  return store;
}
export function downloadFile(
  name: string,
  text: string,
  type = 'text/plain;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
