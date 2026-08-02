import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function list() {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  console.log("Gemini 1.5 Flash Model exists.");
}
list();
