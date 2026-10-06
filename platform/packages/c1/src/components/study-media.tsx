'use client';
import { translate } from '../lib/i18n.js';
import { loadRecording, saveRecording } from '../lib/recordings.js';
import { studySources } from '../lib/study-sources.js';
import Link from './site-link.js';

/* oxlint-disable jsx-a11y/media-has-caption -- User recordings have no generated transcript; original media has separate, unaligned source transcripts in the library. Do not fabricate captions. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Explicit status regions announce feedback and preserve block layout. */
/* oxlint-disable react/react-compiler -- Browser storage and capability detection intentionally run after SSR hydration. */
import { useEffect, useRef, useState } from 'react';
import { Play, Square, Mic, Pause, RotateCcw, Download } from 'lucide-react';
import { Button } from './ui/button.js';
import type { Locale } from '../lib/catalog.js';
// A verified separate source task, never presented as audio for a demo passage.
const originalListening = studySources.find(source => source.section_id === 'testdaf.mock-exam-1.audio.transcript.002');
export function ListeningPlayer({
  text,
  lang,
}: {
  text: string;
  lang: Locale;
}) {
  const message = lang === 'hy'
    ? 'Այս նյութի ձայնագրությունը դեռ հասանելի չէ։ Օգտագործիր տեքստը կամ գրադարանի բնօրինակ ձայնագրությունները։'
    : lang === 'ru' ? 'Озвучка этого материала пока недоступна. Используйте текст или оригинальные записи в библиотеке.'
    : lang === 'de' ? 'Für dieses Material ist noch keine Aufnahme verfügbar. Nutze den Text oder die Originalaufnahmen in der Bibliothek.' : 'Audio for this material is not available yet. Use the text or the original recordings in the library.';
  return <div className="listening-player"><strong>{translate('Transkriptübung · Audio fehlt', 'Transcript practice · audio unavailable', lang)}</strong><p role="status">{message}</p><p>{translate('Diese Textübung ist kein Nachweis des Hörverstehens.', 'This text activity does not demonstrate listening comprehension.', lang)}</p><details><summary>{lang === 'hy' ? 'Բացել տեքստը' : lang === 'ru' ? 'Открыть текст' : lang === 'de' ? 'Transkript lesen' : 'Read transcript'}</summary><p>{text}</p></details>{originalListening?.media.length ? <div className="original-listening-next"><p>{translate('Für Hörpraxis öffne diese eigenständige Originalaufgabe. Sie ist keine Aufnahme des Demotextes.', 'For listening practice, open this separate original-source activity. It is not a recording of the demo text.',lang)}</p><p lang="de">{originalListening.heading_text}</p><Link className="primary-link" href={'/studio?section='+encodeURIComponent(originalListening.section_id)}>{translate('Mit Originalaudio üben','Practise with original audio',lang)}</Link></div> : null}</div>;
}
export function SpeakingRecorder({ lang, recordingId }: { lang: Locale; recordingId: string }) {
  const t = (de: string, en: string) => (translate(de, en, lang));
  const [duration, setDuration] = useState(90);
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [url, setUrl] = useState('');
  const [mime, setMime] = useState('audio/webm');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const container = useRef<HTMLElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const currentUrl = useRef('');
  const deadline = useRef(0);
  useEffect(() => {
    alive.current = true;
    setSupported(
      !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined',
    );
    loadRecording(recordingId).then(stored => {
      if (!alive.current || recorder.current || !stored?.blob?.size) return;
      currentUrl.current = URL.createObjectURL(stored.blob);
      setUrl(currentUrl.current); setMime(stored.blob.type); setSaved(true);
    }).catch(() => { /* A fresh recording can still be downloaded without device storage. */ });
    return () => {
      alive.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    };
  }, [recordingId]);
  useEffect(() => {
    if (!recording && !(url && !saved && !downloaded)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const guardNavigation = (event: MouseEvent) => {
      const control = event.target instanceof Element ? event.target.closest('a,button,[role="tab"]') : null;
      if (!control || container.current?.contains(control)) return;
      if (!window.confirm(t('Die Aufnahme läuft noch oder ist nicht gespeichert. Möchtest du diesen Bereich trotzdem verlassen?', 'The recording is still running or has not been saved. Leave this section anyway?'))) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardNavigation, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guardNavigation, true); };
  }, [recording, url, saved, downloaded, lang]);
  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    setRunning(false);
  }
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setSeconds(left);
      if (!left) stop();
    }, 200);
    return () => clearInterval(id);
  }, [running]);
  async function record() {
    setRequesting(true);
    setError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => {
        if (alive.current) {
          setError('recording');
          stop();
        }
      };
      rec.onstop = async () => {
        media.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (!blob.size) { if (alive.current) { setError('empty'); setRecording(false); setRunning(false); } return; }
        if (alive.current) {
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
          currentUrl.current = URL.createObjectURL(blob);
          setUrl(currentUrl.current); setMime(blob.type);
          setSaved(false); setDownloaded(false); setSaving(true);
          setRecording(false); setRunning(false);
        }
        // Persist even when navigation just unmounted this recorder and stopped it.
        try { await saveRecording(recordingId, blob); if (alive.current) setSaved(true); }
        catch { /* The visible download action is the fallback. */ }
        finally { if (alive.current) setSaving(false); }
      };
      rec.start();
      setSeconds(duration);
      deadline.current = Date.now() + duration * 1000;
      setRecording(true);
      setRunning(true);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (alive.current) setError('permission');
    } finally {
      if (alive.current) setRequesting(false);
    }
  }
  return (
    <section className="speaking-recorder" ref={container}>
      <div className="recorder-top">
        <div>
          <span className="eyebrow">
            {t('DEIN SPRECHVERSUCH', 'YOUR SPEAKING ATTEMPT')}
          </span>
          <p>
            {t(
              'Übungsdauer frei wählbar; keine offizielle Prüfungszeit.',
              'Choose a practice duration; this is not an official exam timer.',
            )}
          </p>
        </div>
        <output
          className={'speech-clock ' + (recording ? 'recording' : '')}
          aria-label={t('Verbleibende Sekunden', 'Seconds remaining')}
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </output>
      </div>
      <div className="study-actions">
        <label>
          {t('Dauer', 'Duration')}{' '}
          <select
            disabled={running || requesting}
            value={duration}
            onChange={(e) => {
              setDuration(Number(e.target.value));
              setSeconds(Number(e.target.value));
            }}
          >
            {[30, 60, 90, 120, 180].map((n) => (
              <option value={n} key={n}>
                {n} s
              </option>
            ))}
          </select>
        </label>
        {recording ? (
          <Button onClick={stop}>
            <Square size={16} />
            {t('Aufnahme beenden', 'Stop recording')}
          </Button>
        ) : (
          <Button disabled={!supported || requesting || saving} onClick={record}>
            <Mic size={16} />
            {requesting
              ? t('Mikrofon wird geöffnet …', 'Opening microphone…')
              : t('Aufnehmen', 'Record')}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={recording || requesting || seconds === 0}
          onClick={() => {
            if (running) setRunning(false);
            else {
              deadline.current = Date.now() + seconds * 1000;
              setRunning(true);
            }
          }}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {t('Nur Timer', 'Timer only')}
        </Button>
        <Button
          variant="ghost"
          disabled={recording || requesting}
          onClick={() => {
            setRunning(false);
            setSeconds(duration);
          }}
          aria-label={t('Timer zurücksetzen', 'Reset timer')}
        >
          <RotateCcw size={16} />
        </Button>
      </div>
      {error && (
        <p role="alert">
          {t(
            'Die Aufnahme konnte nicht erstellt werden. Prüfe die Mikrofonfreigabe oder übe mit dem Timer ohne Aufnahme.',
            'Recording could not be created. Check microphone permission or practise with the timer without recording.',
          )}
        </p>
      )}
      {!supported && (
        <p>
          {t(
            'Aufnahme wird in diesem Browser nicht unterstützt. Der Timer bleibt verfügbar.',
            'This browser does not support recording. You can still use the timer.',
          )}
        </p>
      )}
      {url && (
        <div className="recording-result">
          <audio
            controls
            src={url}
            aria-label={t('Deine Aufnahme', 'Your recording')}
          />
          <a
            download={
              'lingovo-speaking.' +
              (mime.includes('mp4')
                ? 'm4a'
                : mime.includes('ogg')
                  ? 'ogg'
                  : 'webm')
            }
            href={url}
            onClick={() => setDownloaded(true)}
          >
            <Download size={15} />
            {t('Aufnahme herunterladen', 'Download recording')}
          </a>
        </div>
      )}
      {url && <p role="status" className={saved ? 'caption' : 'notice'}>{saving ? t('Aufnahme wird gespeichert …', 'Saving recording…') : saved ? t('Letzte Aufnahme auf diesem Gerät gespeichert. Sie bleibt nach dem Verlassen verfügbar. Eine neue Aufnahme ersetzt sie.', 'Latest recording saved on this device. It remains available after leaving. A new recording replaces it.') : downloaded ? t('Download gestartet. Bewahre die Datei auf.', 'Download started. Keep the file.') : t('Aufnahme noch nicht dauerhaft gespeichert. Lade sie vor dem Verlassen herunter.', 'Recording is not saved permanently yet. Download it before leaving.')}</p>}
      <small>
        {t(
          'Aufnahmen bleiben auf diesem Gerät und werden nicht hochgeladen. Lade wichtige Versuche zusätzlich herunter.',
          'Recordings stay on this device and are not uploaded. Download important attempts as well.',
        )}
      </small>
    </section>
  );
}
