"""Map publisher transcripts to the actual recording filenames, not disc offsets."""
import hashlib
import json
import re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / 'platform/apps/web/generated'
KB = ROOT / 'research/book-reader-update/coursebook-transcripts-source.pdf'
AB = ROOT / 'resources/original/transcripts/Momente_AB_A1_1_Transskriptionen_2.pdf'
URL = 'https://www.hueber.de/media/36/Momente_A1_1_KB_Transkriptionen.pdf'


def main():
    catalog = json.loads((GEN / 'interactive-book.json').read_text(encoding='utf8'))
    kb, current = {}, None
    for page_number, page in enumerate(pymupdf.open(KB), 1):
        if page_number > 5:
            break
        for block in page.get_text('blocks'):
            if not 90 < block[1] < 800:
                continue
            for raw in block[4].splitlines():
                text = re.sub(r'\s+', ' ', raw).strip().replace('β', 'ß')
                if not text:
                    continue
                if re.fullmatch(r'1/\d{2}', text):
                    current = kb.setdefault(text, {'lines': [], 'sourcePages': []})
                    continue
                if re.match(r'^(Lektion |Aufgabe |Modul )', text) or current is None:
                    continue
                if page_number not in current['sourcePages']:
                    current['sourcePages'].append(page_number)
                speaker = re.match(r'^([\wÄÖÜäöüß .-]{1,35}):\s*(.*)$', text)
                cue = bool(re.fullmatch(r'[a-dA-D1-6]', text) or text.startswith('Gespräch'))
                lines = current['lines']
                if speaker:
                    lines.append({'speaker': speaker[1], 'text': speaker[2]})
                elif cue or not lines:
                    lines.append({'speaker': None, 'text': text})
                else:
                    lines[-1]['text'] += ' ' + text

    # This existing projection was checked visually against source pp. 1–2.
    old = json.loads((GEN / 'audio/workbook-transcripts-lessons-01-02.json').read_text(encoding='utf8'))
    ab = {t['trackId']: {'lines': t['lines'], 'sourcePages': [t['sourcePage']]} for t in old['tracks']}
    manual = json.loads((ROOT / 'research/book-reader-update/ab-lesson3-4-transcripts.json').read_text(encoding='utf8'))
    ab.update(manual)
    tracks, legacy = {}, {}
    for audio in catalog['audio']:
        number = int(re.match(r'1_(\d+)', Path(audio['source']).name)[1])
        source_number = number + (1 if audio['kind'] == 'workbook' and audio['lesson'] == 4 else 0)
        source_id = f'1/{source_number:02}' if audio['kind'] == 'coursebook' else f'1_{source_number:02}'
        transcript = (kb if audio['kind'] == 'coursebook' else ab)[source_id]
        assert transcript['lines'], audio['id']
        item = {**transcript, 'sourceTrack': source_id, 'credit': 'Momente A1.1 · © Hueber Verlag', 'sourceTitle': 'Kursbuch Transkriptionen' if audio['kind'] == 'coursebook' else 'Arbeitsbuch Transkriptionen'}
        tracks[audio['id']] = item
        if audio['kind'] == 'workbook':
            legacy[f'1_{number:02}'] = item
    output = {'tracks': tracks, 'workbook': legacy}
    (GEN / 'audio/listening-transcripts.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    audit = {'tracks': len(tracks), 'workbookTracks': len(legacy), 'coursebookSourceUrl': URL, 'sources': [{'file': str(p.relative_to(ROOT)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [KB, AB]], 'mappingNote': 'AB Lesson 4 source transcript numbers are one greater than the supplied audio filenames; exercise and subpart were checked visually.'}
    (ROOT / 'research/book-reader-update/transcript-source-audit.json').write_text(json.dumps(audit, indent=2)+'\n', encoding='utf8')
    print(json.dumps(audit))


if __name__ == '__main__':
    main()
