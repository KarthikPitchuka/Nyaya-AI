const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

export const API_BASE_URL = configuredApiBaseUrl || (
    import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin
);
