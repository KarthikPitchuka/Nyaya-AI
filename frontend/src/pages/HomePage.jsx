import { useState } from 'react';
import MultilingualInput from '../components/MultilingualInput';
import DecisionRouter from '../components/DecisionRouter';
import MyEmergencyReports from '../components/MyEmergencyReports';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
    const [result, setResult] = useState(null);
    const { user } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full space-y-8 text-center bg-white p-10 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 -mx-8 -my-8 w-48 h-48 bg-indigo-50 rounded-full opacity-50 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mx-8 -my-8 w-48 h-48 bg-blue-50 rounded-full opacity-50 blur-2xl"></div>

                <div className="relative z-10">
                    <div className="inline-block p-4 rounded-full bg-indigo-100 mb-6 drop-shadow-sm border border-indigo-200">
                        <span className="text-5xl">🏛️</span>
                    </div>

                    <h2 className="mt-2 text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                        Describe Your Legal Problem
                    </h2>
                    <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                        Our AI Legal Assistant will analyze your case complexity and guide you to the right authority or expert.
                    </p>

                    <div className="mt-10">
                        <MultilingualInput onAnalyze={setResult} />
                    </div>
                </div>
            </div>

            {/* Level 3 & 4 Routing Component */}
            {result && (
                <DecisionRouter analysis={result.analysis} caseId={result.caseId} />
            )}

            {/* Emergency Tracking Dashboard */}
            {user?.phone && (
                <div className="w-full max-w-4xl mx-auto mt-12 bg-gray-50 p-6 sm:p-8 rounded-3xl border border-gray-200">
                    <MyEmergencyReports userPhone={user.phone} />
                </div>
            )}
        </div>
    );
};

export default HomePage;
