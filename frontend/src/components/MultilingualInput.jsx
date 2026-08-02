import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Loader2, StopCircle, Paperclip, X, FileText, Image as ImageIcon, Volume2, VolumeX, MapPin, RefreshCw, Pause, Play } from 'lucide-react';
import axios from 'axios';
import { useLocation } from '../context/LocationContext';
import { useTTS } from '../context/TTSContext';

const MultilingualInput = ({ onAnalyze }) => {
    const { locationStr, isLoadingLocation, locationError, refreshLocation, setIsManualMode } = useLocation();
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const { isPlaying, isPaused, isLoading, activeId, play, pause, resume, stop } = useTTS();

    const fileInputRef = useRef(null);



    // Removed unused voice preloading to clean up lint issues.
    // window.speechSynthesis handles voice selection internally or via defaults.

    // Clean up media recorder on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        };
    }, [mediaRecorder]);

    const toggleRecording = async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                setIsRecording(false);
            }
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = async () => {
                    setIsTranscribing(true);
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });

                    // Cleanup stream
                    stream.getTracks().forEach(track => track.stop());

                    // Send to backend for AI transcription
                    try {
                        const formData = new FormData();
                        formData.append('audio', audioBlob, 'recording.webm');

                        const response = await axios.post('http://localhost:5000/api/cases/transcribe', formData);
                        if (response.data?.success && response.data.transcript) {
                            setInputText(prev => (prev + ' ' + response.data.transcript).trim());
                        }
                    } catch (err) {
                        console.error("Transcription failed:", err);
                        alert("AI Transcription failed. Please type your issue or check your backend server.");
                    } finally {
                        setIsTranscribing(false);
                    }
                };

                setMediaRecorder(recorder);
                setAudioChunks([]);
                recorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Recording failed:", err);
                alert("Could not access microphone. Please check your browser permissions.");
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (attachments.length + newFiles.length > 5) {
                alert("You can only attach up to 5 evidence files.");
                return;
            }
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputText.trim() && attachments.length === 0) return;

        setIsProcessing(true);
        try {
            const formData = new FormData();
            if (inputText.trim()) formData.append('prompt', inputText);

            if (locationStr) formData.append('location', locationStr);

            const userPhone = localStorage.getItem('nyaya_user_phone');
            if (userPhone) formData.append('userPhone', userPhone);
            attachments.forEach(file => {
                formData.append('files', file);
            });

            const response = await axios.post('http://localhost:5000/api/cases/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data?.success) {
                onAnalyze({
                    analysis: response.data.data,
                    caseId: response.data.caseId
                });
            } else {
                alert(response.data?.message || 'Error processing case');
            }
        } catch (error) {
            console.error('API Error:', error);
            alert(error.response?.data?.message || 'Failed to connect to the AI Engine. Please make sure the backend is running.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto relative">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden relative z-20 transition-all duration-300 flex flex-col focus-within:ring-2 focus-within:ring-indigo-500/50">
                {/* Visible Location Banner */}
                <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold ${locationError ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'
                    }`}>
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <MapPin size={14} className="shrink-0" />
                        {isLoadingLocation ? (
                            <span className="flex items-center gap-1.5">
                                <Loader2 size={12} className="animate-spin" />
                                Detecting current device location...
                            </span>
                        ) : (
                            <div className="flex items-center gap-2 overflow-hidden w-full">
                                <span className="truncate max-w-[70%]">
                                    {locationError ? `Error: ${locationError}` : `Location: ${locationStr || 'Unknown'}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsManualMode(true)}
                                    className="text-indigo-600 hover:text-indigo-800 underline shrink-0 font-bold ml-1 uppercase text-[10px]"
                                >
                                    Not my location?
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={refreshLocation}
                        disabled={isLoadingLocation}
                        className="flex items-center gap-1 px-2 py-1 bg-white/50 hover:bg-white rounded border border-transparent shadow-sm transition-all disabled:opacity-50 ml-2"
                        title="Refresh Location"
                    >
                        <RefreshCw size={12} className={isLoadingLocation ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                <div className="relative">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={isTranscribing ? "AI is transcribing your voice..." : "Type your legal issue here in any language (Telugu, Hindi, English, etc.) or use voice input&hellip;"}
                        className={`w-full h-32 px-5 py-4 text-gray-700 resize-none outline-none bg-transparent placeholder-gray-400 text-lg leading-relaxed ${isTranscribing ? 'opacity-50' : ''}`}
                        disabled={isTranscribing}
                    ></textarea>

                    {attachments.length > 0 && (
                        <div className="px-5 pb-3 flex flex-wrap gap-2">
                            {attachments.map((file, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm border border-indigo-100 pr-2">
                                    {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    <span className="max-w-[120px] truncate font-medium" title={file.name}>{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(i)}
                                        className="ml-1 text-indigo-400 hover:text-indigo-600 focus:outline-none"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-white">
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,text/plain"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center focus:outline-none"
                            title="Attach Evidence (Images, PDFs, Docs)"
                        >
                            <Paperclip size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={toggleRecording}
                            disabled={isTranscribing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 ${isRecording
                                ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm animate-pulse'
                                : isTranscribing
                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                                }`}
                        >
                            {isRecording ? <StopCircle size={18} /> : isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                            <span className="hidden sm:inline">{isRecording ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Voice Input'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={!inputText.trim() || (isLoading && activeId !== 'input-tts')}
                                onClick={() => {
                                    if (activeId === 'input-tts') {
                                        if (isPaused) resume();
                                        else if (isPlaying) pause();
                                        else play(inputText, 'input-tts');
                                    } else {
                                        play(inputText, 'input-tts');
                                    }
                                }}
                                className={`p-2 rounded-full transition-all flex items-center justify-center focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed ${activeId === 'input-tts' && isPlaying && !isPaused
                                    ? 'text-indigo-600 bg-indigo-50 shadow-inner'
                                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                                    }`}
                                title={activeId === 'input-tts' && isPlaying && !isPaused ? 'Pause' : 'Hear Out'}
                            >
                                {isLoading && activeId === 'input-tts' ? (
                                    <Loader2 size={20} className="animate-spin text-indigo-400" />
                                ) : activeId === 'input-tts' && isPlaying && !isPaused ? (
                                    <Pause size={20} fill="currentColor" />
                                ) : activeId === 'input-tts' && isPaused ? (
                                    <Play size={20} fill="currentColor" />
                                ) : (
                                    <Volume2 size={20} />
                                )}
                            </button>

                            {activeId === 'input-tts' && (isPlaying || isPaused) && (
                                <button
                                    type="button"
                                    onClick={() => stop()}
                                    className="p-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Stop"
                                >
                                    <VolumeX size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={(!inputText.trim() && attachments.length === 0) || isProcessing}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full font-semibold shadow-md transition-all duration-300 transform active:scale-95 disabled:active:scale-100"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Processing Case</span>
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                <span>Analyze Case</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MultilingualInput;
