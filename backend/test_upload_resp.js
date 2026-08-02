import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
fs.writeFileSync('dummy.txt', 'hello');
try {
  const uploadResult = await ai.files.upload({
    file: 'dummy.txt',
    mimeType: 'text/plain'
  });
  console.log('Testing ai.files.get with object:', { name: uploadResult.name });
  const file = await ai.files.get({ name: uploadResult.name });
  console.log('Success! File state:', file.state);
} catch (e) {
  console.error('ai.files.get with object FAILED:', e);
}
