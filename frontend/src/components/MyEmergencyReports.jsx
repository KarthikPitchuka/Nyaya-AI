import { useState, useEffect } from 'react';
import { ShieldAlert, MapPin, Phone, Activity, FileText, CheckCircle2, Search, Crosshair } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const MyEmergencyReports = ({ userPhone }) => {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            if (!userPhone) return;
            try {
                const firebaseToken = localStorage.getItem('nyaya_auth_token');
                if (!firebaseToken || firebaseToken.startsWith('dev_mock_token_')) {
                    setReports([]);
                    return;
                }

                const response = await axios.get(`${API_BASE_URL}/api/reports/emergency/mine`, {
                    headers: { Authorization: `Bearer ${firebaseToken}` }
                });
                if (response.data.success) {
                    setReports(response.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch reports", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, [userPhone]);

    if (!userPhone) return null;

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin text-blue-600"><Activity size={32} /></div>
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">No Emergency Reports</h3>
                <p className="text-gray-500 mt-2">You haven&apos;t filed any emergency cyber tracking requests.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Activity className="text-red-600" />
                My Active Tracking Requests
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
                {reports.map((report) => (
                    <div key={report._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`p-3 text-white flex justify-between items-center ${report.status === 'Resolved' ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                            <span className="font-mono font-bold text-sm flex items-center gap-2">
                                <Search size={14} /> {report.trackingId}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-black/20 rounded-full">
                                {report.status}
                            </span>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                    <Phone className="text-red-500" size={18} />
                                </div>
                                <div className="overflow-hidden">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Target (Attacker)</span>
                                    <p className="font-mono text-lg font-black text-gray-900 truncate">
                                        {report.attackerPhone}
                                    </p>
                                </div>
                            </div>

                            <hr className="border-gray-50" />

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin size={14} className="text-gray-400" />
                                    <span className="truncate">{report.userLocation || 'Location unavailable'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Activity size={14} className="text-gray-400" />
                                    <span>Added {new Date(report.createdAt).toLocaleDateString()}</span>
                                </div>
                                {report.audioUrl && (
                                    <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium bg-indigo-50 w-max px-2 py-1 rounded">
                                        <FileText size={14} />
                                        Call Recording Attached
                                    </div>
                                )}
                            </div>

                            {/* Action Taken Section */}
                            {report.actionTaken && (
                                <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="block text-xs font-bold text-green-800 uppercase mb-1">Cyber Dept Response</span>
                                            <p className="text-sm font-medium text-green-900 leading-relaxed">
                                                {report.actionTaken}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!report.actionTaken && report.status !== 'Resolved' && (
                                <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2 text-xs font-medium text-gray-500">
                                    <Crosshair size={14} className="animate-spin-slow" />
                                    Awaiting officer response...
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyEmergencyReports;
