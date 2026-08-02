import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

/**
 * Multi-Key Rotation Pool to handle rate limits (429) & key expiration
 */
export const getApiKeys = () => {
  const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(k => k && k !== 'your_gemini_api_key_here');
  return keys;
};

let currentKeyIndex = 0;

export const getActiveApiKey = () => {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEY is missing in the .env file.");
  }
  return keys[currentKeyIndex % keys.length];
};

export const rotateApiKey = () => {
  const keys = getApiKeys();
  if (keys.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    console.log(`🔄 Rotated Gemini API key to key index ${currentKeyIndex + 1}/${keys.length}`);
  }
};

/**
 * AI Service for Legal Understanding
 */
export const analyzeLegalCase = async (userInput, locationStr, files = []) => {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is missing in the .env file.");
  }

  const prompt = `
    You are an expert AI Legal Assistant specializing in Indian Law.
    Analyze the following user problem representing a potential legal issue.

    CRITICAL LANGUAGE RULE:
    - The user's input may come via voice-to-text and could be in ROMANIZED/TRANSLITERATED form (e.g., "naa peru yusuf" is Telugu, "mujhe problem hai" is Hindi, "enakku oru problem" is Tamil).
    - You MUST detect the ACTUAL language the user is speaking, even if it is written in English/Latin script (romanized).
    - Once you detect the language, you MUST respond with ALL text fields in the NATIVE SCRIPT of that language.

    User Input: "${userInput}"
    Location: "${locationStr || 'Unknown'}"

    Respond ONLY with a raw JSON object:
    {
      "detected_language": "Telugu",
      "translated_text": "...",
      "case_type": "...",
      "case_title": "...",
      "legal_domain": "...",
      "complexity_score": 45,
      "complexity_level": "Medium",
      "recommended_solution": "...",
      "next_steps": ["..."],
      "user_rights": ["Section X of Act — ..."],
      "user_mistakes": ["Section X of Act — ..."],
      "target_department": "...",
      "target_supervisor": "...",
      "department_url": "https://example.gov.in"
    }
  `;

  const maxRetries = Math.max(5, apiKeys.length * 2);
  const baseDelayMs = 1000;
  const maxDelayMs = 15000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const activeKey = getActiveApiKey();
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const contentsObj = [];

      if (files && files.length > 0 && attempt === 1) {
        for (const file of files) {
          try {
            const uploadResult = await ai.files.upload({ file: file.path, mimeType: file.mimetype });
            contentsObj.push({
              fileData: { fileUri: uploadResult.file.uri, mimeType: file.mimetype }
            });
          } catch (uErr) { console.error("Upload error:", uErr); }
        }
      }

      contentsObj.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contentsObj,
      });

      let textResponse = '';
      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        textResponse = response.candidates[0].content.parts[0].text;
      } else if (typeof response.text === 'function') {
        textResponse = response.text();
      } else if (response.text) {
        textResponse = response.text;
      }

      let cleanJson = textResponse;
      const startIndex = cleanJson.indexOf('{');
      const endIndex = cleanJson.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1) {
        cleanJson = cleanJson.slice(startIndex, endIndex + 1);
      }

      if (!cleanJson || cleanJson.trim() === '') {
        throw new Error("Empty AI response");
      }

      return JSON.parse(cleanJson);

    } catch (error) {
      const isQuotaOrRateLimit = error && (
        error.status === 429 || 
        error.status === 403 || 
        error.status === 401 ||
        error.status === 503 ||
        (error.message && (
          error.message.includes('429') || 
          error.message.includes('403') ||
          error.message.includes('401') ||
          error.message.includes('API key') ||
          error.message.includes('quota') ||
          error.message.includes('demand') ||
          error.message.includes('RESOURCE_EXHAUSTED')
        ))
      );

      if (isQuotaOrRateLimit) {
        rotateApiKey(); // Switch to next key in pool
      }

      if (attempt < maxRetries) {
        const delayMs = Math.min(baseDelayMs * Math.pow(1.5, attempt - 1), maxDelayMs);
        console.log(`⚠️ Gemini API retry (${attempt}/${maxRetries}): Retrying with rotated key in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      console.error('All Gemini API requests exhausted after key rotation retries:', error);
      const err = new Error('RATE_LIMIT');
      err.original = error;
      throw err;
    }
  }
};

export const transcribeAudio = async (filePath, mimetype) => {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is missing in the .env file.");
  }

  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    try {
      const activeKey = getActiveApiKey();
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const uploadResult = await ai.files.upload({ file: filePath, mimeType: mimetype });

      let file = await ai.files.get({ name: uploadResult.file.name });
      let waitAttempts = 0;
      while (file.state === 'PROCESSING' && waitAttempts < 10) {
        await new Promise(r => setTimeout(r, 2000));
        file = await ai.files.get({ name: uploadResult.file.name });
        waitAttempts++;
      }

      const prompt = "Please transcribe this audio exactly as spoken. Respond with ONLY the transcript text.";
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ fileData: { fileUri: uploadResult.file.uri, mimeType: mimetype } }, { text: prompt }],
      });

      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        return response.candidates[0].content.parts[0].text;
      } else if (typeof response.text === 'function') {
        return response.text();
      }
      return response.text || '';
    } catch (error) {
      console.error("Audio Transcription error:", error);
      rotateApiKey();
    }
  }
  throw new Error("Failed to transcribe audio after key rotation.");
};

