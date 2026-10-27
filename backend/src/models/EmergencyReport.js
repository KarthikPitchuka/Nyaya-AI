import mongoose from 'mongoose';

const emergencyReportSchema = new mongoose.Schema({
    userUid: { type: String, index: true },
    userPhone: { type: String, default: '' },
    attackerPhone: { type: String, required: true },
    userLocation: { type: String, default: '' },
    locationCoordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracy: { type: Number }
    },
    status: {
        type: String,
        enum: ['Pending Review', 'Under Review', 'Resolved'],
        default: 'Pending Review'
    },
    department: { type: String, default: 'Cyber Crime Tracking Unit' },
    audioUrl: { type: String, default: null },
    actionTaken: { type: String, default: null },
    trackingId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

const EmergencyReport = mongoose.model('EmergencyReport', emergencyReportSchema);
export default EmergencyReport;
