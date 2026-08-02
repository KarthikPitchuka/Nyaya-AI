import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    department: { type: String, required: true },
    supervisor: { type: String, required: true },
    description: { type: String, required: true },
    evidenceUrls: [{ type: String }],
    status: {
        type: String,
        enum: ['Submitted to Supervisor', 'Under Review by Supervisor', 'Resolved', 'Escalated to Court'],
        default: 'Submitted to Supervisor'
    },
    trackingId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    escalatedAt: { type: Date }
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
