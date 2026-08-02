import { EdgeTTS } from 'node-edge-tts';
async function test() {
  const tts = new EdgeTTS();
  const voices = await tts.getVoices();
  console.log('Available Voices:', voices.length);
  // Show a few Indian voices
  const inVoices = voices.filter(v => v.Name.includes('-IN-'));
  console.log('Indian Voices:', JSON.stringify(inVoices.slice(0, 5), null, 2));
}
test();
