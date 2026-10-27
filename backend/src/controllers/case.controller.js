import { unlink } from 'node:fs/promises';
import * as aiService from '../services/ai.service.js';
import { getLawyersForCase } from '../services/lawyer.service.js';
import { getNearbyPoliceStations } from '../services/police.service.js';
import Case from '../models/Case.js';
import { parseLocationCoordinates } from '../utils/locationCoordinates.js';

export const analyzeCase = async (req, res) => {
    try {
        const { prompt, location, userPhone } = req.body;
        const files = req.files || [];

        if (prompt !== undefined && (typeof prompt !== 'string' || prompt.length > 10000)) {
            return res.status(400).json({ success: false, message: 'Case description must be text no longer than 10000 characters.' });
        }
        if (location !== undefined && (typeof location !== 'string' || location.length > 500)) {
            return res.status(400).json({ success: false, message: 'Location must be text no longer than 500 characters.' });
        }
        const locationCoordinates = parseLocationCoordinates(req.body);
        if (locationCoordinates === false) {
            return res.status(400).json({ success: false, message: 'Location coordinates are invalid.' });
        }

        const casePrompt = prompt?.trim() || 'Please review the attached documents.';
        if (!prompt?.trim() && files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide a case description or upload evidence.' });
        }

        // Pass through AI Engine (Levels 1, 2, and 3) — language is auto-detected
        const analysis = await aiService.analyzeLegalCase(casePrompt, location, files);

        // Generate evidence URLs
        const evidenceUrls = files.map(f => `/uploads/${f.filename}`);

        // Save history (Level 5 prep)
        const newCase = new Case({
            userPhone: userPhone || null,
            userPrompt: casePrompt,
            location: location || null,
            locationCoordinates,
            language: analysis.detected_language || 'en',
            translatedText: analysis.translated_text || casePrompt,
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

        await newCase.save();

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
        console.error("Analyze case error:", error.code || 'AI_ANALYSIS_FAILED', error.message);
        if (error.code?.startsWith('AI_')) {
            return res.status(error.status || 502).json({
                success: false,
                code: error.code,
                message: error.message
            });
        }
        res.status(500).json({ success: false, message: 'AI Engine failed processing request.' });
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
        console.error('Transcription error:', error.code || 'AI_TRANSCRIPTION_FAILED', error.message);
        res.status(error.status || 502).json({
            success: false,
            code: error.code || 'AI_TRANSCRIPTION_FAILED',
            message: error.status && error.message
                ? error.message
                : 'Voice transcription failed. Check the backend logs and try again.'
        });
    } finally {
        if (req.file?.path) {
            try {
                await unlink(req.file.path);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Failed to remove temporary transcription audio:', error);
                }
            }
        }
    }
};
