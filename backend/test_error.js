import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

(async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'generate a lot of text to hit rate limit quickly,'.repeat(50),
        });
        console.log("Worked");
    } catch (e) {
        console.log("ERROR KEYS:", Object.keys(e));
        console.log("ERROR STATUS:", e.status);
        console.log("ERROR MESSAGE:", e.message);
    }
})();
