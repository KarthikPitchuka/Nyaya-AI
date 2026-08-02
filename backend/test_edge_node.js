import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';

async function test() {
    try {
        console.log('Testing Edge TTS...');
        const tts = new EdgeTTS({ voice: 'en-IN-PrabhatNeural' });
        const filePath = path.join(process.cwd(), 'test_edge_out.mp3');
        await tts.ttsPromise('Hello, this is a test of Edge TTS.', filePath);
        console.log('TTS successful, file created:', filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Test file cleaned up.');
        }
    } catch (error) {
        console.error('Edge TTS Test Failed:', error);
    }
}

test();
