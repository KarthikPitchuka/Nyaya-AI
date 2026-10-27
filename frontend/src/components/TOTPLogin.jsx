import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function TOTPLogin({ onLoginSuccess }) {
  const [step, setStep] = useState('email'); // 'email' | 'qr' | 'verify'
  const [email, setEmail] = useState('');
  const [qr, setQr] = useState(null);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetupClick = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/totp/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.success) {
        setQr(data.data.qr);
        setStep('qr');
      } else {
        setError(data.message || 'Failed to setup TOTP');
      }
    } catch (err) {
      setError('Request failed: ' + (err.message || 'Unknown error'));
    }
    setIsLoading(false);
  };

  const handleVerifyClick = async (e) => {
    e.preventDefault();
    setError('');
    if (!token || token.length !== 6) {
      setError('Enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/totp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });
      const data = await res.json();

      if (data.success) {
        // Pass session token or user data to parent
        if (onLoginSuccess) {
          onLoginSuccess({ 
            method: 'totp', 
            email, 
            token: data.data.token 
          });
        }
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Request failed: ' + (err.message || 'Unknown error'));
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-indigo-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Authenticator Login</h2>
      </div>

      {step === 'email' && (
        <form onSubmit={handleSetupClick}>
          <p className="text-gray-600 text-sm mb-4">
            Use an authenticator app (Google Authenticator, Authy) for secure login.
          </p>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            required
          />
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            {isLoading ? 'Setting up...' : 'Next'}
          </button>
        </form>
      )}

      {step === 'qr' && (
        <div>
          <p className="text-gray-600 text-sm mb-4">
            Scan this QR code with your authenticator app, then enter the 6-digit code:
          </p>
          {qr && (
            <div className="text-center mb-4">
              <img src={qr} alt="TOTP QR Code" className="w-48 h-48 mx-auto border border-gray-300 p-2" />
            </div>
          )}
          <input
            type="text"
            placeholder="000000"
            value={token}
            onChange={(e) => setToken(e.target.value.slice(0, 6))}
            maxLength="6"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          <button
            onClick={handleVerifyClick}
            disabled={isLoading || token.length !== 6}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            {isLoading ? 'Verifying...' : 'Verify & Login'}
          </button>
          <button
            onClick={() => { setStep('email'); setQr(null); setToken(''); }}
            className="w-full mt-2 text-indigo-600 py-2 rounded-lg font-semibold hover:bg-indigo-50"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
