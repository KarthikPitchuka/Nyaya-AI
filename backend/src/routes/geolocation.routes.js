import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
/**
 * POST /api/geolocation/reverse
 * Reverse-geocodes verified browser coordinates. This endpoint never supplies coordinates.
 */
router.post('/reverse', async (req, res) => {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    try {
        const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { format: 'jsonv2', lat: latitude, lon: longitude, zoom: 18, addressdetails: 1 },
            headers: { 'User-Agent': 'NyayaAI/1.0 (legal-assistance-location)' },
            timeout: 6000
        });
        return res.json({ success: true, address: data?.address || {} });
    } catch (error) {
        console.error('Reverse geocoding failed:', error.message);
        return res.status(502).json({ success: false, message: 'Address lookup failed.' });
    }
});

export default router;
