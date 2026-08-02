import express from 'express';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const router = express.Router();

// Auto-detect script and assign the best high-quality Microsoft Edge Neural Male Voice
const detectLanguageVoice = (text) => {
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN-MohanNeural';       // Telugu male
    if (/[\u0900-\u097F]/.test(text)) {
        // Distinguish Hindi and Marathi (both use Devanagari) - Default to Hindi for now
        // But if we could detect Marathi specific words we would use mr-IN-ManoharNeural
        return 'hi-IN-MadhurNeural';                                     // Hindi male
    }
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN-ValluvarNeural';     // Tamil male
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN-GaganNeural';       // Kannada male
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN-MidhunNeural';      // Malayalam male
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN-BashkarNeural';     // Bengali male
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN-NiranjanNeural';    // Gujarati male
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN-AitbaarNeural';     // Punjabi male
    return 'en-IN-PrabhatNeural';                                       // Indian English male
};

// POST /api/tts — Convert text to speech using Edge TTS
router.post('/', async (req, res) => {
    let tempFilePath = null;
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Text is required' });
        }

        const voiceName = detectLanguageVoice(text);

        // Setup temporary file path
        const tmpDir = os.tmpdir();
        const fileName = `tts_${crypto.randomUUID()}.mp3`;
        tempFilePath = path.join(tmpDir, fileName);

        // Generate high quality TTS using Edge TTS
        const tts = new EdgeTTS({ voice: voiceName, pitch: '-10%', rate: '-5%' });
        await tts.ttsPromise(text, tempFilePath);

        // Read the generated file and send base64 to frontend
        const audioBuffer = fs.readFileSync(tempFilePath);
        const audioBase64 = audioBuffer.toString('base64');

        res.json({ success: true, audio: audioBase64, voice: voiceName });

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({
            success: false,
            message: 'Text-to-speech service unavailable',
            fallback: true
        });
    } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.error('Failed to delete temp TTS file:', e);
            }
        }
    }
});

export default router;
