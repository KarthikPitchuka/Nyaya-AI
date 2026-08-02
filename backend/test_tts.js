import { EdgeTTS } from 'node-edge-tts';
import path from 'path';
import os from 'os';

async function test() {
    try {
        const tts = new EdgeTTS({ voice: 'en-IN-PrabhatNeural' });
        const tmpPath = path.join(os.tmpdir(), 'test_tts.mp3');
        console.log('Starting TTS...');
        await tts.ttsPromise('Hello world', tmpPath);
        console.log('Success! Saved to', tmpPath);
    } catch (err) {
        console.error('TTS Failed:', err);
    }
}

test();
