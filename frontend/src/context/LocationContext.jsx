import React, { createContext, useContext, useState, useEffect } from 'react';
import { MapPin, AlertCircle, Loader2, Search, X } from 'lucide-react';

const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
    const [locationStr, setLocationStr] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [coords, setCoords] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const fetchLocation = async (triggeredByUser = false) => {
        setIsLoadingLocation(true);
        setLocationError('');
        setIsManualMode(false);

        const tryBackendIpLocation = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/geolocation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success && data.best && data.best.location) {
                    setLocationStr(data.best.location);
                    localStorage.setItem('nyaya_user_location', data.best.location);
                    if (data.best.lat && data.best.lng) {
                        setCoords({ latitude: data.best.lat, longitude: data.best.lng });
                    }
                    setShowBanner(false);
                    return true;
                }
            } catch (err) {
                console.error("Backend IP Geolocation fallback failed:", err);
            }
            return false;
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoords({ latitude, longitude });

                    try {
                        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
                        const res = await fetch(url);
                        const data = await res.json();

                        if (data && data.address) {
                            const addr = data.address;
                            const parts = [
                                addr.building || addr.amenity || addr.road || addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.town || '',
                                addr.city || addr.county || addr.state_district || '',
                                addr.state || '',
                                addr.postcode || ''
                            ].filter(Boolean);

                            const locationString = [...new Set(parts)].join(', ');
                            setLocationStr(locationString);
                            localStorage.setItem('nyaya_user_location', locationString);
                            setLocationError('');
                            setShowBanner(false);
                            setIsLoadingLocation(false);
                            return;
                        }
                    } catch (err) {
                        console.error("Live GPS reverse geocoding failed:", err);
                    }

                    const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setLocationStr(fallback);
                    localStorage.setItem('nyaya_user_location', fallback);
                    setShowBanner(false);
                    setIsLoadingLocation(false);
                },
                async (error) => {
                    console.log("Live GPS failed or denied, trying IP location fallback...", error.message);
                    const success = await tryBackendIpLocation();
                    setIsLoadingLocation(false);

                    if (!success) {
                        let msg = "Location Error";
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                msg = "Location access denied. Click 'Enter Manually' to select your location.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                msg = "Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                msg = "Location request timed out.";
                                break;
                            default:
                                msg = "An unknown error occurred.";
                                break;
                        }
                        setLocationError(msg);
                        setShowBanner(true);
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            const success = await tryBackendIpLocation();
            setIsLoadingLocation(false);
            if (!success) {
                setLocationError("Geolocation is not supported by your browser.");
                setShowBanner(true);
            }
        }
    };

    const searchLocation = async (query) => {
        if (!query || query.length < 3) return;
        setIsLoadingLocation(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
            const res = await fetch(url);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error("Search error:", err);
            setLocationError("Search failed. Please try again.");
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const selectLocation = (result) => {
        const name = result.display_name;
        // Clean up the name (take first few parts)
        const parts = name.split(',').slice(0, 4).join(',').trim();
        setLocationStr(parts);
        localStorage.setItem('nyaya_user_location', parts);
        setCoords({ latitude: result.lat, longitude: result.lon });
        setIsManualMode(false);
        setSearchQuery('');
        setSearchResults([]);
        setShowBanner(false);
    };

    // Initial attempt on mount
    useEffect(() => {
        const savedLocation = localStorage.getItem('nyaya_user_location');
        if (savedLocation) {
            setLocationStr(savedLocation);
        }
        // Always trigger fresh detection on launch so all browsers show the real live location
        fetchLocation(false);
    }, []);

    return (
        <LocationContext.Provider value={{
            locationStr,
            isLoadingLocation,
            locationError,
            coords,
            isManualMode,
            setIsManualMode,
            searchLocation,
            searchResults,
            selectLocation,
            refreshLocation: () => {
                localStorage.removeItem('nyaya_user_location');
                fetchLocation(true);
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
                            <p className="font-bold text-sm">Location Access Required</p>
                            <p className="text-xs text-indigo-100">
                                {locationError || "We need your location to help authorities reach you faster in case of a scam or emergency."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsManualMode(true)}
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
                                'Enable Location Now'
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
                            <button onClick={() => setIsManualMode(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
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
