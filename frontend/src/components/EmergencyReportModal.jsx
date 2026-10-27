import { useState, useEffect, useRef } from 'react';
import { AlertOctagon, PhoneCall, Crosshair, X, Loader2, CheckCircle2, User, Mic, Smartphone } from 'lucide-react';
import axios from 'axios';
import { useLocation } from '../context/LocationContext';
import { API_BASE_URL } from '../config/api';
import { getAudioFileExtension, getAudioRecordingOptions } from '../utils/audioRecording';

const EmergencyReportModal = ({ isOpen, onClose, userPhone }) => {
    const { locationStr, coords, locationAccuracy } = useLocation();
    const [attackerPhone, setAttackerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isSimulatingCall, setIsSimulatingCall] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isOpenRef = useRef(isOpen);
    const recordingRequestRef = useRef(0);
    isOpenRef.current = isOpen;

    // Format recording time
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Auto-start recording when modal opens
    useEffect(() => {
        if (isOpen && !result) {
            startRecording();
        } else {
            stopRecordingContext();
        }
        return () => stopRecordingContext();
    }, [isOpen, result]);

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const startRecording = async () => {
        const requestId = ++recordingRequestRef.current;
        let stream;
        try {
            if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
                throw new Error('Audio recording is not supported in this browser.');
            }
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isOpenRef.current || requestId !== recordingRequestRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            const mediaRecorder = new MediaRecorder(stream, getAudioRecordingOptions());
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            setAudioBlob(null);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
        } catch (err) {
            stream?.getTracks().forEach(track => track.stop());
            if (requestId === recordingRequestRef.current && isOpenRef.current) {
                setIsRecording(false);
                console.warn('Microphone access denied or unavailable:', err.message);
            }
            // Non-blocking: user can still submit report without audio
        }
    };

    const stopRecordingContext = () => {
        recordingRequestRef.current++;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
    };

    const stopRecordingAndGetBlob = () => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                const recorder = mediaRecorderRef.current;
                recorder.onstop = () => {
                    const mimeType = recorder.mimeType || audioChunksRef.current[0]?.type || 'application/octet-stream';
                    const blob = new Blob(audioChunksRef.current, { type: mimeType });
                    setAudioBlob(blob);
                    resolve(blob);
                };
                recorder.stop();
                recorder.stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            } else {
                resolve(audioBlob);
            }
        });
    };

    const simulateCallerDetection = () => {
        setIsSimulatingCall(true);
        setTimeout(() => {
            const allowed = window.confirm("Allow Nyaya-AI to access Phone Logs to detect ongoing call? (Demo concept for native app integration)");
            if (allowed) {
                setAttackerPhone('+91 98765 43210');
            }
            setIsSimulatingCall(false);
        }, 600);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Stop recording perfectly
            const finalAudioBlob = await stopRecordingAndGetBlob();

            // Get user's current location from context or storage
            const userLoc = locationStr || '';
            const firebaseToken = localStorage.getItem('nyaya_auth_token');
            if (!firebaseToken || firebaseToken.startsWith('dev_mock_token_')) {
                throw new Error('Please sign in with Firebase phone authentication before submitting an emergency report.');
            }

            const formData = new FormData();
            formData.append('attackerPhone', attackerPhone);
            if (userLoc) formData.append('userLocation', userLoc);
            if (coords) {
                formData.append('locationLatitude', String(coords.latitude));
                formData.append('locationLongitude', String(coords.longitude));
                if (locationAccuracy !== null) {
                    formData.append('locationAccuracy', String(locationAccuracy));
                }
            }

            if (finalAudioBlob) {
                formData.append(
                    'audio',
                    finalAudioBlob,
                    `emergency_recording.${getAudioFileExtension(finalAudioBlob.type)}`
                );
            }

            const response = await axios.post(`${API_BASE_URL}/api/reports/emergency`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${firebaseToken}`
                }
            });

            if (response.data.success) {
                setResult(response.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate tracking. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setAttackerPhone('');
        setResult(null);
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="bg-red-600 p-6 text-white text-center relative">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                        <AlertOctagon size={32} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Emergency Cyber Action</h2>
                    <p className="text-red-100 mt-1 text-sm font-medium">Instant Tracking & Intervention</p>
                </div>

                <div className="p-6">
                    {result ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-2">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Tracking Initiated!</h3>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Your Number:</span>
                                    <span className="font-bold text-blue-600">+91 {result.userPhone || userPhone}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Attacker Number:</span>
                                    <span className="font-bold text-red-600">{result.attackerPhone}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Your Location:</span>
                                    <span className="font-bold text-gray-700 text-right max-w-[55%] truncate">{result.userLocation || 'N/A'}</span>
                                </div>
                                <hr className="border-gray-100" />
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tracking ID:</span>
                                    <span className="font-mono font-bold text-gray-900">{result.trackingId}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-500">Status:</span>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs flex items-center gap-1">
                                        <Crosshair size={12} className="animate-pulse" />
                                        Active Tracing
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">
                                The Cyber Crime Tracking Unit has been alerted with <strong>both phone numbers</strong> and your location. They are actively attempting to trace the attacker. Do not disconnect the call until instructed.
                            </p>
                            <button
                                onClick={handleClose}
                                className="mt-4 w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors"
                            >
                                Close Window
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* User's phone (auto-filled, read-only) */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                                    <User size={18} className="text-indigo-600" />
                                </div>
                                <div>
                                    <span className="block text-xs text-indigo-500 font-semibold">Your Verified Number</span>
                                    <span className="font-bold text-indigo-900 font-mono">+91 {userPhone}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                                <PhoneCall className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <strong className="block text-sm text-blue-900">Is the scam call ongoing?</strong>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Keep the attacker on the line. Enter their number below. Both your number and the attacker&apos;s number will be sent to the Cyber Crime Department for instant tracking.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                                    <span>Attacker&apos;s Phone Number</span>
                                    <button
                                        type="button"
                                        onClick={simulateCallerDetection}
                                        disabled={isSimulatingCall}
                                        className="flex items-center gap-1 text-[10px] sm:text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded-md font-bold transition-colors shadow-sm"
                                    >
                                        <span className="flex items-center justify-center w-3 h-3">
                                            {isSimulatingCall ? <Loader2 size={12} className="animate-spin" /> : <Smartphone size={12} />}
                                        </span>
                                        <span>Auto-Detect Ongoing Call</span>
                                    </button>
                                </label>
                                <input
                                    type="tel"
                                    value={attackerPhone}
                                    onChange={(e) => setAttackerPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-4 py-3 text-lg font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                                    required
                                    pattern="[\+0-9\-\s]+"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-red-900">Current Status</span>
                                    {isRecording && (
                                        <span className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                                            <Mic size={12} className="animate-pulse" /> Recording Evidence: {formatTime(recordingTime)}
                                        </span>
                                    )}
                                </div>
                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                    On Call
                                </span>
                            </div>

                            {error && <p className="text-sm border-l-2 border-red-500 pl-2 text-red-600 font-medium">{error}</p>}

                            <button
                                type="submit"
                                disabled={isSubmitting || !attackerPhone}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-red-400 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] hover:-translate-y-0.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin shrink-0" />
                                        <span>Initiating Trace...</span>
                                    </>
                                ) : (
                                    <>
                                        <Crosshair size={20} className="shrink-0" />
                                        <span>Report to Cyber Security</span>
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-gray-400 text-center">
                                Both your number (+91 {userPhone}) and the attacker&apos;s number will be submitted to the Cyber Crime Tracking Unit.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmergencyReportModal;
