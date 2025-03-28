// imageOutput.js

export async function generateImageOutput(apiKey, inputText) {
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");
    const downloadButton = document.getElementById("downloadImage");
    const output3D = document.getElementById("output3D");

    const endpoint = "https://api.openai.com/v1/images/generations";
    console.log("Generating image output");

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
        console.log("API response received:", result);

        if (result.data?.[0]?.url) {
            outputImage.src = result.data[0].url;
            outputImage.classList.remove("hidden");
            outputBox.classList.add("hidden");
            downloadButton.classList.remove("hidden");
            downloadButton.setAttribute("data-image-url", result.data[0].url);
            output3D.classList.add("hidden");
            console.log("Image output displayed");
        } else {
            throw new Error(result.error?.message || "No image generated");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        outputBox.value = "Error generating output: " + error.message;
        outputBox.classList.remove("hidden");
        outputImage.classList.add("hidden");
        downloadButton.classList.add("hidden");
    }
}


// Function to download the generated image
function downloadGeneratedImage() {
    console.log("Download image function called");
    
    const downloadButton = document.getElementById("downloadImage");
    if (!downloadButton) {
        console.error("Download image button not found");
        return;
    }
    
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
    console.log("Image downloaded");
}

