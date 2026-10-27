import jwt from 'jwt-simple';

export const getCyberJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    return typeof secret === 'string' &&
        Buffer.byteLength(secret) >= 32 &&
        !secret.includes('REPLACE_WITH')
        ? secret
        : null;
};

export const requireCyberAuth = (req, res, next) => {
    const secret = getCyberJwtSecret();
    if (!secret) {
        return res.status(503).json({ success: false, message: 'Official authentication is not configured.' });
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return res.status(401).json({ success: false, message: 'Official authentication is required.' });
    }

    try {
        const payload = jwt.decode(match[1], secret, false, 'HS256');
        const now = Math.floor(Date.now() / 1000);
        if (
            typeof payload.id !== 'string' ||
            typeof payload.exp !== 'number' ||
            payload.exp <= now ||
            !['Agent', 'Supervisor', 'Admin'].includes(payload.role)
        ) {
            return res.status(401).json({ success: false, message: 'The official session is invalid or expired.' });
        }

        req.cyberUser = payload;
        return next();
    } catch {
        return res.status(401).json({ success: false, message: 'The official session is invalid or expired.' });
    }
};
