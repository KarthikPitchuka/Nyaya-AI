import React, { useState, useEffect } from 'react';
import { Shield, Search, MapPin, Phone, Activity, FileText, CheckCircle2, ShieldAlert, LogOut, Check, Play, Pause, Crosshair } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CyberDashboard = () => {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionInputs, setActionInputs] = useState({});
    const [statusInputs, setStatusInputs] = useState({});

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('cyber_user'));

    useEffect(() => {
        if (!localStorage.getItem('cyber_token')) {
            navigate('/cyber/login');
            return;
        }
        fetchReports();
    }, [navigate]);

    const fetchReports = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/reports/emergency');
            if (res.data.success) {
                setReports(res.data.data);

                // Initialize input states for unresolved reports
                const actions = {};
                const statuses = {};
                res.data.data.forEach(r => {
                    actions[r._id] = r.actionTaken || '';
                    statuses[r._id] = r.status || 'Pending Review';
                });
                setActionInputs(actions);
                setStatusInputs(statuses);
            }
        } catch (err) {
            console.error("Failed to fetch reports:", err);
            if (err.response?.status === 401) navigate('/cyber/login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (id) => {
        try {
            const actionTaken = actionInputs[id];
            const status = statusInputs[id];

            await axios.put(`http://localhost:5000/api/reports/emergency/${id}/status`, {
                status,
                actionTaken
            });
            fetchReports(); // Refresh data
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update case file.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('cyber_token');
        localStorage.removeItem('cyber_user');
        navigate('/cyber/login');
    };

    if (isLoading) {
        return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Activity className="animate-spin text-green-500" size={48} /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-300 font-sans selection:bg-green-500/30">
            {/* Top Navigation */}
            <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20">
                            <Shield className="text-green-500" size={20} />
                        </div>
                        <div>
                            <h1 className="text-white font-black tracking-widest uppercase text-sm">Cyber Tracking Unit</h1>
                            <p className="text-[10px] text-green-500 tracking-widest uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Secure Uplink Active
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-white font-bold text-sm uppercase">{user?.name}</p>
                            <p className="text-xs text-gray-500">{user?.role} Clearance</p>
                        </div>
                        <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Active Threats Console</h2>
                        <p className="text-gray-500 mt-1">Monitoring live emergency reports and tracing operations.</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        Total Cases: <span className="text-green-400">{reports.length}</span>
                    </div>
                </div>

                <div className="grid gap-6">
                    {reports.map((report) => (
                        <div key={report._id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
                            <div className={`px-6 py-3 border-b flex justify-between items-center ${report.status === 'Resolved' ? 'bg-green-900/20 border-green-900/30' : 'bg-red-900/20 border-red-900/30'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {report.status === 'Resolved' ? <CheckCircle2 className="text-green-500" size={18} /> : <ShieldAlert className="text-red-500" size={18} />}
                                    <span className="font-mono text-sm font-bold text-white tracking-wider">{report.trackingId}</span>
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded ${report.status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400 animate-pulse'
                                    }`}>
                                    {report.status}
                                </span>
                            </div>

                            <div className="p-6 grid md:grid-cols-2 gap-8">
                                {/* Intel Section */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Target Intel</h3>

                                        <div className="flex gap-4 items-start">
                                            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0 border border-red-500/20">
                                                <Crosshair className="text-red-500" size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Attacker Number</p>
                                                <p className="text-xl font-mono text-white font-black">{report.attackerPhone}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Victim Number</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                                    <Phone size={14} className="text-gray-600" />
                                                    {report.userPhone ? `+91 ${report.userPhone}` : 'Unknown'}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Victim Location</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                                    <MapPin size={14} className="text-gray-600" />
                                                    <span className="truncate">{report.userLocation || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Audio Evidence */}
                                    {report.audioUrl && (
                                        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <FileText size={14} /> Audio Evidence Attached
                                            </h3>
                                            <audio controls className="w-full h-10"   >
                                                <source src={`http://localhost:5000${report.audioUrl}`} type="audio/webm" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    )}
                                </div>

                                {/* Action Section */}
                                <div className="bg-gray-950 rounded-xl p-5 border border-gray-800 space-y-4 flex flex-col">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Officer Action Hub</h3>

                                    <div className="flex-grow space-y-4 pt-2">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Update Trace Status</label>
                                            <select
                                                value={statusInputs[report._id] || ''}
                                                onChange={(e) => setStatusInputs({ ...statusInputs, [report._id]: e.target.value })}
                                                disabled={report.status === 'Resolved'}
                                                className="w-full bg-gray-900 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 disabled:opacity-50 appearance-none"
                                            >
                                                <option value="Pending Review">Pending Review</option>
                                                <option value="Active Tracing">Active Tracing</option>
                                                <option value="Carrier Block Requested">Carrier Block Requested</option>
                                                <option value="Resolved">Resolved</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Official Action Taken Log (Visible to Victim)</label>
                                            <textarea
                                                value={actionInputs[report._id] || ''}
                                                onChange={(e) => setActionInputs({ ...actionInputs, [report._id]: e.target.value })}
                                                disabled={report.status === 'Resolved'}
                                                className="w-full bg-gray-900 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:border-green-500 disabled:opacity-50 resize-none"
                                                placeholder="e.g. Scammer number traced to foreign exchange. Number blocked at carrier network level. FIR filed."
                                            ></textarea>
                                        </div>
                                    </div>

                                    {report.status !== 'Resolved' && (
                                        <button
                                            onClick={() => handleUpdate(report._id)}
                                            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold uppercase tracking-widest py-3 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
                                        >
                                            <Check size={18} /> Update Case File
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {reports.length === 0 && (
                        <div className="text-center py-20 text-gray-600">
                            <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-bold uppercase tracking-widest">No active threats detected in sector</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CyberDashboard;
