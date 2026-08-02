import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

/**
 * AI Service for Legal Understanding
 */
export const analyzeLegalCase = async (userInput, locationStr, files = []) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
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

    const maxRetries = 5;
    const baseDelayMs = 1000; // base backoff
    const maxDelayMs = 30000; // cap

    const getRetryDelayMs = (err, attempt) => {
      // Prefer server-sent retry info when available
      try {
        if (err && Array.isArray(err.details)) {
          for (const d of err.details) {
            if (d && d.retryDelay) {
              // retryDelay may be like "37s" or an ISO duration
              const m = String(d.retryDelay).match(/(\d+)(?:\.\d+)?s/);
              if (m) return parseInt(m[1], 10) * 1000;
            }
            if (d && d['@type'] && d['@type'].includes('RetryInfo') && d.retryDelay) {
              const m = String(d.retryDelay).match(/(\d+)(?:\.\d+)?s/);
              if (m) return parseInt(m[1], 10) * 1000;
            }
          }
        }
      } catch (e) { /* ignore parse errors */ }

      // Exponential backoff with jitter
      const exp = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = Math.floor(Math.random() * 1000);
      return exp + jitter;
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

        // SDK returns raw JSON; text is at candidates[0].content.parts[0].text
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
        const isRetryable = error && (error.status === 429 || error.status === 503 ||
          (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('demand'))));

        if (isRetryable && attempt < maxRetries) {
          const delayMs = getRetryDelayMs(error, attempt);
          console.log(`Gemini API busy (Status ${error.status || 'unknown'}). Retrying in ${delayMs}ms... attempt ${attempt}/${maxRetries}`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        // If we've exhausted retries for rate limit, provide a clearer error
        if (isRetryable) {
          console.error('Gemini requests exhausted after retries:', error);
          const err = new Error('RATE_LIMIT');
          err.original = error;
          throw err;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("AI Analysis Error:", error);
    if (error.message === 'RATE_LIMIT' || error.status === 429 || (error.message && error.message.includes('429'))) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error("Failed to analyze case: " + (error.message || "Unknown error"));
  }
};

export const transcribeAudio = async (filePath, mimetype) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const uploadResult = await ai.files.upload({ file: filePath, mimeType: mimetype });

    let file = await ai.files.get({ name: uploadResult.file.name });
    let attempts = 0;
    while (file.state === 'PROCESSING' && attempts < 10) {
      await new Promise(r => setTimeout(r, 2000));
      file = await ai.files.get({ name: uploadResult.file.name });
      attempts++;
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
    console.error("Audio Transcription Error:", error);
    throw new Error("Failed to transcribe audio: " + (error.message || "Unknown error"));
  }
};
