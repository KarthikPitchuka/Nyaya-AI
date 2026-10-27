import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const TTSContext = createContext();

export const useTTS = () => useContext(TTSContext);

const languageByScript = [
    [/[\u0C00-\u0C7F]/, 'te-IN'],
    [/[\u0900-\u097F]/, 'hi-IN'],
    [/[\u0B80-\u0BFF]/, 'ta-IN'],
    [/[\u0C80-\u0CFF]/, 'kn-IN'],
    [/[\u0D00-\u0D7F]/, 'ml-IN'],
    [/[\u0980-\u09FF]/, 'bn-IN'],
    [/[\u0A80-\u0AFF]/, 'gu-IN'],
    [/[\u0A00-\u0A7F]/, 'pa-IN']
];

const detectSpeechLanguage = (text) => (
    languageByScript.find(([script]) => script.test(text))?.[1] || 'en-IN'
);

export const TTSProvider = ({ children }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const audioRef = useRef(null);
    const utteranceRef = useRef(null);
    const currentIdRef = useRef(null);
    const playbackStateRef = useRef('idle');
    const voiceLoadTimerRef = useRef(null);
    const voiceChangeHandlerRef = useRef(null);

    const setPlaybackState = useCallback((state, id = null) => {
        playbackStateRef.current = state;
        setIsLoading(state === 'loading');
        setIsPlaying(state === 'playing' || state === 'paused');
        setIsPaused(state === 'paused');
        setActiveId(state === 'idle' ? null : id);
    }, []);

    const clearVoiceWait = useCallback(() => {
        if (voiceLoadTimerRef.current !== null) {
            window.clearTimeout(voiceLoadTimerRef.current);
            voiceLoadTimerRef.current = null;
        }
        if (voiceChangeHandlerRef.current && 'speechSynthesis' in window) {
            window.speechSynthesis.removeEventListener?.(
                'voiceschanged',
                voiceChangeHandlerRef.current
            );
            if (window.speechSynthesis.onvoiceschanged === voiceChangeHandlerRef.current) {
                window.speechSynthesis.onvoiceschanged = null;
            }
            voiceChangeHandlerRef.current = null;
        }
    }, []);

    const stopAll = useCallback(() => {
        currentIdRef.current = null;
        clearVoiceWait();

        if (audioRef.current) {
            const audio = audioRef.current;
            audioRef.current = null;
            audio.onplay = null;
            audio.onpause = null;
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        utteranceRef.current = null;
        setPlaybackState('idle');
    }, [clearVoiceWait, setPlaybackState]);

    const playBrowserTTS = (text, id) => {
        if (currentIdRef.current !== id || !('speechSynthesis' in window)) {
            if (currentIdRef.current === id) stopAll();
            return;
        }

        const synthesis = window.speechSynthesis;
        synthesis.cancel();
        clearVoiceWait();
        let started = false;

        const startSpeaking = () => {
            if (started || currentIdRef.current !== id) return;
            started = true;
            clearVoiceWait();

            const language = detectSpeechLanguage(text);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;
            utterance.rate = 1;
            utterance.pitch = 1;

            const voices = synthesis.getVoices();
            const matchingVoice = voices.find(voice =>
                voice.lang?.toLowerCase().startsWith(language.toLowerCase())
            );
            const defaultVoice = voices.find(voice => voice.default);
            if (matchingVoice || defaultVoice || voices[0]) {
                utterance.voice = matchingVoice || defaultVoice || voices[0];
            }

            utterance.onstart = () => {
                if (currentIdRef.current === id) setPlaybackState('playing', id);
            };
            utterance.onend = () => {
                if (currentIdRef.current === id) stopAll();
            };
            utterance.onerror = (event) => {
                console.error('Browser text-to-speech failed:', event.error || event);
                if (currentIdRef.current === id) stopAll();
            };

            utteranceRef.current = utterance;
            try {
                synthesis.speak(utterance);
            } catch (error) {
                console.error('Could not start browser text-to-speech:', error);
                if (currentIdRef.current === id) stopAll();
            }
        };

        const voices = synthesis.getVoices();
        if (voices.length > 0) {
            startSpeaking();
            return;
        }

        voiceChangeHandlerRef.current = startSpeaking;
        if (typeof synthesis.addEventListener === 'function') {
            synthesis.addEventListener('voiceschanged', startSpeaking);
        } else {
            synthesis.onvoiceschanged = startSpeaking;
        }
        voiceLoadTimerRef.current = window.setTimeout(startSpeaking, 1200);
    };

    const play = async (text, id) => {
        if (!text?.trim()) return;

        if (currentIdRef.current === id) {
            if (playbackStateRef.current === 'playing') {
                pause();
                return;
            }
            if (playbackStateRef.current === 'paused') {
                resume();
                return;
            }
            if (playbackStateRef.current === 'loading') return;
        }

        stopAll();
        currentIdRef.current = id;
        setPlaybackState('loading', id);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/tts`,
                { text },
                { timeout: 8000 }
            );

            if (currentIdRef.current !== id) return;
            if (!response.data?.success || !response.data?.audio) {
                throw new Error(response.data?.message || 'No audio returned');
            }

            const audio = new Audio(`data:audio/mpeg;base64,${response.data.audio}`);
            audioRef.current = audio;
            let fallbackStarted = false;
            const fallbackToBrowserSpeech = () => {
                if (fallbackStarted || currentIdRef.current !== id) return;
                fallbackStarted = true;
                audio.onplay = null;
                audio.onpause = null;
                audio.onended = null;
                audio.onerror = null;
                audio.pause();
                audioRef.current = null;
                playBrowserTTS(text, id);
            };
            audio.onplay = () => {
                if (currentIdRef.current === id) setPlaybackState('playing', id);
                else audio.pause();
            };
            audio.onpause = () => {
                if (currentIdRef.current === id && playbackStateRef.current === 'playing') {
                    setPlaybackState('paused', id);
                }
            };
            audio.onended = () => {
                if (currentIdRef.current === id) stopAll();
            };
            audio.onerror = fallbackToBrowserSpeech;

            try {
                await audio.play();
            } catch (error) {
                if (currentIdRef.current !== id) return;
                console.warn('Backend audio playback failed; using browser speech:', error);
                fallbackToBrowserSpeech();
            }
        } catch (error) {
            if (currentIdRef.current !== id) return;
            console.warn('Backend TTS failed; using browser speech:', error.message);
            playBrowserTTS(text, id);
        }
    };

    const pause = () => {
        if (audioRef.current && playbackStateRef.current === 'playing') {
            audioRef.current.pause();
            setPlaybackState('paused', currentIdRef.current);
        } else if (
            'speechSynthesis' in window &&
            window.speechSynthesis.speaking &&
            !window.speechSynthesis.paused
        ) {
            window.speechSynthesis.pause();
            setPlaybackState('paused', currentIdRef.current);
        }
    };

    const resume = () => {
        if (audioRef.current && playbackStateRef.current === 'paused') {
            audioRef.current.play().catch(error => {
                console.error('Could not resume audio playback:', error);
                if (currentIdRef.current) stopAll();
            });
        } else if ('speechSynthesis' in window && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setPlaybackState('playing', currentIdRef.current);
        }
    };

    useEffect(() => () => stopAll(), [stopAll]);

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
