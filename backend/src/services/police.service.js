export const getNearbyPoliceStations = (location) => {
    const baseLocation = typeof location === 'string'
        ? location.split(',')[0].trim()
        : '';

    return [{
        id: 'nearest-police-station',
        name: baseLocation
            ? `Police Station near ${baseLocation}`
            : 'Police Station near your location',
        specialty: 'General Jurisdiction',
        type: 'Local'
    }];
};
