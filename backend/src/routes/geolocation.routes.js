import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/**
 * POST /api/geolocation
 * Uses Google Geolocation API for server-side location detection.
 * Also queries multiple IP geolocation sources and returns the best result.
 */
router.post('/', async (req, res) => {
    try {
        const results = [];

        // Strategy 1: Google Geolocation API (WiFi/cell tower based)
        if (process.env.GOOGLE_GEOLOCATION_API_KEY) {
            try {
                const googleRes = await axios.post(
                    `https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.GOOGLE_GEOLOCATION_API_KEY}`,
                    { considerIp: true },
                    { timeout: 5000 }
                );
                if (googleRes.data?.location) {
                    const { lat, lng } = googleRes.data.location;
                    const accuracy = googleRes.data.accuracy || 99999;
                    const nominatim = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                        { headers: { 'User-Agent': 'NyayaAI/1.0' }, timeout: 5000 }
                    );
                    if (nominatim.data?.address) {
                        const addr = nominatim.data.address;
                        const parts = [
                            addr.village || addr.hamlet || addr.town || addr.suburb || '',
                            addr.city || addr.county || addr.state_district || '',
                            addr.state || '',
                            addr.postcode || ''
                        ].filter(Boolean);
                        results.push({
                            source: 'google',
                            location: [...new Set(parts)].join(', '),
                            lat, lng, accuracy
                        });
                    }
                }
            } catch (e) {
                console.log('Google Geolocation API not available:', e.response?.data?.error?.message || e.message);
            }
        }

        // Strategy 2: ip-api.com (free, good for India)
        try {
            const ipApiRes = await axios.get('http://ip-api.com/json/?fields=city,regionName,zip,lat,lon', { timeout: 5000 });
            if (ipApiRes.data?.city) {
                results.push({
                    source: 'ip-api',
                    location: [ipApiRes.data.city, ipApiRes.data.regionName, ipApiRes.data.zip].filter(Boolean).join(', '),
                    lat: ipApiRes.data.lat,
                    lng: ipApiRes.data.lon,
                    accuracy: 50000
                });
            }
        } catch (e) {
            console.log('ip-api.com failed:', e.message);
        }

        // Strategy 3: ipapi.co
        try {
            const ipapiRes = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
            if (ipapiRes.data?.city) {
                results.push({
                    source: 'ipapi.co',
                    location: [ipapiRes.data.city, ipapiRes.data.region, ipapiRes.data.postal].filter(Boolean).join(', '),
                    lat: ipapiRes.data.latitude,
                    lng: ipapiRes.data.longitude,
                    accuracy: 50000
                });
            }
        } catch (e) {
            console.log('ipapi.co failed:', e.message);
        }

        // Strategy 4: ipwhois.app (no key needed, often different database)
        try {
            const whoisRes = await axios.get('https://ipwhois.app/json/?objects=city,region,postal,latitude,longitude', { timeout: 5000 });
            if (whoisRes.data?.city) {
                results.push({
                    source: 'ipwhois',
                    location: [whoisRes.data.city, whoisRes.data.region, whoisRes.data.postal].filter(Boolean).join(', '),
                    lat: whoisRes.data.latitude,
                    lng: whoisRes.data.longitude,
                    accuracy: 50000
                });
            }
        } catch (e) {
            console.log('ipwhois.app failed:', e.message);
        }

        // Pick the best result: prefer Google (lowest accuracy number = most accurate), then others
        results.sort((a, b) => a.accuracy - b.accuracy);

        console.log('📍 Geolocation results from all sources:', results.map(r => `${r.source}: ${r.location} (${r.accuracy}m)`));

        res.json({
            success: true,
            results,
            best: results[0] || null
        });
    } catch (error) {
        console.error('Geolocation endpoint error:', error);
        res.status(500).json({ success: false, message: 'Location detection failed' });
    }
});

export default router;
