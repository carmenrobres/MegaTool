document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for output type change
    document.getElementById("outputType")?.addEventListener("change", handleOutputTypeChange);
    
    // Add event listener for generate button
    document.getElementById("generateOutput")?.addEventListener("click", generateOutput);

    // Add event listener for the download button
    document.getElementById("downloadImage")?.addEventListener("click", downloadGeneratedImage);
});

function handleOutputTypeChange() {
    const outputType = document.getElementById("outputType").value;
    const generateButton = document.getElementById("generateOutput");

    // Show generate button only when output type is selected
    generateButton.classList.toggle("hidden", !outputType);

    // Hide all output elements
    document.getElementById("outputBox").classList.add("hidden");
    document.getElementById("outputImage").classList.add("hidden");
    document.getElementById("downloadImage").classList.add("hidden");
}

// Fixing Output Generation to support Text and Image
async function generateOutput() {
    const apiKey = document.getElementById("apiKey").value;
    const inputText = document.getElementById("userText")?.value.trim() || document.getElementById("transcription")?.value.trim();
    const outputType = document.getElementById("outputType").value;
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");
    const downloadButton = document.getElementById("downloadImage");

    if (!apiKey) {
        alert("Please enter your OpenAI API Key");
        return;
    }

    if (!inputText) {
        alert("Please provide input text before generating output.");
        return;
    }

    if (outputType === "text") {
        const endpoint = "https://api.openai.com/v1/chat/completions";
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
                    max_tokens: 100
                })
            });

            const result = await response.json();
            if (result.choices && result.choices.length > 0 && result.choices[0].message) {
                outputBox.value = result.choices[0].message.content.trim();
                outputBox.classList.remove("hidden");
                outputImage.classList.add("hidden");
                downloadButton.classList.add("hidden");
            } else {
                outputBox.value = "Error: No valid response from API.";
            }
        } catch (error) {
            console.error("Error generating text:", error);
            outputBox.value = "Error generating output.";
        }
    } else if (outputType === "image") {
        const endpoint = "https://api.openai.com/v1/images/generations";
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "dall-e-2",
                    prompt: inputText,
                    n: 1,
                    size: "1024x1024"
                })
            });

            const result = await response.json();
            if (result.data && result.data.length > 0) {
                outputImage.src = result.data[0].url;
                outputImage.classList.remove("hidden");
                outputBox.classList.add("hidden");

                // Show the download button
                downloadButton.classList.remove("hidden");
                downloadButton.setAttribute("data-image-url", result.data[0].url);
            } else {
                outputImage.classList.add("hidden");
                outputBox.value = "Error: No image generated.";
                downloadButton.classList.add("hidden");
            }
        } catch (error) {
            console.error("Error generating image:", error);
            outputBox.value = "Error generating output.";
        }
    }
}

// Function to download the generated image
function downloadGeneratedImage() {
    const downloadButton = document.getElementById("downloadImage");
    const imageUrl = downloadButton.getAttribute("data-image-url");

    if (!imageUrl) {
        alert("No image available for download.");
        return;
    }

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "generated_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
