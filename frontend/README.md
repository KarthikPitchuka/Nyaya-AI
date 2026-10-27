# Nyaya-AI frontend

## Run locally

Start the API from the `backend` directory with `npm install` followed by `npm run dev`.
In a second terminal, start the frontend from this directory with `npm install` followed by `npm run dev`.

The frontend uses `http://localhost:5000` for the API while running in Vite development mode. For a separately hosted API, set `VITE_API_BASE_URL` to its origin before building. If the frontend and API are served from the same origin, the production default uses the current origin.

## Environment

Copy `.env.example` to `.env.local` to configure `VITE_API_BASE_URL`. Vite exposes variables prefixed with `VITE_` to the browser, so never put private API keys or credentials in this file.
