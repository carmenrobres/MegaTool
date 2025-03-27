// Define functions first
function handleInputChange(event) {
    const input = event.target.value;
    localStorage.setItem('userInput', input);
    console.log('Input changed:', input);
}

// Then expose it to the window object
window.handleInputChange = handleInputChange;

document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById("ideate")) return; // don't run on make.html
    let stream = null;
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];


    // Add event listeners for your input elements
    const textInputs = document.querySelectorAll('textarea, input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('input', handleInputChange);
    });
    

    function clearInputFields(selectedInput) {
        // Clear text input
        if (selectedInput !== "text") {
            const userText = document.getElementById("userText");
            if (userText) userText.value = "";
        }
    
        // Clear image input
        if (selectedInput !== "image") {
            const imageUpload = document.getElementById("imageUpload");
            const imagePreview = document.getElementById("imagePreview");
            if (imageUpload) imageUpload.value = "";
            if (imagePreview) {
                imagePreview.src = "";
                imagePreview.classList.add("hidden");
            }
        }
    
        // Clear webcam input
        if (selectedInput !== "webcam") {
            const capturedImage = document.getElementById("capturedImage");
            if (capturedImage) {
                capturedImage.src = "";
                capturedImage.classList.add("hidden");
            }
            const downloadCapturedImage = document.getElementById("downloadCapturedImage");
            if (downloadCapturedImage) downloadCapturedImage.classList.add("hidden");
        }
    
        // Clear audio input
        if (selectedInput !== "audio") {
            const transcription = document.getElementById("transcription");
            if (transcription) transcription.value = "";
        }
    }
    
    
    // Stop All Media (Webcam & Audio)
    function stopAllMedia() {
        stopWebcam();
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
        isRecording = false;
        const recordButton = document.getElementById("recordButton");
        if (recordButton) recordButton.textContent = "Start Recording";
    }

    // Hide all input sections initially
    function hideAllSections() {
        document.querySelectorAll(".input-section").forEach(section => {
            section.classList.add("hidden");
        });
    }

    // Event Listeners
    document.getElementById("inputType")?.addEventListener("change", handleInputChange);
    window.addEventListener('beforeunload', stopAllMedia);
});

function updateFinalInput() {
    let inputType = document.getElementById("inputType").value;
    let finalInput = "";

    if (inputType === "text") {
        const selectedOption = document.querySelector('input[name="finalInputText"]:checked')?.value || "original";
        const userText = document.getElementById("userText")?.value.trim() || "";
        const refinedText = document.getElementById("refinedOutput")?.value.trim() || "";

        finalInput = selectedOption === "refined" && refinedText ? refinedText : userText;
    } else if (inputType === "audio") {
        const selectedOption = document.querySelector('input[name="finalInputAudio"]:checked')?.value || "original";
        const userTranscription = document.getElementById("transcription")?.value.trim() || "";
        const refinedAudio = document.getElementById("refinedOutputAudio")?.value.trim() || "";

        finalInput = selectedOption === "refined" && refinedAudio ? refinedAudio : userTranscription;
    }

    if (finalInput) {
        localStorage.setItem("finalPrompt", finalInput);
        console.log("✅ Final Input Updated:", finalInput);
    }
}


document.querySelectorAll('input[name="finalInputAudio"]').forEach(input => {
    input.addEventListener("change", updateFinalInput);
});

document.getElementById("transcription")?.addEventListener("input", updateFinalInput);



document.querySelectorAll('input[name="finalInputAudio"]').forEach(input => {
    input.addEventListener("change", updateFinalInput);
});

// **Ensure refined voice prompt updates when user types**
document.getElementById("transcription")?.addEventListener("input", updateFinalInput);
document.getElementById("refinedOutputAudio")?.addEventListener("input", updateFinalInput);





// Refinement Functionality
document.addEventListener('DOMContentLoaded', function () {

    // Show refinement section when text or audio input is active
    document.getElementById("inputType")?.addEventListener("change", function () {
        const inputType = this.value;
        const refinementSection = document.getElementById("refinementSection");
        const refinementSectionAudio = document.getElementById("refinementSectionAudio");
    
         if (inputType === "audio") {
            refinementSectionAudio.classList.remove("hidden");
            refinementSection.classList.add("hidden");
        } else {
            refinementSection.classList.add("hidden");
            refinementSectionAudio.classList.add("hidden");
        }
    });
    
});



document.getElementById("saveApiKeys").addEventListener("click", function () {
    localStorage.setItem("apiKey", document.getElementById("apiKey").value);
    localStorage.setItem("meshyApiKey", document.getElementById("meshyApiKey").value);
    alert("API Keys Saved!");
});


document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById("apiKey");
    const zoocadApiKeyInput = document.getElementById("zoocadApiKey");
    const meshyApiKeyInput = document.getElementById("meshyApiKey");

    // Load saved API keys from localStorage
    function loadApiKeys() {
        const apiKeyInput = document.getElementById("apiKey");
        const zoocadApiKeyInput = document.getElementById("zoocadApiKey");
        const meshyApiKeyInput = document.getElementById("meshyApiKey");
    
        // Only set values if the elements exist
        if (apiKeyInput && localStorage.getItem("apiKey")) {
            apiKeyInput.value = localStorage.getItem("apiKey");
        }
        
        if (zoocadApiKeyInput && localStorage.getItem("zoocadApiKey")) {
            zoocadApiKeyInput.value = localStorage.getItem("zoocadApiKey");
        }
        
        if (meshyApiKeyInput && localStorage.getItem("meshyApiKey")) {
            meshyApiKeyInput.value = localStorage.getItem("meshyApiKey");
        }
    }

    // Save API keys when changed
    function saveApiKey(event) {
        localStorage.setItem(event.target.id, event.target.value);
    }

    // Attach event listeners to save on change
    apiKeyInput.addEventListener("input", saveApiKey);
    meshyApiKeyInput.addEventListener("input", saveApiKey);

    // Load stored API keys when the page loads
    loadApiKeys();
});
