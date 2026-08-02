import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import CyberUser from '../models/CyberUser.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cyber_portal';

// Register a new official
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const existingUser = await CyberUser.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new CyberUser({ email, password: hashedPassword, name, role: role || 'Agent' });
        await newUser.save();

        res.status(201).json({ success: true, message: 'Official registered successfully.' });
    } catch (error) {
        console.error("Cyber auth register error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Login for official
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await CyberUser.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 30 days token expiration
        const token = jwt.encode({ 
            id: user._id, 
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) 
        }, JWT_SECRET);

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
