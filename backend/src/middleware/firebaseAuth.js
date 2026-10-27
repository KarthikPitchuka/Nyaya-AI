import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp } from 'firebase-admin/app';

let firebaseApp;

const getFirebaseAuth = () => {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    if (!projectId) {
        const error = new Error('FIREBASE_PROJECT_ID must be configured to verify user tokens.');
        error.code = 'FIREBASE_AUTH_NOT_CONFIGURED';
        throw error;
    }

    firebaseApp ??= getApps()[0] || initializeApp({ projectId });
    return getAuth(firebaseApp);
};

const getBearerToken = (req) => {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
};

export const requireFirebaseAuth = async (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'A valid Firebase ID token is required.' });
    }

    try {
        req.firebaseUser = await getFirebaseAuth().verifyIdToken(token);
        return next();
    } catch (error) {
        if (error.code === 'FIREBASE_AUTH_NOT_CONFIGURED') {
            console.error(error.message);
            return res.status(503).json({ success: false, message: 'User authentication is not configured.' });
        }

        if (String(error.code || '').startsWith('auth/')) {
            return res.status(401).json({ success: false, message: 'The Firebase ID token is invalid or expired.' });
        }

        return next(error);
    }
};
