import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import crypto from 'crypto';
import CyberUser from '../models/CyberUser.js';
import { getCyberJwtSecret } from '../middleware/cyberAuth.js';

const router = express.Router();

const normalizeEmail = (email) => email.trim().toLowerCase();

const isValidRegistrationCode = (input, configured) => {
    if (typeof input !== 'string' || !configured) return false;
    const inputHash = crypto.createHash('sha256').update(input).digest();
    const configuredHash = crypto.createHash('sha256').update(configured).digest();
    return crypto.timingSafeEqual(inputHash, configuredHash);
};

// Register a new official
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, registrationCode } = req.body;

        if (
            typeof email !== 'string' ||
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== 'string' ||
            Buffer.byteLength(password) < 12 ||
            Buffer.byteLength(password) > 72 ||
            typeof name !== 'string' ||
            !name.trim() ||
            name.trim().length > 100
        ) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const allowedEmails = (process.env.CYBER_ALLOWED_EMAILS || '')
            .split(',')
            .map((value) => normalizeEmail(value.trim()))
            .filter(Boolean);
        const configuredCode = process.env.CYBER_REGISTRATION_CODE;
        if (allowedEmails.length === 0 || !configuredCode) {
            return res.status(503).json({ success: false, message: 'Official registration is not configured.' });
        }
        if (!allowedEmails.includes(normalizeEmail(email)) || !isValidRegistrationCode(registrationCode, configuredCode)) {
            return res.status(403).json({ success: false, message: 'Registration is restricted to pre-authorized officials.' });
        }

        const existingUser = await CyberUser.findOne({ email: normalizeEmail(email) });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new CyberUser({
            email: normalizeEmail(email),
            password: hashedPassword,
            name: name.trim(),
            role: 'Agent'
        });
        await newUser.save();

        res.status(201).json({ success: true, message: 'Official registered successfully.' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'User already exists.' });
        }
        console.error("Cyber auth register error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Login for official
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string' || password.length > 72) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const secret = getCyberJwtSecret();
        if (!secret) {
            return res.status(503).json({ success: false, message: 'Official authentication is not configured.' });
        }

        const user = await CyberUser.findOne({ email: normalizeEmail(email) });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Official sessions are time-limited and signed with the configured secret.
        const token = jwt.encode({ 
            id: user._id.toString(),
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) 
        }, secret, 'HS256');

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Cyber auth login error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
