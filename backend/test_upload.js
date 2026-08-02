import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

(async () => {
   try {
       const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
       const uploadResult = await ai.files.upload({ file: 'package.json', mimeType: 'application/json' });
       console.log("Upload result:", JSON.stringify(uploadResult, null, 2));
   } catch(e) {
       console.log("Upload Error:", e.message);
   }
})();
