import express from 'express';
import { submitReport, getReportStatus, simulateTimeLapse, submitEmergencyReport, getEmergencyReports, getMyEmergencyReports, updateEmergencyReportStatus } from '../controllers/report.controller.js';
import upload from '../config/multer.js';
import { requireCyberAuth } from '../middleware/cyberAuth.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';

const router = express.Router();

router.post('/', upload.array('evidence', 5), submitReport);

// Emergency Report Endpoint (Accepts single audio file)
router.post('/emergency', requireFirebaseAuth, upload.single('audio'), submitEmergencyReport);

router.get('/emergency/mine', requireFirebaseAuth, getMyEmergencyReports);
router.get('/emergency', requireCyberAuth, getEmergencyReports);
router.put('/emergency/:id/status', requireCyberAuth, updateEmergencyReportStatus);

router.get('/case/:caseId', getReportStatus);
router.post('/:trackingId/escalate', requireCyberAuth, simulateTimeLapse);

export default router;
