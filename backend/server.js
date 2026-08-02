import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/config/db.js';
import caseRoutes from './src/routes/case.routes.js';
import reportRoutes from './src/routes/report.routes.js';
import ttsRoutes from './src/routes/tts.routes.js';
import geolocationRoutes from './src/routes/geolocation.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import cyberAuthRoutes from './src/routes/cyberAuth.routes.js'; // Cyber Portal Auth

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'],
    credentials: true
}));
app.use(express.json());

// Serve uploaded evidence files
app.use('/uploads', express.static('uploads'));

// Main Routes (API Gateway)
app.use('/api/cases', caseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/geolocation', geolocationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cyber/auth', cyberAuthRoutes); // Add cyber auth routes

// Base route test
app.get('/', (req, res) => {
    res.send('Nyaya-AI Legal Assistant API is running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
