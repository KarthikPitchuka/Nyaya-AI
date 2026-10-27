# Nyaya-AI backend

## Run locally

Copy `.env.example` to `.env`, set the required AI credentials, and start MongoDB if case history should be saved. Run `npm install` and `npm run dev` from this directory.

## Grounding answers in Central Acts

Set `CENTRAL_ACTS_DIR` to the directory containing the Central Acts JSON files. The API reads these files locally, builds an in-memory section search index on the first legal-analysis request, and supplies the closest passages to the AI. It returns the consulted Act/section references and displays them with the analysis.

Set `GEMINI_API_KEY` or `GEMINI_API_KEYS` to a Gemini API key from Google AI Studio. Do not use a Google OAuth access token, Firebase key, service-account credential, or other Google credential in these variables. The default model and automatic fallback are `gemini-2.5-flash`; if a configured model returns a high-demand/unavailable response, the API retries once with the fallback. Set `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL` only to models enabled for your key/project. Invalid credentials and unavailable models are reported separately from rate limits.

For the supplied local collection, set:

```dotenv
CENTRAL_ACTS_DIR=/home/karthik/Downloads/annotatedCentralActs
```

The dataset is not copied into or committed with this repository. The collection may not reflect the latest amendments, repeals, or commencement notifications; matching passages are evidence for review, not confirmation that a provision currently applies. Confirm important advice against current official sources or with a qualified lawyer.

The separate `GOOGLE_GEOLOCATION_API_KEY` setting is for Google's Geolocation API. It must not be populated with a Gemini key.

## Authentication and report access

Set `FIREBASE_PROJECT_ID` to the Firebase project used by the frontend. Locally, the frontend and backend can use the Firebase Auth Emulator; configure `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` for the backend as well. In production, the backend must use Application Default Credentials or a service account available to the runtime; never commit service-account credentials.

Emergency report submission and the personal report list require a valid Firebase ID token in the `Authorization: Bearer <token>` header. The server uses the verified Firebase UID and phone number; it does not trust identity fields supplied in the request body. The development-only hardcoded OTP fallback is not a verified identity and cannot access these routes.

Cyber Portal registration is restricted by `CYBER_ALLOWED_EMAILS` (comma-separated exact email addresses) and `CYBER_REGISTRATION_CODE`. New registrations are always assigned the `Agent` role; create or promote supervisors/admins through a trusted administrative process, not the public registration form. Set `JWT_SECRET` to a random secret of at least 32 bytes before enabling official login. Do not use the sample value in `.env.example`.

Set `TOTP_ENC_KEY` to a random 32-byte key encoded as base64 before enabling authenticator setup. If the key is absent or malformed, TOTP setup fails instead of storing the secret in plaintext. Existing TOTP secrets stored with the old `plain:` format must be reset after configuring the encryption key.

Official dashboard report listing and updates require the signed Cyber Portal bearer token. Personal report listing is scoped to the Firebase UID on the server. The older public status-by-case route remains for the user-facing case workflow.
