import multer from 'multer';
import path from 'path';

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
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
        'application/pdf', 'application/msword'
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

export default upload;
