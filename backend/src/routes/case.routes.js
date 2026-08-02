import express from 'express';
import { analyzeCase, transcribe } from '../controllers/case.controller.js';
import upload from '../config/multer.js';

const router = express.Router();

router.post('/analyze', upload.array('files', 5), analyzeCase);
router.post('/transcribe', upload.single('audio'), transcribe);

export default router;
