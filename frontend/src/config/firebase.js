import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, addDoc, collection, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAtTxSJmA-NFIMV4dAAP-nlsgRfyBG5MkQ",
    authDomain: "nyaya-ai-65cc0.firebaseapp.com",
    projectId: "nyaya-ai-65cc0",
    storageBucket: "nyaya-ai-65cc0.firebasestorage.app",
    messagingSenderId: "13931527616",
    appId: "1:13931527616:web:358e0832b6491171481c25",
    measurementId: "G-6JMK9RYTK8"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to Firebase emulator in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !auth.emulatorConfig) {
    try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch (e) {
        // Emulator may not be available
    }
}

// Save device location to Firebase Firestore
export const saveLocationToFirebase = async (latitude, longitude, locationStr, deviceType = 'unknown') => {
    try {
        const docRef = await addDoc(collection(db, "locations"), {
            latitude,
            longitude,
            locationStr,
            deviceType,
            timestamp: new Date(),
            userAgent: navigator.userAgent
        });
        console.log("📍 Location saved to Firebase, doc ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.warn("Firebase location save failed:", error.message);
        return null;
    }
};

export { db, auth, addDoc, collection };
export default app;
