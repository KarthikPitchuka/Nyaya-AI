import mongoose from 'mongoose';
import EmergencyReport from './src/models/EmergencyReport.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nyaya-ai')
    .then(async () => {
        try {
            console.log("Fetching reports...");
            const reports = await EmergencyReport.find().sort({ createdAt: -1 });
            console.log(`Found ${reports.length} reports.`);
            process.exit(0);
        } catch (err) {
            console.error("ERROR:", err);
            process.exit(1);
        }
    });
