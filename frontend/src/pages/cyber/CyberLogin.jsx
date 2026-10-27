import { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const CyberLogin = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [registrationCode, setRegistrationCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                const res = await axios.post(`${API_BASE_URL}/api/cyber/auth/login`, { email, password });
                if (res.data.success) {
                    localStorage.setItem('cyber_token', res.data.token);
                    localStorage.setItem('cyber_user', JSON.stringify(res.data.user));
                    navigate('/cyber/dashboard');
                }
            } else {
                const res = await axios.post(`${API_BASE_URL}/api/cyber/auth/register`, {
                    email,
                    password,
                    name,
                    registrationCode
                });
                if (res.data.success) {
                    setIsLogin(true);
                    setRegistrationCode('');
                    setError('Registration successful. Please login.');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Official access only.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 selection:bg-green-500/30">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
                <div className="p-8 text-center border-b border-gray-800">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4 border border-green-500/20">
                        <Shield size={32} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase">Cyber Dept</h2>
                    <p className="text-gray-400 mt-1 text-sm font-medium">Secured Access Portal</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-start gap-3 border ${error.includes('successful') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
                            }`}>
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Officer Name</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                                            placeholder="Agent Smith"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Official Registration Code</label>
                                <input
                                    type="password"
                                    value={registrationCode}
                                    onChange={(e) => setRegistrationCode(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Official Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                                placeholder="officer@cyber.gov.in"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Secure Password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password || (!isLogin && !registrationCode)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-500 text-black font-black uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] disabled:opacity-50 mt-4"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isLogin ? 'Initialize Uplink' : 'Register clearance')}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-gray-500 hover:text-green-400 text-sm font-medium transition-colors"
                        >
                            {isLogin ? "Request new officer clearance" : "Return to secure login"}
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-8 text-center text-gray-600 text-xs font-mono">
                RESTRICTED ACCESS • ALL ACTIONS MONITORED
            </div>
        </div>
    );
};

export default CyberLogin;
