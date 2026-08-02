import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function testCurrentKey() {
    try {
        console.log("Using API Key starting with:", process.env.GEMINI_API_KEY.substring(0, 10));
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
