import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
  const response = await ai.models.list();
  // Depending on the SDK version, response might be a paginated list or just an array
  const models = response.models || response;
  if (Array.isArray(models)) {
    models.forEach(m => console.log(m.name));
  } else {
    console.log(JSON.stringify(response, null, 2));
  }
} catch (e) {
  console.error(e);
}
