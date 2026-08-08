#!/usr/bin/env node
/**
 * Ensures audio/ junction exists so /audio/... MP3 paths work under serve.
 * Safe to run repeatedly; no-op if link already present.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const linkPath = path.join(root, 'audio');
const targetPath = path.join(root, 'Audio-20260730T043413Z-1-001');

if (fs.existsSync(linkPath)) {
  console.log('audio: ok (junction exists)');
  process.exit(0);
}

if (!fs.existsSync(targetPath)) {
  console.warn(
    'audio: zip folder not found ? MP3 buttons fall back to TTS.\n' +
      '  Expected: Audio-20260730T043413Z-1-001/'
  );
  process.exit(0);
}

try {
  if (process.platform === 'win32') {
    execSync(`cmd /c mklink /J "${linkPath}" "${targetPath}"`, { stdio: 'inherit' });
  } else {
    fs.symlinkSync(targetPath, linkPath, 'dir');
  }
  console.log('audio: junction created ? Audio-20260730T043413Z-1-001');
} catch (err) {
  console.warn('audio: could not create junction ?', err.message);
  console.warn('  Manual: mklink /J audio "Audio-20260730T043413Z-1-001"');
}
