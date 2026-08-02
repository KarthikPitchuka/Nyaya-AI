import mongoose from 'mongoose';

const emergencyReportSchema = new mongoose.Schema({
    userPhone: { type: String, default: '' },
    attackerPhone: { type: String, required: true },
    userLocation: { type: String, default: '' },
    status: { type: String, default: 'Pending Review' },
    department: { type: String, default: 'Cyber Crime Tracking Unit' },
    audioUrl: { type: String, default: null },
    actionTaken: { type: String, default: null },
    trackingId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

const EmergencyReport = mongoose.model('EmergencyReport', emergencyReportSchema);
export default EmergencyReport;
