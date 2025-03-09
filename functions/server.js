const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ZOOCAD_API_URL = "https://zoo.dev/api/text-to-cad"; // Hypothetical endpoint

app.post("/api/text-to-cad", async (req, res) => {
    try {
        const { prompt, apiKey } = req.body;
        
        const response = await axios.post(ZOOCAD_API_URL, {
            prompt: prompt,
            api_key: apiKey
        });

        res.json({ model_url: response.data.model_url });

    } catch (error) {
        console.error("Error fetching 3D model from ZooCAD:", error);
        res.status(500).json({ error: "Failed to generate 3D model" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
