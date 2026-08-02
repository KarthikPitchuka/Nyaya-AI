import React from 'react';
import { Volume2, VolumeX, Loader2, Pause, Play } from 'lucide-react';
import { useTTS } from '../context/TTSContext';

const TTSButton = ({ text, targetId, className = "" }) => {
    const { isPlaying, isPaused, isLoading, activeId, play, pause, resume, stop } = useTTS();

    // Create a unique ID for this button instance if one doesn't exist
    // We use targetId if available, otherwise we'd need another unique prop
    const buttonId = targetId || text?.slice(0, 20);
    const isThisActive = activeId === buttonId;

    const handleToggle = () => {
        let textToRead = text;

        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                textToRead = element.innerText || element.textContent;
            }
        }

        if (isThisActive) {
            if (isPaused) {
                resume();
            } else if (isPlaying) {
                pause();
            } else {
                play(textToRead, buttonId);
            }
        } else {
            play(textToRead, buttonId);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={handleToggle}
                disabled={(!text?.trim() && !targetId) || isLoading && !isThisActive}
                className={`p-2 rounded-full transition-all flex items-center justify-center focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed ${isThisActive && isPlaying && !isPaused
                        ? 'text-indigo-600 bg-indigo-50 shadow-inner'
                        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                    } ${className}`}
                title={isThisActive && isPlaying && !isPaused ? 'Pause' : 'Listen'}
            >
                {isLoading && isThisActive ? (
                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                ) : isThisActive && isPlaying && !isPaused ? (
                    <Pause size={18} fill="currentColor" />
                ) : (
                    <Play size={18} fill={isThisActive ? "currentColor" : "none"} />
                )}
            </button>

            {isThisActive && (isPlaying || isPaused) && (
                <button
                    type="button"
                    onClick={() => stop()}
                    className="p-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Stop"
                >
                    <VolumeX size={18} />
                </button>
            )}
        </div>
    );
};

export default TTSButton;
