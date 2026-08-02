import { EdgeTTS } from 'node-edge-tts';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function test() {
  const tts = new EdgeTTS({ voice: 'en-US-GuyNeural', pitch: '-10%', rate: '-5%' });
  const tempFilePath = path.join(os.tmpdir(), 'test_tts_guy.mp3');
  console.log('Starting Global Voice TTS generation...');
  try {
    await tts.ttsPromise('Hello world, testing generic voice.', tempFilePath);
    console.log('Success! File size:', fs.statSync(tempFilePath).size);
    fs.unlinkSync(tempFilePath);
  } catch (e) {
    console.error('Global TTS FAILED:', e);
  }
}
test();
