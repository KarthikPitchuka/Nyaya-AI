import * as aiService from '../services/ai.service.js';
import { getLawyersForCase } from '../services/lawyer.service.js';
import { getNearbyPoliceStations } from '../services/police.service.js';
import Case from '../models/Case.js';

export const analyzeCase = async (req, res) => {
    try {
        const { prompt, location, userPhone } = req.body;
        const files = req.files || [];

        if (!prompt && files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide a case description or upload evidence.' });
        }

        // Pass through AI Engine (Levels 1, 2, and 3) — language is auto-detected
        const analysis = await aiService.analyzeLegalCase(prompt || "Please review the attached documents.", location, files);

        // Generate evidence URLs
        const evidenceUrls = files.map(f => `/uploads/${f.filename}`);

        // Save history (Level 5 prep)
        const newCase = new Case({
            userPhone: userPhone || null,
            userPrompt: prompt,
            location: location || null,
            language: analysis.detected_language || 'en',
            translatedText: analysis.translated_text || prompt,
            caseType: analysis.case_type,
            caseTitle: analysis.case_title,
            legalDomain: analysis.legal_domain,
            complexityScore: analysis.complexity_score,
            complexityLevel: analysis.complexity_level,
            recommendedSolution: analysis.recommended_solution,
            nextSteps: analysis.next_steps || [],
            userRights: analysis.user_rights || [],
            userMistakes: analysis.user_mistakes || [],
            targetDepartment: analysis.target_department,
            targetSupervisor: analysis.target_supervisor,
            departmentUrl: analysis.department_url,
            evidenceUrls: evidenceUrls
        });

        // We don't block response waiting for DB save
        newCase.save().catch(err => console.error("Error saving case context:", err));

        // Get matching lawyers based on the AI's case classification
        const recommendedLawyers = getLawyersForCase(analysis.case_type);

        // Get nearby police stations based on user's location and case type
        const policeStations = getNearbyPoliceStations(location, analysis.case_type);

        res.status(200).json({
            success: true,
            data: {
                ...analysis,
                lawyers: recommendedLawyers,
                police_stations: policeStations
            },
            caseId: newCase._id
        });
    } catch (error) {
        console.error("Analyze case error:", error.message);
        if (error.message === 'RATE_LIMIT') {
            return res.status(429).json({ success: false, message: 'AI Engine rate limit exceeded. Please wait 1-2 minutes before trying again.' });
        }
        res.status(500).json({ success: false, message: error.message || 'AI Engine failed processing request.' });
    }
};

export const transcribe = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No audio file uploaded' });
        }

        console.log("Transcribing audio file:", req.file.path);
        const transcript = await aiService.transcribeAudio(req.file.path, req.file.mimetype);

        res.status(200).json({
            success: true,
            transcript: transcript
        });
    } catch (error) {
        console.error("Transcription error:", error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to transcribe audio' });
    }
};
