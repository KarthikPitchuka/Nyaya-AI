import React, { useState } from 'react';

export default function TOTPSetup() {
  const [email, setEmail] = useState('');
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setQr(data.data.qr);
      } else {
        setMsg(data.message || 'Failed');
      }
    } catch (e) {
      setMsg('Request failed');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">TOTP Setup (Authenticator)</h3>
      <input className="border p-2 rounded w-full mb-2" value={email} onChange={e => setEmail(e.target.value)} placeholder="user email" />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={handleSetup} disabled={loading || !email}>
        {loading ? 'Loading...' : 'Generate QR'}
      </button>
      {msg && <div className="mt-2 text-red-600">{msg}</div>}
      {qr && (
        <div className="mt-4">
          <div>Scan this QR with your authenticator app:</div>
          <img src={qr} alt="TOTP QR" />
        </div>
      )}
    </div>
  );
}
