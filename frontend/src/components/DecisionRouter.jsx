import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Users, Scale, AlertTriangle, FileText, ArrowRight, Activity, CheckCircle2, Clock, Send, Loader2, ExternalLink, MapPin, Navigation } from 'lucide-react';
import axios from 'axios';
import TTSButton from './TTSButton';
import { API_BASE_URL } from '../config/api';
import { useLocation } from '../context/LocationContext';

const DecisionRouter = ({ analysis, caseId }) => {
    const { locationStr, coords } = useLocation();
    const [reportStatus, setReportStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportDescription, setReportDescription] = useState('');
    const [reportFiles, setReportFiles] = useState([]);

    const checkReportStatus = useCallback(async () => {
        if (!caseId) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/reports/case/${caseId}`);
            if (response.data.success) {
                setReportStatus(response.data.data);
            }
        } catch (error) {
            // 404 means no report yet, which is fine
            if (error.response?.status !== 404) {
                console.error("Error checking report status:", error);
            }
        }
    }, [caseId]);

    useEffect(() => {
        checkReportStatus();
        if (analysis) {
            setReportDescription(`Formal complaint regarding: ${analysis.case_title}\n\n[Add more details about the incident here...]`);
        }
    }, [analysis, checkReportStatus]);

    const handleFileReport = async (e) => {
        e?.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const formData = new FormData();
            formData.append('caseId', caseId);
            formData.append('description', reportDescription);

            for (let i = 0; i < reportFiles.length; i++) {
                formData.append('evidence', reportFiles[i]);
            }

            const response = await axios.post(`${API_BASE_URL}/api/reports`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.data.success) {
                setReportStatus(response.data.data);
            }
        } catch (error) {
            setSubmitError(error.response?.data?.message || 'Failed to file report');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!analysis) return null;

    const {
        case_title,
        case_type,
        complexity_level,
        complexity_score,
        recommended_solution,
        next_steps,
        user_rights,
        user_mistakes,
        lawyers,
        target_department,
        target_supervisor,
        department_url,
        police_stations,
        legal_sources = [],
        legal_source_notice
    } = analysis;

    const getStyleForComplexity = (level) => {
        switch (level) {
            case 'Simple':
                return {
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    icon: <ShieldAlert className="w-8 h-8 text-green-500" />
                };
            case 'Medium':
                return {
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-200',
                    icon: <Users className="w-8 h-8 text-yellow-500" />
                };
            case 'Complex':
                return {
                    color: 'text-red-600',
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    icon: <Scale className="w-8 h-8 text-red-500" />
                };
            default:
                return {
                    color: 'text-gray-600',
                    bg: 'bg-gray-50',
                    border: 'border-gray-200',
                    icon: <Activity className="w-8 h-8 text-gray-500" />
                };
        }
    };

    const style = getStyleForComplexity(complexity_level);
    const getDirectionsUrl = (station) => {
        const near = coords
            ? `${coords.latitude},${coords.longitude}`
            : locationStr;
        const destination = near
            ? `police station near ${near}`
            : station.name;
        const origin = coords
            ? `${coords.latitude},${coords.longitude}`
            : locationStr;
        const params = new URLSearchParams({
            api: '1',
            destination,
            travelmode: 'driving'
        });
        if (origin) params.set('origin', origin);
        return `https://www.google.com/maps/dir/?${params.toString()}`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

                {/* Header Section */}
                <div className={`p-6 border-b flex items-start gap-4 ${style.bg} ${style.border}`}>
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        {style.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 block">
                                        AI Case Classification
                                    </span>
                                    <TTSButton targetId="tts-section-classification" className="w-8 h-8 p-1.5 bg-indigo-50 border border-indigo-100" />
                                </div>
                                <div id="tts-section-classification">
                                    <h3 className="text-2xl font-bold text-gray-900">{case_title}</h3>
                                    <p className="text-gray-600 font-medium">{case_type}</p>
                                    <p className="sr-only">Complexity Score: {complexity_score}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="inline-flex items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <div className="text-center">
                                        <span className="block text-3xl font-black text-indigo-600 leading-none">
                                            {complexity_score}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                                            Score
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {legal_sources.length > 0 && (
                    <section className="border-b border-gray-100 bg-slate-50 px-6 py-5 sm:px-8" aria-labelledby="legal-sources-heading">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-indigo-100 p-2 text-indigo-700">
                                <FileText size={18} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 id="legal-sources-heading" className="font-bold text-gray-900">Relevant Central Acts passages</h4>
                                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                    {legal_source_notice || 'These passages are references for review, not a determination that each provision applies or is currently in force.'}
                                </p>
                                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {legal_sources.map((source, index) => (
                                        <li key={`${source.fileName}-${source.section}-${index}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                                            <p className="text-sm font-semibold text-indigo-800">
                                                {source.actTitle}{source.section ? `, ${source.section}` : ''}
                                            </p>
                                            {source.heading && <p className="mt-0.5 text-xs text-gray-600">{source.heading}</p>}
                                            <p className="mt-1 text-[11px] text-gray-400">
                                                {source.actId}{source.context ? ` · ${source.context}` : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                {/* Content Section */}
                <div className="p-8 bg-gray-50/50">

                    {/* Next Steps (Full Width Now) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>

                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h4 className="flex items-center text-lg font-bold text-gray-900 gap-2">
                                <FileText className="text-indigo-500" size={20} />
                                Strategic Next Steps
                            </h4>
                            <TTSButton targetId="tts-section-steps" className="w-8 h-8 p-1.5 bg-gray-50 border border-gray-100" />
                        </div>

                        <div id="tts-section-steps">
                            {/* Add Recommended Solution here since we removed the left column */}
                            <div className="mb-6 bg-indigo-50/80 p-4 rounded-lg border border-indigo-100 flex items-start gap-3 relative z-10">
                                <ArrowRight className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Recommended Approach</span>
                                    <p className="text-indigo-900 font-semibold">{recommended_solution}</p>
                                </div>
                            </div>

                            {/* Action Box to File Complaint / Track Status */}
                            {target_department && (
                                <div className="mb-6 bg-blue-50/50 p-5 rounded-xl border border-blue-200 relative z-10 shadow-sm">
                                    {reportStatus ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-blue-800 font-bold">
                                                {reportStatus.status === 'Escalated to Court' ? (
                                                    <Scale className="text-red-500" size={20} />
                                                ) : (
                                                    <CheckCircle2 className="text-green-500" size={20} />
                                                )}
                                                Report Filed Successfully
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-blue-100 grid gap-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Tracking ID:</span>
                                                    <span className="font-bold text-gray-900">{reportStatus.trackingId}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Sent To:</span>
                                                    <span className="font-medium text-gray-800">{reportStatus.supervisor} ({reportStatus.department})</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                                    <span className="text-gray-500">Current Status:</span>
                                                    <span className={`px-2 py-1 rounded font-bold text-xs ${reportStatus.status === 'Escalated to Court' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {reportStatus.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {reportStatus.status === 'Submitted to Supervisor' && (
                                                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                                    <Clock size={12} /> Pending supervisor review. If unresolved in 14 days, you can escalate to court.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h5 className="font-bold text-gray-900 flex items-center gap-2">
                                                Official Complaint Filing
                                            </h5>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                You can directly file a formal complaint with the <strong>{target_supervisor}</strong> at the <strong>{target_department}</strong>.
                                            </p>

                                            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                                            {!showReportForm ? (
                                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                    {department_url && (
                                                        <a
                                                            href={department_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl shadow-md transition-colors"
                                                        >
                                                            <ExternalLink size={18} />
                                                            <span>Open Official Portal</span>
                                                        </a>
                                                    )}

                                                    <button
                                                        onClick={() => setShowReportForm(true)}
                                                        className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-colors"
                                                    >
                                                        <FileText size={18} />
                                                        <span>Draft Online Report</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleFileReport} className="mt-4 bg-white p-5 rounded-xl border border-blue-100 shadow-inner">
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                                            <span>Complaint Details</span>
                                                        </label>

                                                        <textarea
                                                            rows="4"
                                                            value={reportDescription}
                                                            onChange={(e) => setReportDescription(e.target.value)}
                                                            placeholder={`Formal complaint regarding: ${analysis.case_title}\n\n[Add more details about the incident here...]`}
                                                            className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-40"
                                                            required
                                                        ></textarea>
                                                    </div>
                                                    <div className="mb-5">
                                                        <label className="block text-sm font-bold text-gray-700 mb-2">Upload Evidence (Images, PDFs)</label>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            onChange={(e) => setReportFiles(e.target.files)}
                                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                            accept="image/*,.pdf,.doc,.docx"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowReportForm(false)}
                                                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors border border-gray-200"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={isSubmitting}
                                                            className="flex-[2] flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-colors"
                                                        >
                                                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                                            <span>{isSubmitting ? 'Submitting...' : 'Submit to Supervisor'}</span>
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <ul className="space-y-4 relative z-10">
                                {next_steps && next_steps.map((step, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm mr-3 mt-0.5">
                                            {index + 1}
                                        </span>
                                        <span className="text-gray-700 leading-relaxed font-medium">
                                            {step}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>

                {/* Additional Details Section: Rights & Mistakes */}
                {(user_rights?.length > 0 || user_mistakes?.length > 0) && (
                    <div className="p-8 grid md:grid-cols-2 gap-8 bg-white border-t border-gray-100">
                        {/* Legal Rights */}
                        {user_rights?.length > 0 && (
                            <div className="bg-green-50/50 p-6 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-green-900 flex items-center gap-2">
                                        <ShieldAlert className="text-green-600" size={20} />
                                        Your Legal Rights
                                    </h4>
                                    <TTSButton targetId="tts-section-rights" className="w-8 h-8 p-1.5 bg-green-100 border border-green-200" />
                                </div>
                                <ul id="tts-section-rights" className="space-y-3">
                                    {user_rights.map((right, idx) => (
                                        <li key={idx} className="flex items-start text-green-800 text-sm font-medium">
                                            <span className="mr-2 text-green-500 mt-0.5">•</span>
                                            {right}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Common Mistakes Documented */}
                        {user_mistakes?.length > 0 && (
                            <div className="bg-red-50/50 p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-red-900 flex items-center gap-2">
                                        <AlertTriangle className="text-red-500" size={20} />
                                        Errors Identified in Case
                                    </h4>
                                    <TTSButton targetId="tts-section-errors" className="w-8 h-8 p-1.5 bg-red-100 border border-red-200" />
                                </div>
                                <ul id="tts-section-errors" className="space-y-3">
                                    {user_mistakes.map((mistake, idx) => (
                                        <li key={idx} className="flex items-start text-red-800 text-sm font-medium">
                                            <span className="mr-2 text-red-500 mt-0.5">✗</span>
                                            {mistake}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Nearby Police Stations Section */}
                {police_stations?.length > 0 && (
                    <div className="p-8 bg-blue-50/30 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h4 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                                    <MapPin className="text-blue-500" size={24} />
                                    Nearest Police Station
                                </h4>
                                <p className="text-gray-500 mt-1 text-sm">
                                    Open the nearest police station search in Google Maps.
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {police_stations.map(station => (
                                <div key={station.id} className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <h5 className="font-bold text-gray-900 leading-tight pr-2">{station.name}</h5>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shrink-0 ${station.type === 'Specialized' ? 'bg-indigo-100 text-indigo-700' :
                                            station.type === 'Headquarters' ? 'bg-red-100 text-red-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                            {station.type}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-blue-600 mb-5">{station.specialty}</p>

                                    <div className="border-t border-gray-100 pt-4">
                                        <a
                                            href={getDirectionsUrl(station)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            aria-label={`Get directions to ${station.name} in Google Maps`}
                                        >
                                            <Navigation size={16} />
                                            Find nearest on Maps
                                            <ExternalLink size={14} aria-hidden="true" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lawyer Matching Section */}
                {lawyers?.length > 0 && (
                    <div className="p-8 bg-gray-900 text-white border-t border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h4 className="text-xl font-bold flex items-center gap-2">
                                        <Scale className="text-indigo-400" size={24} />
                                        Recommended Legal Experts
                                    </h4>
                                    <TTSButton
                                        targetId="tts-section-experts"
                                        className="w-8 h-8 p-1.5 bg-gray-800 border border-gray-700 hover:bg-gray-700"
                                    />
                                </div>
                                <p className="text-gray-400 mt-1 text-sm">Based on {case_type} expertise & availability</p>
                            </div>
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30 uppercase tracking-wide">
                                Verified Profiles
                            </span>
                        </div>

                        <div id="tts-section-experts" className="grid md:grid-cols-3 gap-6">
                            {lawyers.map(lawyer => (
                                <div key={lawyer.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-indigo-500 transition-colors shadow-lg group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img src={lawyer.imageUrl} alt={lawyer.name} className="w-14 h-14 rounded-full border-2 border-gray-600 group-hover:border-indigo-400 transition-colors" />
                                        <div>
                                            <h5 className="font-bold text-gray-100 leading-tight">{lawyer.name}</h5>
                                            <span className="text-xs font-semibold text-indigo-400 mt-1 block">{lawyer.specialty}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Experience</span>
                                            <span className="text-gray-200 font-medium">{lawyer.experience}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Consultation</span>
                                            <span className="text-gray-200 font-medium">{lawyer.fee}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Location</span>
                                            <span className="text-gray-200 font-medium">{lawyer.location}</span>
                                        </div>
                                    </div>
                                    <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-md">
                                        Book Consultation
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
};

export default DecisionRouter;
