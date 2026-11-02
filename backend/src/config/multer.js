import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const uploadDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url));
mkdirSync(uploadDirectory, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional: restrict to images/pdfs/audio)
const fileFilter = (req, file, cb) => {
    // Accept standard evidence files and ANY audio recordings
    const allowedImageDocTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/json'
    ];

    if (allowedImageDocTypes.includes(file.mimetype) ||
        file.mimetype.startsWith('audio/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'application/octet-stream') {
        cb(null, true);
    } else {
        console.warn('Multer rejected file with mimetype:', file.mimetype);
        cb(new Error(`Invalid file type (${file.mimetype}). Allowed: Images, PDF, Word, and Audio.`), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (audio recordings can be large)
    fileFilter: fileFilter
});

export default upload;
