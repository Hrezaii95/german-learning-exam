'use client';
import { translate } from '../lib/i18n.js';

/* oxlint-disable jsx-a11y/media-has-caption -- User recordings have no generated transcript; original media has separate, unaligned source transcripts in the library. Do not fabricate captions. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Explicit status regions announce feedback and preserve block layout. */
/* oxlint-disable react/react-compiler -- Browser storage and capability detection intentionally run after SSR hydration. */
import { useEffect, useRef, useState } from 'react';
import { Play, Square, Mic, Pause, RotateCcw, Download } from 'lucide-react';
import { Button } from './ui/button.js';
import type { Locale } from '../lib/catalog.js';
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
    : 'Audio for this material is not available yet. Use the text or the original recordings in the library.';
  return <div className="listening-player"><p role="status">{message}</p><details><summary>{lang === 'hy' ? 'Բացել տեքստը' : lang === 'ru' ? 'Открыть текст' : 'Read transcript'}</summary><p>{text}</p></details></div>;
}
export function SpeakingRecorder({ lang }: { lang: Locale }) {
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
  const recorder = useRef<MediaRecorder | null>(null);
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
    return () => {
      alive.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    };
  }, []);
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
      rec.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (alive.current) {
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          if (blob.size) {
            currentUrl.current = URL.createObjectURL(blob);
            setUrl(currentUrl.current);
            setMime(blob.type);
          } else setError('empty');
          setRecording(false);
          setRunning(false);
        }
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
    <section className="speaking-recorder">
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
          <Button disabled={!supported || requesting} onClick={record}>
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
              'wortweg-speaking.' +
              (mime.includes('mp4')
                ? 'm4a'
                : mime.includes('ogg')
                  ? 'ogg'
                  : 'webm')
            }
            href={url}
          >
            <Download size={15} />
            {t('Aufnahme herunterladen', 'Download recording')}
          </a>
        </div>
      )}
      <small>
        {t(
          'Aufnahmen werden nicht hochgeladen und bleiben nur bis zum Verlassen der Lektion verfügbar. Lade sie bei Bedarf herunter.',
          'Recordings are not uploaded and remain available only until you leave this lesson. Download any you want to keep.',
        )}
      </small>
    </section>
  );
}
