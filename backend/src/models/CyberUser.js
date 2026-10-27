import mongoose from 'mongoose';

const cyberUserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['Agent', 'Supervisor', 'Admin'], default: 'Agent' },
    // TOTP fields for authenticator app
    totpEnabled: { type: Boolean, default: false },
    totpSecret: { type: String, select: false },
    createdAt: { type: Date, default: Date.now }
});

const CyberUser = mongoose.model('CyberUser', cyberUserSchema);
export default CyberUser;
