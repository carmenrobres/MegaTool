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
    document.getElementById("output3D").classList.add("hidden");
    document.getElementById("download3D").classList.add("hidden");

    // Clear output fields
    const outputBox = document.getElementById("outputBox");
    if (outputBox) outputBox.value = "";
    const outputImage = document.getElementById("outputImage");
    if (outputImage) outputImage.src = "";
    const output3DViewer = document.getElementById("output3DViewer");
    if (output3DViewer) output3DViewer.src = "";
}

// Fixing Output Generation to support Text and Image
async function generateOutput() {
    const apiKey = document.getElementById("apiKey").value;
    const zoocadApiKey = document.getElementById("zoocadApiKey").value;
    const meshyApiKey = document.getElementById("meshyApiKey").value;
    const inputText = localStorage.getItem("finalPrompt")?.trim() || "";
    
    const loadingMessage = document.getElementById("loadingOutput"); // ✅ Get loading message element

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!inputText) {
        alert("❌ Please provide input text before generating output.");
        return;
    }

    console.log("🚀 Using Input for Output Generation:", inputText);
    const outputType = document.getElementById("outputType").value;
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");
    const output3D = document.getElementById("output3D");
    const output3DViewer = document.getElementById("output3DViewer");
    const downloadButton = document.getElementById("downloadImage");
    const download3DButton = document.getElementById("download3D");

    if (outputType === "meshy" && !meshyApiKey) {
        alert("Please enter your Meshy API Key.");
        return;
    }

    if (outputType === "zoocad" && !zoocadApiKey) {
        alert("Please enter your ZooCAD API Key.");
        return;
    }

    // ✅ Show the loading message before making API requests
    loadingMessage.classList.remove("hidden");

    try {
        if (outputType === "text") {  // ✅ Ensure "text" is selected
            const endpoint = "https://api.openai.com/v1/chat/completions";  // ✅ GPT-4 endpoint
        
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
        }
         else if (outputType === "image") {
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
                downloadButton.classList.remove("hidden");
                downloadButton.setAttribute("data-image-url", result.data[0].url);
            } else {
                outputImage.classList.add("hidden");
                outputBox.value = "Error: No image generated.";
                downloadButton.classList.add("hidden");}
            } catch (error) {
                console.error("Error generating image:", error);
                outputBox.value = "Error generating output.";
            }
        } else if (outputType === "meshy") {
            // Generate 3D model using Meshy API
            try {
            const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${meshyApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mode: "preview",
                    prompt: inputText,
                    art_style: "realistic",
                    should_remesh: true
                })
            });

            const result = await response.json();
            if (result.result) {
                const taskId = result.result;
                const modelUrl = await pollMeshyTaskStatus(taskId, meshyApiKey);
                if (modelUrl) {
                    output3DViewer.src = modelUrl;
                    output3D.classList.remove("hidden");
                    outputBox.classList.add("hidden");
                    outputImage.classList.add("hidden");
                    download3DButton.classList.remove("hidden");
                    download3DButton.setAttribute("data-model-url", modelUrl);
                } else {
                    outputBox.value = "Error: Failed to generate 3D model.";
                }
            } else {
                outputBox.value = "Error: No valid response from Meshy API.";
            }
        } catch (error) {
            console.error("Error generating 3D model with Meshy:", error);
            outputBox.value = "Error generating 3D model.";
        }
        } else if (outputType === "zoocad") {
            try {
                console.log("Sending request to local backend (KittyCAD proxy)...");

                const response = await fetch("http://localhost:5000/api/text-to-cad", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        prompt: inputText,
                        apiKey: zoocadApiKey
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error! Status: ${response.status}`);
                }

                const result = await response.json();
                console.log("KittyCAD Response via Proxy:", result);

                if (result.id) {
                    const modelUrl = await pollKittyCadStatus(result.id, zoocadApiKey);
                    if (modelUrl) {
                        output3DViewer.src = modelUrl;
                        output3D.classList.remove("hidden");
                        download3DButton.classList.remove("hidden");
                        download3DButton.setAttribute("data-model-url", modelUrl);
                    } else {
                        outputBox.value = "Error: Failed to generate CAD model.";
                    }
                } else {
                    outputBox.value = "Error: No valid response from KittyCAD.";
                }
            } catch (error) {
                console.error("Error contacting backend proxy:", error);
                alert("Error connecting to the local backend. Make sure the server is running.");
            }
        }
    } catch (error) {
        console.error("Error generating output:", error);
        outputBox.value = "Error generating output.";
    } finally {
        // ✅ Hide the loading message when the response is received
        loadingMessage.classList.add("hidden");
    }
}

    


// Function to poll Meshy task status
async function pollMeshyTaskStatus(taskId, meshyApiKey) {
    const endpoint = `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`;
    const headers = { "Authorization": `Bearer ${meshyApiKey}` };

    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(endpoint, { headers });
            const result = await response.json();

            if (result.status === "SUCCEEDED") {
                return result.model_urls.obj; // Return the OBJ file URL
            } else if (result.status === "FAILED") {
                throw new Error("Meshy task failed.");
            }
        } catch (error) {
            console.error("Error polling Meshy task status:", error);
            throw error;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before polling again
    }

    throw new Error("Meshy task timeout.");
}

// Function to download the generated 3D model
// Function to generate a timestamped filename
function generateFilename(type) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    return `${dateStr}_${type}.obj`; // Save as OBJ format
}

// Function to download the generated 3D model
function downloadGenerated3DModel() {
    const downloadButton = document.getElementById("download3D");
    const modelUrl = downloadButton.getAttribute("data-model-url");

    if (!modelUrl) {
        alert("No 3D model available for download.");
        return;
    }

    // Determine if it's a Mesh or CAD file based on output type
    const outputType = document.getElementById("outputType").value;
    const fileType = outputType === "meshy" ? "Mesh" : "CAD";
    const filename = generateFilename(fileType);

    // Create and trigger the download
    const link = document.createElement("a");
    link.href = modelUrl;
    link.download = filename; // Save as .obj
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Attach event listener to download button
document.getElementById("download3D")?.addEventListener("click", downloadGenerated3DModel);

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
