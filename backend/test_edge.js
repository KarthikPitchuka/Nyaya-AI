import { EdgeTTS } from 'node-edge-tts';

async function test() {
    try {
        const tts = new EdgeTTS({ voice: 'hi-IN-MadhurNeural' });
        await tts.ttsPromise('नमस्ते', 'test_edge_out.mp3');
        console.log('Success, buffer length generated');
    } catch (e) {
        console.error(e);
    }
}
test();
