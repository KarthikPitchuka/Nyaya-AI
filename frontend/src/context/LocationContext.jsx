import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

const locationOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
};

const isSecureLocationContext = () => (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
);

const getPermissionState = async () => {
    if (!navigator.permissions?.query) return null;

    try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
    } catch {
        return null;
    }
};

const getAddressParts = (address = {}) => {
    const city = address.city || address.town || address.municipality ||
        address.village || address.county || address.state_district || '';
    const state = address.state || address.region || '';
    const country = address.country || '';
    const locality = address.village || address.town || address.city ||
        address.municipality || address.suburb || address.neighbourhood || '';

    return {
        city,
        state,
        country,
        locality,
        location: [...new Set([
            address.road,
            locality,
            city,
            state,
            address.postcode,
            country
        ].filter(Boolean))].join(', ')
    };
};

export const LocationProvider = ({ children }) => {
    const [locationStr, setLocationStr] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [coords, setCoords] = useState(null);
    const [locationAccuracy, setLocationAccuracy] = useState(null);
    const [locationDetails, setLocationDetails] = useState(null);
    const [showBanner, setShowBanner] = useState(true);
    const [isManualMode, setIsManualMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRequestIdRef = useRef(0);
    const locationRequestIdRef = useRef(0);
    const updateManualMode = (enabled) => {
        if (enabled) {
            locationRequestIdRef.current++;
            setIsLoadingLocation(false);
        }
        setIsManualMode(enabled);
    };

    const applyLocation = useCallback((location, requestId) => {
        if (requestId !== locationRequestIdRef.current) return false;

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('Location provider returned invalid coordinates.');
        }

        setCoords({ latitude, longitude });
        setLocationAccuracy(Number.isFinite(Number(location.accuracy))
            ? Math.round(Number(location.accuracy))
            : null);
        setLocationDetails({
            latitude,
            longitude,
            city: location.city || '',
            state: location.state || '',
            country: location.country || '',
            accuracy: Number.isFinite(Number(location.accuracy))
                ? Math.round(Number(location.accuracy))
                : null,
            source: location.source || 'browser'
        });
        setLocationStr(location.location || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        return true;
    }, []);

    const reverseGeocode = useCallback(async (latitude, longitude, requestId) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 6000);

        try {
            const response = await fetch(`${API_BASE_URL}/api/geolocation/reverse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude }),
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Reverse geocoder returned ${response.status}`);
            const data = await response.json();
            if (requestId !== locationRequestIdRef.current) return;

            const address = getAddressParts(data.address);
            setLocationDetails((current) => ({
                ...current,
                city: address.city,
                state: address.state,
                country: address.country,
                addressResolved: Boolean(address.location),
                source: 'browser'
            }));
            setLocationStr(address.location || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
            window.clearTimeout(timeoutId);
        }
    }, []);

    const fetchLocation = useCallback(async () => {
        const requestId = ++locationRequestIdRef.current;
        setIsLoadingLocation(true);
        setLocationError('');
        setIsManualMode(false);
        setIsResolvingAddress(false);
        setCoords(null);
        setLocationAccuracy(null);
        setLocationDetails(null);

        try {
            let failureMessage = 'Device location could not be determined.';
            const permissionState = await getPermissionState();

            if (!isSecureLocationContext()) {
                failureMessage = 'Precise device location requires HTTPS or localhost.';
            } else if (permissionState === 'denied') {
                failureMessage = 'Location permission is blocked for this site. Allow it in browser settings to use precise location.';
            } else if (!navigator.geolocation) {
                failureMessage = 'This browser does not support precise device location.';
            } else {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, locationOptions);
                    });
                    if (requestId !== locationRequestIdRef.current) return;

                    const { latitude, longitude, accuracy } = position.coords;
                    applyLocation({
                        latitude,
                        longitude,
                        accuracy,
                        location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    }, requestId);

                    setIsResolvingAddress(true);
                    try {
                        await reverseGeocode(latitude, longitude, requestId);
                    } catch (error) {
                        console.warn('Reverse geocoding failed; coordinates are still available:', error);
                        if (requestId === locationRequestIdRef.current) {
                            setLocationDetails((current) => ({ ...current, addressResolved: false }));
                            setLocationError('Location detected, but the address could not be resolved. Coordinates are shown.');
                        }
                    } finally {
                        if (requestId === locationRequestIdRef.current) setIsResolvingAddress(false);
                    }

                    if (requestId === locationRequestIdRef.current) {
                        const isApproximate = accuracy > 1000;
                        setLocationError(isApproximate
                            ? 'Device location is approximate. Verify it or use manual location selection.'
                            : '');
                        setShowBanner(isApproximate);
                        setIsLoadingLocation(false);
                    }
                    return;
                } catch (error) {
                    failureMessage = error.code === 1
                        ? 'Location permission was denied. Allow it in browser settings for precise location.'
                        : error.code === 3
                            ? 'Device location timed out after 8 seconds.'
                            : error.code === 2
                                ? 'Device location is unavailable. Check GPS and device location settings.'
                                : 'Device location failed unexpectedly.';
                }
            }

            if (requestId === locationRequestIdRef.current) {
                setLocationError(failureMessage + ' No approximate IP location will be shown.');
                setCoords(null);
                setLocationAccuracy(null);
                setLocationDetails(null);
                setLocationStr('');
            }
        } catch (error) {
            if (requestId !== locationRequestIdRef.current) return;
            console.error('Location detection failed:', error);
            setLocationError('Unable to determine your location automatically. Please enter it manually.');
        } finally {
            if (requestId === locationRequestIdRef.current) {
                setShowBanner(true);
                setIsLoadingLocation(false);
            }
        }
    }, [applyLocation, reverseGeocode]);

    const searchLocation = useCallback(async (query) => {
        const requestId = ++searchRequestIdRef.current;
        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 3) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setLocationError('');
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery)}&countrycodes=in&limit=5`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Location search returned ${res.status}`);
            const data = await res.json();
            if (requestId === searchRequestIdRef.current) {
                setSearchResults(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Search error:", err);
            if (requestId === searchRequestIdRef.current) {
                setLocationError("Search failed. Please try again.");
                setSearchResults([]);
            }
        } finally {
            if (requestId === searchRequestIdRef.current) {
                setIsSearching(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!isManualMode) return undefined;

        const timer = window.setTimeout(() => {
            searchLocation(searchQuery);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [isManualMode, searchLocation, searchQuery]);

    const selectLocation = (result) => {
        locationRequestIdRef.current++;
        const name = result.display_name;
        // Clean up the name (take first few parts)
        const parts = name.split(',').slice(0, 4).join(',').trim();
        setLocationStr(parts);
        setCoords({
            latitude: Number(result.lat),
            longitude: Number(result.lon)
        });
        const address = getAddressParts(result.address);
        setLocationDetails({
            latitude: Number(result.lat),
            longitude: Number(result.lon),
            city: address.city,
            state: address.state,
            country: address.country,
            accuracy: null,
            source: 'manual',
            addressResolved: Boolean(address.location)
        });
        setLocationAccuracy(null);
        setLocationError('');
        setIsManualMode(false);
        setSearchQuery('');
        setSearchResults([]);
        searchRequestIdRef.current++;
        setShowBanner(false);
    };

    return (
        <LocationContext.Provider value={{
            locationStr,
            isLoadingLocation,
            locationError,
            coords,
            locationAccuracy,
            locationDetails,
            locationStatus: isLoadingLocation
                ? 'requesting'
                : isResolvingAddress
                    ? 'address-lookup'
                    : coords
                        ? (locationDetails?.addressResolved === false ? 'address-unavailable' : 'detected')
                        : locationError
                            ? (locationError.includes('denied') ? 'permission-denied' : locationError.includes('timed out') ? 'timeout' : 'unavailable')
                            : 'access-required',
            isManualMode,
            setIsManualMode: updateManualMode,
            searchLocation,
            searchResults,
            isSearching,
            selectLocation,
            refreshLocation: () => {
                fetchLocation();
            }
        }}>
            {/* 📍 Sticky Location Permission Banner */}
            {showBanner && !isManualMode && (
                <div className="bg-indigo-600 text-white py-3 px-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-[100] animate-in fade-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <MapPin className="h-5 w-5 animate-bounce" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">
                                {isLoadingLocation ? 'Requesting Location' : coords ? 'Location Detected' : 'Location Access Required'}
                            </p>
                            <p className="text-xs text-indigo-100">
                                {locationError || "We need your location to help authorities reach you faster in case of a scam or emergency."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateManualMode(true)}
                            className="text-white border border-white/30 hover:bg-white/10 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            Enter Manually
                        </button>
                        <button
                            onClick={() => fetchLocation(true)}
                            disabled={isLoadingLocation}
                            className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-black text-sm hover:bg-indigo-50 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                            {isLoadingLocation ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Detecting...
                                </>
                            ) : (
                                coords ? 'Refresh Location' : 'Enable Location Now'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* 🔍 Manual Location Search Modal Overlay */}
            {isManualMode && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">Set Your Location Manually</h3>
                            <button onClick={() => updateManualMode(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search your city or district (e.g. Gudlavalleru)"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchResults[0]) {
                                            e.preventDefault();
                                            selectLocation(searchResults[0]);
                                        }
                                    }}
                                />
                                <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                            </div>

                            {(isSearching || searchQuery.trim().length >= 3) && (
                                <div
                                    className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                                    role="listbox"
                                    aria-label="Location suggestions"
                                >
                                        {isSearching && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-600" /></div>}
                                        {searchResults.map((res) => (
                                            <button
                                                key={res.place_id}
                                                onClick={() => selectLocation(res)}
                                                className="w-full text-left p-3 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-all flex items-start gap-3"
                                                role="option"
                                            >
                                                <MapPin className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                                                <span className="text-sm font-medium text-gray-700">{res.display_name}</span>
                                            </button>
                                        ))}
                                        {!isSearching && searchQuery.trim().length >= 3 && searchResults.length === 0 && (
                                            <p className="text-center text-gray-400 py-4 text-sm">No results found. Try searching for a district or city.</p>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {children}
        </LocationContext.Provider>
    );
};
