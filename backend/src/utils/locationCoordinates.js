export const parseLocationCoordinates = (body) => {
    const {
        locationLatitude,
        locationLongitude,
        locationAccuracy
    } = body;

    if (locationLatitude === undefined && locationLongitude === undefined) {
        return null;
    }

    const latitude = Number(locationLatitude);
    const longitude = Number(locationLongitude);
    const accuracy = locationAccuracy === undefined ? null : Number(locationAccuracy);

    if (
        locationLatitude === undefined ||
        locationLongitude === undefined ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0))
    ) {
        return false;
    }

    return {
        latitude,
        longitude,
        ...(accuracy !== null ? { accuracy } : {})
    };
};
