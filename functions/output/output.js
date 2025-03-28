// output.js
import { generateTextOutput } from './textOutput.js';
import { generateImageOutput } from './imageOutput.js';
import { generate3DOutput, downloadGenerated3DModel } from './model3dOutput.js';

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById("ideate")) return; // don't run on make.html
    console.log("Output.js loaded and running");
    
    // Add event listener for output type change
    const outputTypeSelect = document.getElementById("outputType");
    if (outputTypeSelect) {
        outputTypeSelect.addEventListener("change", handleOutputTypeChange);
        console.log("Output type change event listener added");
    } else {
        console.error("Output type select element not found");
    }
    
    // Add event listener for generate button
    const generateButton = document.getElementById("generateOutput");
    if (generateButton) {
        generateButton.addEventListener("click", generateOutput);
        console.log("Generate button event listener added");
    }

    // Add event listener for the download button
    const downloadImageButton = document.getElementById("downloadImage");
    if (downloadImageButton) {
        downloadImageButton.addEventListener("click", downloadGeneratedImage);
        console.log("Download image button event listener added");
    }
    
    // Add event listener for the download 3D button
    const download3DButton = document.getElementById("download3D");
    if (download3DButton) {
        download3DButton.addEventListener("click", downloadGenerated3DModel);
        console.log("Download 3D button event listener added");
    }
    
    // Add event listener for Zoo button
    const goToZooCadButton = document.getElementById("goToZooCadButton");
    if (goToZooCadButton) {
        goToZooCadButton.addEventListener("click", function() {
            window.open("https://text-to-cad.zoo.dev/", "_blank");
        });
        console.log("Zoo button event listener added");
    }
});

function handleOutputTypeChange() {
    console.log("Output type changed");
    const outputType = document.getElementById("outputType").value;
    const generateButton = document.getElementById("generateOutput");
    const goToZooCadButton = document.getElementById("goToZooCadButton");

    if (!generateButton || !goToZooCadButton) {
        console.error("Generate or ZooCad button not found");
        return;
    }

    console.log("Selected output type:", outputType);

    // Show generate button only when output type is selected (and NOT zoocad)
    if (outputType && outputType !== "zoocad") {
        generateButton.classList.remove("hidden");
        goToZooCadButton.classList.add("hidden");
    } else if (outputType === "zoocad") {
        // Show Zoo button and hide generate button for zoocad option
        goToZooCadButton.classList.remove("hidden");
        generateButton.classList.add("hidden");
    } else {
        // Hide both buttons if no output type is selected
        generateButton.classList.add("hidden");
        goToZooCadButton.classList.add("hidden");
    }

    // Hide all output elements
    const elements = [
        "outputBox", "outputImage", "downloadImage", 
        "output3D", "download3D"
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add("hidden");
        } else {
            console.warn(`Element with ID ${id} not found`);
        }
    });

    // Remove preview button if it exists
    const previewButton = document.getElementById("preview3D");
    if (previewButton) {
        previewButton.remove();
    }

    // Clear output fields
    const outputBox = document.getElementById("outputBox");
    if (outputBox) outputBox.value = "";
    
    const outputImage = document.getElementById("outputImage");
    if (outputImage) outputImage.src = "";
    
    // Reset Three.js variables if the output type is changed
    cleanupThreeJS();
}

// Function to generate output (text, image, 3D)
async function generateOutput() {
    console.log("Generate output function called");
    
    // Get required elements
    const apiKeyInput = document.getElementById("apiKey");
    const meshyApiKeyInput = document.getElementById("meshyApiKey");
    const zoocadApiKeyInput = document.getElementById("zoocadApiKey");
    const outputTypeSelect = document.getElementById("outputType");
    const loadingMessage = document.getElementById("loadingOutput");
    
    if (!apiKeyInput || !outputTypeSelect || !loadingMessage) {
        console.error("Required elements not found");
        return;
    }
    
    const apiKey = apiKeyInput.value;
    const meshyApiKey = meshyApiKeyInput ? meshyApiKeyInput.value : '';
    const zoocadApiKey = zoocadApiKeyInput ? zoocadApiKeyInput.value : '';
    const inputText = localStorage.getItem("finalPrompt")?.trim() || "";
    const outputType = outputTypeSelect.value;

    console.log("Output type:", outputType);
    console.log("Input text available:", !!inputText);
    
    // Check for required inputs
    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!inputText) {
        alert("❌ Please provide input text before generating output.");
        return;
    }

    console.log("🚀 Using Input for Output Generation:", inputText);
    
    // Get output elements
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");
    const output3D = document.getElementById("output3D");
    const output3DViewer = document.getElementById("output3DViewer");
    const downloadButton = document.getElementById("downloadImage");
    const download3DButton = document.getElementById("download3D");

    if (!outputBox || !outputImage || !output3D || !output3DViewer) {
        console.error("Output elements not found");
        return;
    }

    // Check for API keys based on output type
    if (outputType === "meshy" && !meshyApiKey) {
        alert("Please enter your Meshy API Key.");
        return;
    }

    if (outputType === "zoocad" && !zoocadApiKey) {
        alert("Please enter your ZooCAD API Key.");
        return;
    }

    // Remove preview button if it exists
    const previewButton = document.getElementById("preview3D");
    if (previewButton) {
        previewButton.remove();
    }

    // Show the loading message before making API requests
    loadingMessage.classList.remove("hidden");
    console.log("Loading message shown");

    try {
        if (outputType === "text") {
            await generateTextOutput(apiKey, inputText);
            return;
        } else if (outputType === "image") {
            await generateImageOutput(apiKey, inputText);
            return;
        } else if (outputType === "meshy") {
            await generate3DOutput(meshyApiKey, inputText, 'meshy');
            return;
        } else if (outputType === "zoocad") {
            await generate3DOutput(zoocadApiKey, inputText, 'zoocad');
            return;
        } else {
            console.error("Unknown output type:", outputType);
            outputBox.value = "Error: Invalid output type selected.";
            outputBox.classList.remove("hidden");
        }  
    } catch (error) {
        console.error("Error generating output:", error);
        outputBox.value = "Error generating output: " + error.message;
        outputBox.classList.remove("hidden");
    } finally {
        // Hide the loading message when the response is received
        loadingMessage.classList.add("hidden");
        console.log("Loading message hidden");
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