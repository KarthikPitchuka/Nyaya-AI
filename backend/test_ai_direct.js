import { analyzeLegalCase } from './src/services/ai.service.js';

(async () => {
    try {
        console.log("Testing AI...");
        const result = await analyzeLegalCase("పోలీసులు నన్ను కారణం లేకుండా అరెస్టు చేసారు", "te-IN");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("TEST FAILED:", e.name, e.message);
        console.error(e.stack);
    }
})();
