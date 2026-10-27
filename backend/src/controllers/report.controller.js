import Report from '../models/Report.js';
import Case from '../models/Case.js';
import EmergencyReport from '../models/EmergencyReport.js';
import { parseLocationCoordinates } from '../utils/locationCoordinates.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Submit a new report to a department supervisor
export const submitReport = async (req, res) => {
    try {
        const { caseId, description } = req.body;

        // Extract uploaded files if any
        const evidenceUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        if (!caseId || !description) {
            return res.status(400).json({ success: false, message: 'Please provide case ID and a description for the supervisor.' });
        }

        const linkedCase = await Case.findById(caseId);
        if (!linkedCase) {
            return res.status(404).json({ success: false, message: 'Case not found.' });
        }

        // Generate a unique tracking ID (e.g., TRF-1A2B3C)
        const prefix = linkedCase.targetDepartment ? linkedCase.targetDepartment.substring(0, 3).toUpperCase() : 'REP';
        const uniqueString = crypto.randomBytes(3).toString('hex').toUpperCase();
        const trackingId = `${prefix}-${uniqueString}`;

        const newReport = new Report({
            caseId: linkedCase._id,
            department: linkedCase.targetDepartment || 'General Administration',
            supervisor: linkedCase.targetSupervisor || 'Nodal Officer',
            description,
            evidenceUrls: evidenceUrls || [],
            trackingId
        });

        await newReport.save();

        res.status(201).json({
            success: true,
            data: newReport,
            message: `Report successfully filed with ${newReport.department} Supervisor (${newReport.supervisor}). Tracking ID: ${trackingId}`
        });

    } catch (error) {
        console.error("Submit report error:", error);
        res.status(500).json({ success: false, message: 'Failed to submit report to supervisor.' });
    }
};

// Get report status by case ID
export const getReportStatus = async (req, res) => {
    try {
        const { caseId } = req.params;

        const report = await Report.findOne({ caseId }).sort({ createdAt: -1 });

        if (!report) {
            return res.status(200).json({ success: true, data: null, message: 'No report found.' });
        }

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error("Get report status error:", error);
        res.status(500).json({ success: false, message: 'Failed to retrieve report status.' });
    }
};

// Debug / Admin endpoint to simulate supervisor ignoring the case (escalating to court)
export const simulateTimeLapse = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const report = await Report.findOne({ trackingId });

        if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

        report.status = 'Escalated to Court';
        report.escalatedAt = new Date();

        await report.save();

        res.status(200).json({
            success: true,
            data: report,
            message: `Simulated 14 days passing. Supervisor did not resolve. Case automatically escalated to Court.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to escalate report.' });
    }
}

// Submit a high-priority ongoing call to the cyber crime tracking unit
export const submitEmergencyReport = async (req, res) => {
    try {
        const { attackerPhone, userLocation } = req.body;
        const userUid = req.firebaseUser?.uid;
        const userPhone = req.firebaseUser?.phone_number?.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

        // Extract uploaded audio file if any
        const audioUrl = req.file ? `/uploads/${req.file.filename}` : null;

        if (!userUid || !userPhone || userPhone.length < 10 || userPhone.length > 15) {
            return res.status(403).json({ success: false, message: 'A verified phone number is required to submit an emergency report.' });
        }
        if (typeof attackerPhone !== 'string' || !attackerPhone.trim() || attackerPhone.length > 30) {
            return res.status(400).json({ success: false, message: 'A valid phone number is required for emergency tracking.' });
        }
        const locationCoordinates = parseLocationCoordinates(req.body);
        if (locationCoordinates === false) {
            return res.status(400).json({ success: false, message: 'Location coordinates are invalid.' });
        }

        const uniqueString = crypto.randomBytes(4).toString('hex').toUpperCase();
        const trackingId = `CYBER-EMG-${uniqueString}`;

        const newEmergency = new EmergencyReport({
            attackerPhone,
            userUid,
            userPhone,
            userLocation: userLocation || '',
            locationCoordinates,
            audioUrl,
            trackingId
        });
        await newEmergency.save();

        console.info('Emergency report created:', trackingId);

        res.status(201).json({
            success: true,
            data: newEmergency,
            message: `Emergency tracking initiated. Cyber Crime Unit is actively tracing: ${attackerPhone}`
        });
    } catch (error) {
        console.error("Emergency report error:", error);
        res.status(500).json({ success: false, message: 'Failed to initiate emergency tracking.' });
    }
};

// ================= CYBER PORTAL ENDPOINTS =================

// Get all emergency reports for the Cyber Portal Dashboard
export const getEmergencyReports = async (req, res) => {
    try {
        // Fetch all reports, newest first
        const reports = await EmergencyReport.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: reports
        });
    } catch (error) {
        console.error("Get emergency reports error:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch emergency reports.' });
    }
};

export const getMyEmergencyReports = async (req, res) => {
    try {
        const userUid = req.firebaseUser?.uid;
        const userPhone = req.firebaseUser?.phone_number?.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
        if (!userUid || !userPhone) {
            return res.status(403).json({ success: false, message: 'A verified phone number is required to view reports.' });
        }

        const reports = await EmergencyReport.find({
            $or: [
                { userUid },
                { userUid: { $exists: false }, userPhone }
            ]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        console.error('Get personal emergency reports error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your emergency reports.' });
    }
};

// Update an emergency report (Add action taken & change status)
export const updateEmergencyReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, actionTaken } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid emergency report ID.' });
        }
        if (status !== undefined && !['Pending Review', 'Under Review', 'Resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid emergency report status.' });
        }
        if (actionTaken !== undefined && (typeof actionTaken !== 'string' || actionTaken.length > 4000)) {
            return res.status(400).json({ success: false, message: 'Action taken must be text no longer than 4000 characters.' });
        }

        const report = await EmergencyReport.findById(id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Emergency report not found.' });
        }

        if (status) report.status = status;
        if (actionTaken) report.actionTaken = actionTaken;

        await report.save();

        res.status(200).json({
            success: true,
            data: report,
            message: 'Report status successfully updated.'
        });
    } catch (error) {
        console.error("Update emergency report error:", error);
        res.status(500).json({ success: false, message: 'Failed to update report status.' });
    }
};
