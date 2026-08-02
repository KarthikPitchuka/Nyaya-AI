import express from 'express';
import { submitReport, getReportStatus, simulateTimeLapse, submitEmergencyReport, getEmergencyReports, updateEmergencyReportStatus } from '../controllers/report.controller.js';
import upload from '../config/multer.js';

const router = express.Router();

router.post('/', upload.array('evidence', 5), submitReport);

// Emergency Report Endpoint (Accepts single audio file)
router.post('/emergency', upload.single('audio'), submitEmergencyReport);

// Cyber Portal Endpoints
router.get('/emergency', getEmergencyReports);
router.put('/emergency/:id/status', updateEmergencyReportStatus);

router.get('/case/:caseId', getReportStatus);
router.post('/:trackingId/escalate', simulateTimeLapse); // For demo purposes

export default router;
