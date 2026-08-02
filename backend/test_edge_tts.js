import { EdgeTTS } from 'node-edge-tts';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function test() {
  const tts = new EdgeTTS({ voice: 'en-IN-PrabhatNeural', pitch: '-10%', rate: '-5%' });
  const tempFilePath = path.join(os.tmpdir(), 'test_tts.mp3');
  console.log('Starting TTS generation to:', tempFilePath);
  try {
    await tts.ttsPromise('Hello world, testing Nyaya AI.', tempFilePath);
    console.log('Success! File size:', fs.statSync(tempFilePath).size);
    fs.unlinkSync(tempFilePath);
  } catch (e) {
    console.error('TTS Generation FAILED:', e);
  }
}
test();
