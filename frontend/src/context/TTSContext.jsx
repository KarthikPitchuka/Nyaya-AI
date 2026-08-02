import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';

const TTSContext = createContext();

export const useTTS = () => useContext(TTSContext);

export const TTSProvider = ({ children }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeId, setActiveId] = useState(null); // To track which button is currently playing
    const audioRef = useRef(null);
    const utteranceRef = useRef(null);
    const currentIdRef = useRef(null); // Ref for immediate ID tracking (prevents race conditions)

    const stopAll = () => {
        currentIdRef.current = null;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
        setActiveId(null);
    };

    const play = async (text, id) => {
        if (activeId === id || currentIdRef.current === id) {
            if (isPaused) {
                resume();
                return;
            } else if (isPlaying) {
                pause();
                return;
            }
        }

        stopAll();
        if (!text || !text.trim()) return;

        setIsLoading(true);
        setActiveId(id);
        currentIdRef.current = id;

        try {
            // Try high-quality backend TTS with a 5-second timeout
            // If it takes longer than 5s, the user's network is likely blocking it, so we fall back immediately.
            const response = await axios.post('http://localhost:5000/api/tts', { text }, { timeout: 5000 });

            // CRITICAL CHECK: Has the active ID changed while we were waiting?
            if (currentIdRef.current !== id) return;

            if (response.data?.success && response.data?.audio) {
                const audioSrc = `data:audio/mp3;base64,${response.data.audio}`;
                const audio = new Audio(audioSrc);
                audioRef.current = audio;

                audio.onplay = () => {
                    if (currentIdRef.current !== id) {
                        audio.pause();
                        return;
                    }
                    setIsLoading(false);
                    setIsPlaying(true);
                    setIsPaused(false);
                };

                audio.onpause = () => { setIsPaused(true); };

                audio.onended = () => {
                    setIsPlaying(false);
                    setIsPaused(false);
                    setActiveId(null);
                    if (currentIdRef.current === id) currentIdRef.current = null;
                };

                audio.onerror = () => {
                    if (currentIdRef.current === id) playBrowserTTS(text, id);
                };

                audio.play();
            } else {
                throw new Error('No audio returned');
            }
        } catch (err) {
            console.warn('Backend TTS failed or timed out, falling back to browser:', err.message);
            if (currentIdRef.current === id) {
                playBrowserTTS(text, id);
            }
        }
    };

    const playBrowserTTS = (text, id) => {
        if (currentIdRef.current !== id) return;

        // Cleanup any previous utterance
        window.speechSynthesis.cancel();

        const startSpeaking = () => {
            setIsLoading(false);
            setIsPlaying(true);
            setIsPaused(false);
            setActiveId(id);

            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance;

            // Select a good voice (English or local)
            const voices = window.speechSynthesis.getVoices();
            // Prefer Google or Microsoft voices if available
            const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Microsoft') || v.lang.includes('en-IN')) || voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onend = () => {
                setIsPlaying(false);
                setIsPaused(false);
                setActiveId(null);
                if (currentIdRef.current === id) currentIdRef.current = null;
            };

            utterance.onerror = (e) => {
                console.error("Browser TTS Error:", e);
                if (currentIdRef.current === id) stopAll();
            };

            window.speechSynthesis.speak(utterance);
        };

        // Browser voices are loaded asynchronously
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = startSpeaking;
            // Fallback if event never fires
            setTimeout(() => { if (!isPlaying) startSpeaking(); }, 1000);
        } else {
            startSpeaking();
        }
    };

    const pause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPaused(true);
        } else if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    };

    const resume = () => {
        if (audioRef.current) {
            audioRef.current.play();
            setIsPaused(false);
        } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopAll();
    }, []);

    return (
        <TTSContext.Provider value={{
            isPlaying,
            isPaused,
            isLoading,
            activeId,
            play,
            pause,
            resume,
            stop: stopAll
        }}>
            {children}
        </TTSContext.Provider>
    );
};
