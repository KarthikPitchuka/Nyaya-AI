import axios from 'axios';

async function test() {
    const loc = "Gudlavalleru, Andhra Pradesh";
    const q = encodeURIComponent(`police station near ${loc}`);
    console.log(q);
    try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3`, {
            headers: { 'User-Agent': 'NyayaAI/1.0' }
        });
        console.log("Result 1:", JSON.stringify(res.data, null, 2));

        // alternative 
        const res2 = await axios.get(`https://nominatim.openstreetmap.org/search?amenity=police&city=Gudlavalleru&format=json&limit=3`, {
            headers: { 'User-Agent': 'NyayaAI/1.0' }
        });
        console.log("Result 2:", JSON.stringify(res2.data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
test();
