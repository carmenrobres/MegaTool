document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('analyze3DPrint')?.addEventListener('click', analyze3DPrint);
});

async function analyze3DPrint() {
    const fileInput = document.getElementById('objUpload');
    const loadingMessage = document.getElementById('loading3DPrint');
    const outputBox = document.getElementById('printInstructions');
    const apiKey = document.getElementById('apiKey').value;

    if (!apiKey) {
        alert("❌ Please enter your OpenAI API Key in the sidebar.");
        return;
    }

    if (!fileInput.files.length) {
        alert("❌ Please upload an OBJ file first.");
        return;
    }

    const file = fileInput.files[0];

    // Read the file content
    const reader = new FileReader();
    reader.onload = async function(event) {
        const fileContent = event.target.result;

        // Ensure the file is not too large (trim if necessary)
        const truncatedContent = fileContent.substring(0, 10000); // First 10,000 characters

        loadingMessage.classList.remove('hidden');

        // GPT-4o Prompt
        const prompt = ` 
    I am preparing this OBJ file for 3D printing. Please analyze it and provide:

    ### **1. Model Integrity Check**
    - Is the model **watertight** (closed and without holes)?
    - Does it contain **non-manifold edges** or **floating elements**?
    - How many **faces (polygons) and vertices** does it have?

    ### **2. Dimensions & Scale**
    - What are the **bounding box dimensions (X, Y, Z)?**
    - Is the model **scaled correctly** for printing, or does it need adjustments?

    ### **3. Structural Analysis & Supports**
    - Are there **overhangs** that require supports? (Specify angles and locations)
    - What is the **best face to place on the print bed** to minimize supports and improve adhesion?
    - Are the **wall thicknesses sufficient** for printing? (Recommend a minimum based on nozzle size)

    ### **4. Recommended Slicing Settings**
    - **Layer height:** (Fine details vs. speed trade-off)
    - **Nozzle size:** (Default: 0.4mm, adjust if necessary)
    - **Infill percentage:** (Based on strength requirements)
    - **Support settings:** (Generate only if necessary)
    - **Adhesion type:** (Skirt, Brim, or Raft depending on model stability)

    ### **5. Material & Temperature Recommendations**
    - Best **filament type** (PLA, ABS, PETG, etc.) based on model features.
    - Suggested **printing temperature range**.
    - Recommended **bed temperature** and cooling settings.

    ### **6. Pre-export Checklist for STL**
    - Ensure **correct file scale** (check units in mm).
    - Verify model **integrity and repair any detected issues**.
    - Optimize **polygon count** if necessary to reduce slicing complexity.

    ---
    **Here is the start of the OBJ file:**
    \`\`\`
    ${truncatedContent}
    \`\`\`
    (Truncated if necessary for token limits)

    **Give clear and structured recommendations.**`;
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 500
                })
            });

            const result = await response.json();
            if (result.choices && result.choices.length > 0) {
                outputBox.value = result.choices[0].message.content.trim();
                outputBox.classList.remove('hidden');
            } else {
                outputBox.value = "⚠️ Error: Could not generate instructions.";
                outputBox.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Error:", error);
            outputBox.value = "⚠️ Error analyzing the file.";
            outputBox.classList.remove('hidden');
        } finally {
            loadingMessage.classList.add('hidden');
        }
    };

    reader.readAsText(file);
}

function captureModelScreenshot() {
    const canvas = document.getElementById("objCanvas");
    const imageDataUrl = canvas.toDataURL("image/png");

    const apiKey = document.getElementById("apiKey").value;
    const prompt = "Analyze this 3D model for 3D printing issues.";

    fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageDataUrl } }
                ]
            }],
            max_tokens: 500
        })
    }).then(response => response.json()).then(console.log);
}

