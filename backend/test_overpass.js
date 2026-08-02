import axios from 'axios';

async function test() {
    const lat = 16.3533; // Gudlavalleru approx
    const lon = 81.0425;
    const radius = 10000; // 10km

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json][timeout:25];
        (
            node["amenity"="police"](around:${radius},${lat},${lon});
            way["amenity"="police"](around:${radius},${lat},${lon});
            relation["amenity"="police"](around:${radius},${lat},${lon});
        );
        out center;
    `;

    try {
        const res = await axios.post(overpassUrl, query, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log("Found:", res.data.elements.length);
        if (res.data.elements.length > 0) {
            console.log(JSON.stringify(res.data.elements[0], null, 2));
        }
    } catch (e) {
        console.error(e.message);
    }
}
test();
