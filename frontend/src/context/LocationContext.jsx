import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Loader2, Search, X } from 'lucide-react';

const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

const locationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
};

export const LocationProvider = ({ children }) => {
    const [locationStr, setLocationStr] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [coords, setCoords] = useState(null);
    const [locationAccuracy, setLocationAccuracy] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const locationRequestIdRef = useRef(0);
    const updateManualMode = (enabled) => {
        if (enabled) {
            locationRequestIdRef.current++;
            setIsLoadingLocation(false);
        }
        setIsManualMode(enabled);
    };

    const fetchLocation = useCallback(async () => {
        const requestId = ++locationRequestIdRef.current;
        setIsLoadingLocation(true);
        setLocationError('');
        setIsManualMode(false);
        setCoords(null);
        setLocationAccuracy(null);

        if (!navigator.geolocation) {
            setLocationError('This browser does not support device location. Enter your location manually.');
            setShowBanner(true);
            setIsLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                if (requestId !== locationRequestIdRef.current) return;

                const { latitude, longitude, accuracy } = position.coords;
                setCoords({ latitude, longitude });
                setLocationAccuracy(Math.round(accuracy));
                const isApproximate = accuracy > 1000;

                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Reverse geocoder returned ${response.status}`);
                    const data = await response.json();
                    if (requestId !== locationRequestIdRef.current) return;

                    const address = data?.address;
                    const locality = address?.village || address?.hamlet ||
                        address?.town || address?.city || address?.municipality ||
                        address?.suburb || address?.neighbourhood || '';
                    const city = address?.city || address?.town ||
                        address?.municipality || address?.county ||
                        address?.state_district || '';
                    const parts = [
                        address?.road,
                        locality,
                        city,
                        address?.state,
                        address?.postcode
                    ].filter(Boolean);
                    const locationString = [...new Set(parts)].join(', ');
                    setLocationStr(locationString || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                } catch (error) {
                    if (requestId !== locationRequestIdRef.current) return;
                    console.error('Reverse geocoding failed:', error);
                    setLocationStr(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                }

                if (requestId === locationRequestIdRef.current) {
                    setLocationError(isApproximate
                        ? 'Device location is approximate. Verify it or enter your location manually.'
                        : '');
                    setShowBanner(isApproximate);
                    setIsLoadingLocation(false);
                }
            },
            (error) => {
                if (requestId !== locationRequestIdRef.current) return;
                let message;
                switch (error.code) {
                    case 1:
                        message = 'Location permission was denied. Allow location access or enter your location manually.';
                        break;
                    case 2:
                        message = 'Location information is unavailable. Check your device location settings or enter your location manually.';
                        break;
                    case 3:
                        message = 'Device location timed out after 10 seconds. Try again or enter your location manually.';
                        break;
                    default:
                        message = 'An unknown location error occurred. Try again or enter your location manually.';
                }
                setLocationError(message);
                setShowBanner(true);
                setIsLoadingLocation(false);
            },
            // High accuracy requests the best fix the browser can provide; it cannot force GPS hardware.
            locationOptions
        );
    }, []);

    const searchLocation = async (query) => {
        if (!query || query.length < 3) return;
        setIsLoadingLocation(true);
        setLocationError('');
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Location search returned ${res.status}`);
            const data = await res.json();
            setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Search error:", err);
            setLocationError("Search failed. Please try again.");
            setSearchResults([]);
        } finally {
            setIsLoadingLocation(false);
        }
    };

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
        setLocationAccuracy(null);
        setLocationError('');
        setIsManualMode(false);
        setSearchQuery('');
        setSearchResults([]);
        setShowBanner(false);
    };

    // Initial attempt on mount
    useEffect(() => {
        // Do not reuse per-browser saved locations; they may be stale or differ between profiles.
        fetchLocation();
    }, [fetchLocation]);

    return (
        <LocationContext.Provider value={{
            locationStr,
            isLoadingLocation,
            locationError,
            coords,
            locationAccuracy,
            isManualMode,
            setIsManualMode: updateManualMode,
            searchLocation,
            searchResults,
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
                                {coords ? 'Location Needs Verification' : 'Location Access Required'}
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
                                    onKeyDown={(e) => e.key === 'Enter' && searchLocation(searchQuery)}
                                />
                                <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                                <button
                                    onClick={() => searchLocation(searchQuery)}
                                    className="absolute right-2 top-2 bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-bold mt-0.5"
                                >
                                    Search
                                </button>
                            </div>

                            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                                {isLoadingLocation && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-600" /></div>}
                                {searchResults.map((res) => (
                                    <button
                                        key={res.place_id}
                                        onClick={() => selectLocation(res)}
                                        className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl border border-transparent hover:border-indigo-100 transition-all flex items-start gap-3"
                                    >
                                        <MapPin className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                                        <span className="text-sm font-medium text-gray-700">{res.display_name}</span>
                                    </button>
                                ))}
                                {!isLoadingLocation && searchQuery.length > 2 && searchResults.length === 0 && (
                                    <p className="text-center text-gray-400 py-4 text-sm">No results found. Try searching for a district or city.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {children}
        </LocationContext.Provider>
    );
};
