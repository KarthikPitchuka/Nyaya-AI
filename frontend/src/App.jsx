import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';

// Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CyberLogin = lazy(() => import('./pages/cyber/CyberLogin'));
const CyberDashboard = lazy(() => import('./pages/cyber/CyberDashboard'));

// Components
import EmergencyReportModal from './components/EmergencyReportModal';
import { LocationProvider } from './context/LocationContext';
import { TTSProvider } from './context/TTSContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Navbar component (extracted from original App)
const Navbar = () => {
  const { user, logout } = useAuth();
  const [showEmergencyModal, setShowEmergencyModal] = React.useState(false);

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2 notranslate" translate="no">
          <span className="text-3xl">⚖️</span> Nyaya-AI
        </h1>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                📱 +91 {user.phone.slice(-10)}
              </span>
              <Link to="/" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Home</Link>
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold transition-colors border border-red-200"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                Emergency Report
              </button>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
      {/* Emergency Modal — passes user phone */}
      <EmergencyReportModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        userPhone={user?.phone}
      />
    </header>
  );
};


function AppContent() {
  const { user, login } = useAuth();
  const [isEmergencyOpen, setIsEmergencyOpen] = React.useState(false);

  return (
    <TTSProvider>
      <LocationProvider>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 transition-colors duration-300">
          <Suspense fallback={
            <div className="flex min-h-[calc(100vh-140px)] items-center justify-center text-sm font-medium text-gray-500" role="status">
              Loading Nyaya-AI...
            </div>
          }>
          <Routes>
            {/* Cyber Portal Routes (No main navbar) */}
            <Route path="/cyber/login" element={<CyberLogin />} />
            <Route path="/cyber/dashboard" element={<CyberDashboard />} />

            {/* Main App Routes (With navbar) */}
            <Route
              path="/*"
              element={
                <>
                  <Navbar />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/login" element={
                        user ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />
                      } />
                      <Route path="/" element={<HomePage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                  <footer className="bg-gray-800 text-white py-8">
                    <div className="max-w-7xl mx-auto px-4 text-center">
                      <p className="text-gray-400 notranslate" translate="no">© 2026 Nyaya-AI Legal Assistant. All rights reserved.</p>
                    </div>
                  </footer>
                </>
              }
            />
          </Routes>
          </Suspense>
          {/* Modal is rendered at root level to overlay everything */}
          <EmergencyReportModal
            isOpen={isEmergencyOpen}
            onClose={() => setIsEmergencyOpen(false)}
            userPhone={user?.phone}
          />
        </div>
      </LocationProvider>
    </TTSProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
