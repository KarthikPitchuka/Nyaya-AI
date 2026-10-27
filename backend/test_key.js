import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Read API keys from env - .env has GEMINI_API_KEYS (comma-separated)
const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const keys = keysStr.split(',').map(k => k.trim()).filter(k => k && k !== 'your_gemini_api_key_here');

async function testCurrentKey() {
    try {
        if (keys.length === 0) {
            console.error("No Gemini API keys found in GEMINI_API_KEYS environment variable.");
            console.error("Please add your Gemini API keys to the .env file as: GEMINI_API_KEYS=key1,key2,key3");
            return;
        }
        console.log(`Testing configured Gemini API key ${1}/${keys.length} without printing credential data.`);
        const ai = new GoogleGenAI({ apiKey: keys[0] });
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
            contents: ["Hello"],
        });
        console.log("SUCCESS. Key is working!");
        console.log(response.text);
    } catch (e) {
        console.error("raw error status:", e.status);
        console.error("raw error message:", e.message);
        console.error("raw error body:", e);
    }
}
testCurrentKey();