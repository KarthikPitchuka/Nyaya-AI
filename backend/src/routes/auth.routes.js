import express from 'express';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import CyberUser from '../models/CyberUser.js';
import { encryptText, decryptText } from '../utils/cryptoUtil.js';

const router = express.Router();

// In-memory OTP store (phone → { otp, expiresAt })
const otpStore = new Map();

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP for the given phone number.
 * In production, integrate Twilio / MSG91 / Fast2SMS to send real SMS.
 */
router.post('/send-otp', (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ success: false, message: 'Valid phone number is required.' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        otpStore.set(phone.replace(/\D/g, ''), { otp, expiresAt });

        // In production: send SMS here via Twilio/MSG91
        // For now, log to console (simulated SMS)
        console.log(`\n📱 ========== OTP FOR ${phone} ==========`);
        console.log(`📱 OTP: ${otp}`);
        console.log(`📱 Expires in 5 minutes`);
        console.log(`📱 =====================================\n`);

        res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
});

/**
 * POST /api/auth/verify-otp
 * Verifies the OTP and returns the authenticated phone number.
 */
router.post('/verify-otp', (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const stored = otpStore.get(cleanPhone);

        if (!stored) {
            return res.status(400).json({ success: false, message: 'No OTP found for this number. Please request a new one.' });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(cleanPhone);
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (stored.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

        // OTP verified — clean up
        otpStore.delete(cleanPhone);

        // Generate a simple session token
        const token = crypto.randomBytes(32).toString('hex');

        console.log(`✅ Phone ${phone} verified successfully.`);

        res.json({
            success: true,
            message: 'Phone verified successfully.',
            data: { phone: cleanPhone, token }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
    }
});

export default router;

// --- TOTP endpoints ---

/**
 * POST /api/auth/totp/setup
 * Body: { email }
 * Generates a TOTP secret and returns an `otpauth_url` and `qr` data URL for the user to scan.
 */
router.post('/totp/setup', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'email required' });

        const user = await CyberUser.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const secret = speakeasy.generateSecret({ length: 20, name: `Nyaya-AI (${email})` });

        // Don't enable until user verifies code
        const enc = encryptText(secret.base32);

        // Temporarily store secret in DB (not enabled) so we can verify
        user.totpSecret = enc;
        user.totpEnabled = false;
        await user.save();

        const otpauth = secret.otpauth_url;
        const qrData = await qrcode.toDataURL(otpauth);

        res.json({ success: true, data: { otpauth_url: otpauth, qr: qrData } });
    } catch (err) {
        console.error('TOTP setup error', err);
        res.status(500).json({ success: false, message: 'Failed to generate TOTP setup.' });
    }
});

/**
 * POST /api/auth/totp/verify
 * Body: { email, token }
 * Verifies a TOTP token. If user is in setup flow, enables TOTP.
 */
router.post('/totp/verify', async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) return res.status(400).json({ success: false, message: 'email and token required' });

        const user = await CyberUser.findOne({ email }).select('+totpSecret');
        if (!user || !user.totpSecret) return res.status(404).json({ success: false, message: 'TOTP not setup for this user' });

        const secret = decryptText(user.totpSecret);
        if (!secret) return res.status(500).json({ success: false, message: 'Failed to read TOTP secret' });

        const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
        if (!verified) return res.status(400).json({ success: false, message: 'Invalid token' });

        // If not enabled yet, enable it now
        if (!user.totpEnabled) {
            user.totpEnabled = true;
            await user.save();
        }

        // Successful verification — issue session token for login flows
        const sessToken = crypto.randomBytes(32).toString('hex');

        res.json({ success: true, message: 'TOTP verified', data: { token: sessToken } });
    } catch (err) {
        console.error('TOTP verify error', err);
        res.status(500).json({ success: false, message: 'Failed to verify TOTP' });
    }
});
