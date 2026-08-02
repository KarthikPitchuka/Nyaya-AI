import { EdgeTTS } from 'node-edge-tts';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function test() {
  const tts = new EdgeTTS({ voice: 'te-IN-MohanNeural', pitch: '-10%', rate: '-5%' });
  const tempFilePath = path.join(os.tmpdir(), 'test_tts_te.mp3');
  console.log('Starting Telugu TTS generation...');
  try {
    await tts.ttsPromise('మీకు ఏ చట్టపరమైన సమస్య ఉంది?', tempFilePath);
    console.log('Success! File size:', fs.statSync(tempFilePath).size);
    fs.unlinkSync(tempFilePath);
  } catch (e) {
    console.error('Telugu TTS FAILED:', e);
  }
}
test();
