/* Fallback audio map ? overridden by content/extracted/audio-map.json on load */
window.AUDIO_BASE = '../audio';

/* Dialogue / listen sections only ? NOT for individual vocab row play buttons */
window.AUDIO_MAP = {
  'l1-greetings': [
    'Audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_02_AB_Momente_A11_1_3.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_03_AB_Momente_A11_1_3.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_04_AB_Momente_A11_1_3.mp3'
  ],
  'l1-dialogue': [
    'Audio/Momente_A1_1_AB_CD1/1_05_AB_Momente_A11_1_9a.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_06_AB_Momente_A11_1_9b.mp3'
  ],
  'l2-berufe-6a': [
    'Audio/Momente_A1_1_AB_CD1/1_07_AB_Momente_A11_2_6a.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_08_AB_Momente_A11_2_6a.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_09_AB_Momente_A11_2_6a.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_10_AB_Momente_A11_2_6a.mp3'
  ],
  'l2-berufe-6b': [
    'Audio/Momente_A1_1_AB_CD1/1_11_AB_Momente_A11_2_6b.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_12_AB_Momente_A11_2_6b.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_13_AB_Momente_A11_2_6b.mp3',
    'Audio/Momente_A1_1_AB_CD1/1_14_AB_Momente_A11_2_6b.mp3'
  ],
  'l2-berufe-dialogue': 'Audio/Momente_A1_1_AB_CD1/1_15_AB_Momente_A11_2_12.mp3',
  'berufe-fokus-m1': 'Audio/Momente_A1_1_AB_CD1/1_31_AB_Momente_A11_Fokus Beruf Modul 1_2a+b.mp3',
  'berufe-fokus-m2a': 'Audio/Momente_A1_1_AB_CD1/1_61_AB_Momente_A11_Fokus Beruf Modul 2_1.mp3',
  'berufe-fokus-m2b': 'Audio/Momente_A1_1_AB_CD1/1_62_AB_Momente_A11_Fokus Beruf Modul 2_4.mp3'
};

/* Exact German string ? MP3 path (empty until per-word files exist) */
window.WORD_AUDIO = {};

window.AUDIO_STATS = { totalPackFiles: 387, wiredTracks: 18, wiredSections: 8 };
