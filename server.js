const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS

const PORT = 5000; // Choose any available port

// Proxy Route for KittyCAD
app.post("/api/text-to-cad", async (req, res) => {
    const { prompt, apiKey } = req.body; // Get data from frontend

    if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
    }

    try {
        const response = await axios.post(
            "https://api.kittycad.io/v1/text-to-cad",  // ✅ Corrected API URL
            {
                prompt: prompt,
                output_format: "obj"
            },
            {
                headers: { 
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("KittyCAD API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch from KittyCAD API" });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy Server running on http://localhost:${PORT}`);
});

app.use(cors({
    origin: 'http://localhost:3000', // Replace with your frontend URL
    credentials: true
}));