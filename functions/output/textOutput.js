// textOutput.js

export async function generateTextOutput(apiKey, inputText) {
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");
    const downloadButton = document.getElementById("downloadImage");
    const output3D = document.getElementById("output3D");

    const endpoint = "https://api.openai.com/v1/chat/completions";
    console.log("Generating text output");

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: inputText }],
                max_tokens: 200
            })
        });

        const result = await response.json();
        console.log("API response received:", result);

        if (result.choices?.[0]?.message?.content) {
            outputBox.value = result.choices[0].message.content.trim();
            outputBox.classList.remove("hidden");
            outputImage.classList.add("hidden");
            downloadButton.classList.add("hidden");
            output3D.classList.add("hidden");
            console.log("Text output displayed");
        } else {
            outputBox.value = "Error: No valid response from API.";
            outputBox.classList.remove("hidden");
            console.error("Invalid API response:", result);
        }
    } catch (error) {
        console.error("Error generating text:", error);
        outputBox.value = "Error generating output: " + error.message;
        outputBox.classList.remove("hidden");
    }
}
