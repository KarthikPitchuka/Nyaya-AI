import React, { useState } from 'react';
import LoginPage from './LoginPage';
import TOTPLogin from '../components/TOTPLogin';

export default function UnifiedLoginPage({ onLogin }) {
  const [method, setMethod] = useState(null); // 'firebase' | 'totp'

  const handleFirebaseLogin = (user) => {
    console.log('Firebase login:', user);
    if (onLogin) onLogin(user);
  };

  const handleTOTPLogin = (user) => {
    console.log('TOTP login:', user);
    if (onLogin) onLogin(user);
  };

  if (method === 'firebase') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div>
          <button 
            onClick={() => setMethod(null)}
            className="mb-4 text-indigo-600 hover:underline"
          >
            ← Back to login options
          </button>
          <LoginPage onLogin={handleFirebaseLogin} />
        </div>
      </div>
    );
  }

  if (method === 'totp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div>
          <button 
            onClick={() => setMethod(null)}
            className="mb-4 text-indigo-600 hover:underline"
          >
            ← Back to login options
          </button>
          <TOTPLogin onLoginSuccess={handleTOTPLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nyaya-AI</h1>
          <p className="text-gray-600">Choose your login method</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMethod('firebase')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            📱 Phone Number (Firebase)
          </button>
          <button
            onClick={() => setMethod('totp')}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all"
          >
            🔐 Authenticator App (TOTP)
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Phone auth uses Firebase emulator (dev mode).</p>
          <p className="mt-1">TOTP requires an existing account.</p>
        </div>
      </div>
    </div>
  );
}
