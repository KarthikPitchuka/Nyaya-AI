export const getNearbyPoliceStations = (location, caseType) => {
    // Determine the base location string to use in the station names
    let baseLoc = "Local Area";
    if (location && typeof location === 'string') {
        const parts = location.split(',');
        baseLoc = parts[0].trim();
        // Fallback if the first part is missing or too unspecific
        if (!baseLoc) baseLoc = "Your Area";
    }

    let stations = [];
    const typeLower = (caseType || "").toLowerCase();

    // 1. Add specialized stations based on the case type
    if (typeLower.includes('cyber') || typeLower.includes('online fraud') || typeLower.includes('hacking')) {
        stations.push({
            id: 1,
            name: `Cyber Crime Police Station, ${baseLoc}`,
            distance: "1.2 km",
            contact: "1930",
            specialty: "Cyber Crime Investigation",
            type: "Specialized"
        });
    } else if (typeLower.includes('women') || typeLower.includes('domestic') || typeLower.includes('harassment') || typeLower.includes('assault')) {
        stations.push({
            id: 1,
            name: `Mahila (Women) Police Station, ${baseLoc}`,
            distance: "2.4 km",
            contact: "1091",
            specialty: "Women & Child Protection",
            type: "Specialized"
        });
    } else if (typeLower.includes('economic') || typeLower.includes('fraud') || typeLower.includes('scam') || typeLower.includes('property')) {
        stations.push({
            id: 1,
            name: `Economic Offences Wing (EOW), ${baseLoc}`,
            distance: "3.5 km",
            contact: "Local Control Room",
            specialty: "Financial & Property Fraud",
            type: "Specialized"
        });
    }

    // 2. Always add the nearest local general police station
    stations.push({
        id: 2,
        name: `${baseLoc} Local Police Station`,
        distance: "0.8 km",
        contact: "100 / 112",
        specialty: "General Jurisdiction",
        type: "Local"
    });

    // 3. Add the District Headquarters as an escalation point
    stations.push({
        id: 3,
        name: `District Police Headquarters, ${baseLoc}`,
        distance: "4.1 km",
        contact: "011-23456789", // Mock contact
        specialty: "Superintendent of Police",
        type: "Headquarters"
    });

    // Return the top 3 most relevant stations
    return stations.slice(0, 3);
};
