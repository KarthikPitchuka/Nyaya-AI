import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema({
    userPhone: { type: String }, // Links case to the logged-in user
    userPrompt: { type: String, required: true },
    location: { type: String }, // Stores physical address during analysis
    language: { type: String, default: 'en' },
    translatedText: { type: String },
    caseType: { type: String, required: true },
    caseTitle: { type: String },
    legalDomain: { type: String },
    complexityScore: { type: Number, required: true },
    complexityLevel: { type: String, enum: ['Simple', 'Medium', 'Complex'], required: true },
    recommendedSolution: { type: String },
    userRights: [{ type: String }],
    userMistakes: [{ type: String }],
    targetDepartment: { type: String },
    targetSupervisor: { type: String },
    departmentUrl: { type: String },
    evidenceUrls: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Case', CaseSchema);
