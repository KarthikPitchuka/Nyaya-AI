# Nyaya-AI Local Authentication Setup

## Quick Start

### 1. Start Firebase Emulator (for phone auth)
```bash
firebase emulators:start --only auth,firestore
```
- Auth emulator: http://127.0.0.1:9099
- Firestore emulator: 127.0.0.1:8080
- UI: http://127.0.0.1:4000

### 2. Start Backend
```bash
cd backend
npm install  # if needed
node server.js
```
Backend API runs on http://localhost:5000

### 3. Start Frontend
```bash
cd frontend
npm install  # if needed
npm run dev
```
Frontend runs on http://localhost:5173

---

## Authentication Methods

### Method A: Firebase Phone Auth (Emulator)
- **Endpoint**: `/` (LoginPage component)
- **No cost**: Uses local emulator, no SMS charges
- **Test Flow**:
  1. Enter any phone number (e.g., +919876543210)
  2. Click "Send OTP"
  3. OTP prints to **backend console**
  4. Enter OTP, verify
  5. Success!

### Method B: TOTP (Authenticator App)
- **Endpoint**: `/auth/totp/setup` and `/auth/totp/verify`
- **No cost**: Fully free, authenticator app only
- **Setup Flow**:
  1. Register user first:
     ```bash
     curl -X POST http://localhost:5000/api/cyber/auth/register \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"Pass123!","name":"Test User"}'
     ```
  2. Setup TOTP:
     ```bash
     curl -X POST http://localhost:5000/api/auth/totp/setup \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com"}'
     ```
  3. Response includes `qr` (data-URL) and `otpauth_url`
  4. Scan QR with Google Authenticator, Authy, or Microsoft Authenticator
  5. Get 6-digit code from app
  6. Verify:
     ```bash
     curl -X POST http://localhost:5000/api/auth/totp/verify \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","token":"123456"}'
     ```

---

## Frontend Components

- **`src/pages/UnifiedLoginPage.jsx`** — Choose between Firebase SMS or TOTP
- **`src/components/TOTPLogin.jsx`** — TOTP authenticator flow UI
- **`src/components/TOTPSetup.jsx`** — Setup QR display (dev/admin tool)

---

## Environment Setup

### Backend `.env` (already configured)
```
PORT=5000
GEMINI_API_KEY=...
MONGODB_URI=mongodb://localhost:27017/nyaya_ai
TOTP_ENC_KEY=<base64-32-bytes>  # Optional, defaults to ENCRYPTION_KEY
JWT_SECRET=<your-jwt-secret>
NODE_ENV=development
```

Generate a TOTP encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Frontend `.env`
- Uses `NODE_ENV=development` by default to connect to Firebase emulator

---

## Testing Flow (Complete)

### Option 1: Use UnifiedLoginPage (Recommended)
1. Navigate to `http://localhost:5173/` (or add UnifiedLoginPage to your router)
2. Click "Phone Number" for Firebase SMS (emulator)
   - Or click "Authenticator App" for TOTP
3. Complete the flow

### Option 2: Command Line (Testing TOTP)
```bash
# 1. Register a user
curl -X POST http://localhost:5000/api/cyber/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@nyaya.ai","password":"Demo@123","name":"Demo User"}'

# 2. Setup TOTP
curl -X POST http://localhost:5000/api/auth/totp/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@nyaya.ai"}'

# 3. Note the QR code URL from response, scan with authenticator app, get 6-digit code

# 4. Verify with code (replace XXXXXX with actual code)
curl -X POST http://localhost:5000/api/auth/totp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@nyaya.ai","token":"XXXXXX"}'
```

---

## Cost Comparison

| Method | Cost | Setup | Reliability |
|--------|------|-------|------------|
| Firebase SMS (production) | $0.015 - $0.10 per SMS | Billing required | High |
| Firebase Phone Auth (emulator) | $0.00 | Free, local | High (dev only) |
| TOTP (Authenticator app) | $0.00 | Free | High |
| Email OTP | $0.00 - varies | Free tier available | Medium (email latency) |

---

## Next Steps

- [ ] Integrate UnifiedLoginPage into your main router
- [ ] Test both auth flows locally
- [ ] Add TOTP disable/recovery code endpoints
- [ ] Deploy Firebase emulator config to staging/production setup docs
- [ ] Monitor Gemini API quota and implement caching/fallback as needed

---

## Troubleshooting

**Firebase emulator not connecting?**
- Ensure emulator is running: `firebase emulators:start`
- Check ports 9099 (auth) and 8080 (firestore) are free
- Frontend logs should show emulator connection attempt

**TOTP setup fails: "User not found"**
- Register user first via `/api/cyber/auth/register`

**TOTP code always invalid?**
- Ensure device time is synced (TOTP uses system time)
- Check authenticator app has correct secret

**Backend won't start?**
- MongoDB must be running: `mongod`
- Check `.env` file has valid values
- Verify port 5000 is free

---
