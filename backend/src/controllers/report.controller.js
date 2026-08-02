import Report from '../models/Report.js';
import Case from '../models/Case.js';
import EmergencyReport from '../models/EmergencyReport.js';
import crypto from 'crypto';

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
        const { attackerPhone, userPhone, userLocation } = req.body;

        // Extract uploaded audio file if any
        const audioUrl = req.file ? `/uploads/${req.file.filename}` : null;

        if (!attackerPhone) {
            return res.status(400).json({ success: false, message: 'Phone number is required for emergency tracking.' });
        }

        const uniqueString = crypto.randomBytes(4).toString('hex').toUpperCase();
        const trackingId = `CYBER-EMG-${uniqueString}`;

        const newEmergency = new EmergencyReport({
            attackerPhone,
            userPhone: userPhone || '',
            userLocation: userLocation || '',
            audioUrl,
            trackingId
        });
        await newEmergency.save();

        console.log(`\n🚨 ========== EMERGENCY CYBER REPORT ==========`);
        console.log(`🚨 Tracking ID: ${trackingId}`);
        console.log(`🚨 Victim Phone: ${userPhone || 'N/A'}`);
        console.log(`🚨 Attacker Phone: ${attackerPhone}`);
        console.log(`🚨 Victim Location: ${userLocation || 'N/A'}`);
        if (audioUrl) console.log(`🚨 Audio Evidence Attached`);
        console.log(`🚨 =============================================\n`);

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

// Update an emergency report (Add action taken & change status)
export const updateEmergencyReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, actionTaken } = req.body;

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
