import axios from 'axios';
import FormData from 'form-data';

async function testAnalysis() {
    try {
        const formData = new FormData();
        formData.append('prompt', 'I noticed unauthorized transactions from my bank account.');
        formData.append('location', 'Gudlavalleru, Andhra Pradesh, 521356');
        formData.append('userPhone', '9876543210');

        console.log("Sending request...");
        const response = await axios.post('http://localhost:5000/api/cases/analyze', formData, {
            headers: formData.getHeaders()
        });
        console.log("SUCCESS:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error("ERROR from server:");
            console.error(JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("ERROR:", err.message);
        }
    }
}

testAnalysis();
