// Centralized application initialization system
document.addEventListener('DOMContentLoaded', function() {
    console.log("App initialization started");
    
    // Initialize navigation components
    initNavigation();
    
    // Initialize input components
    initInputHandlers();
    
    // Initialize output components
    initOutputHandlers();
    
    // Initialize make components
    initMakeHandlers();
    
    console.log("App initialization completed");
});

// Navigation initialization
function initNavigation() {
    console.log("Initializing navigation");
    
    // Initialize sidebar controls
    const openSidebarBtn = document.getElementById("openSidebar");
    const closeSidebarBtn = document.getElementById("closeSidebar");
    
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener("click", function() {
            document.getElementById("sidebar").classList.add("open");
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", function() {
            document.getElementById("sidebar").classList.remove("open");
        });
    }
    
    // Load initial page
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
}

// Define the navigateTo function if it doesn't already exist
window.navigateTo = function(pageId) {
    console.log("Navigating to:", pageId);
    
    // Hide all pages first
    document.querySelectorAll(".page").forEach(page => {
        page.style.display = 'none';
    });
    
    // Reset forms and content (except API keys)
    clearPageContent();
    
    // Show the target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        localStorage.setItem("lastPage", pageId);
    }
};

// Add this function to initialize clean state on page load
function initializeCleanState() {
    // Clear temporary data on page load
    clearPageContent();
    
    // Re-apply API keys to form inputs
    loadApiKeys();
    
    // Navigate to saved page or default
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
}

// Update your DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', function() {
    console.log("App initialization started");
    
    // Initialize clean state first
    initializeCleanState();
    
    // Then initialize components
    initNavigation();
    initInputHandlers();
    initOutputHandlers();
    initMakeHandlers();
    
    console.log("App initialization completed");
});

// Input components initialization
function initInputHandlers() {
    console.log("Initializing input handlers");
    
    // Make sure we have stream and audio recording variables setup globally
    window.stream = window.stream || null;
    window.isRecording = window.isRecording || false;
    window.mediaRecorder = window.mediaRecorder || null;
    window.audioChunks = window.audioChunks || [];
    
    // Initialize input type selection
    const inputTypeSelect = document.getElementById("inputType");
    if (inputTypeSelect) {
        // Remove existing listeners to prevent duplicates
        const newInputTypeSelect = inputTypeSelect.cloneNode(true);
        inputTypeSelect.parentNode.replaceChild(newInputTypeSelect, inputTypeSelect);
        
        // Add new listener
        newInputTypeSelect.addEventListener("change", handleInputTypeChange);
    }
    
    // Save API keys
    const saveApiKeysBtn = document.getElementById("saveApiKeys");
    if (saveApiKeysBtn) {
        saveApiKeysBtn.addEventListener("click", function() {
            localStorage.setItem("apiKey", document.getElementById("apiKey").value);
            localStorage.setItem("meshyApiKey", document.getElementById("meshyApiKey").value);
            alert("API Keys Saved!");
        });
    }
    
    // Load saved API keys
    loadApiKeys();
    
    // Add other input handlers here
    setupInputEventListeners();
}

// Function to handle input type changes
function handleInputTypeChange() {
    stopAllMedia();
    hideAllSections();

    const selectedInput = document.getElementById("inputType").value;
    if (!selectedInput) return;

    // Show the correct input section
    const section = document.getElementById(selectedInput + "Input");
    if (section) {
        section.classList.remove("hidden");
    }

    // Show output type selector when input is selected
    const outputTypeSelect = document.getElementById("outputType");
    if (outputTypeSelect) {
        outputTypeSelect.classList.toggle("hidden", !selectedInput);
    }

    // Hide selection boxes when switching input
    const finalSelectionText = document.getElementById("finalSelectionText");
    const finalSelectionAudio = document.getElementById("finalSelectionAudio");
    
    if (finalSelectionText) finalSelectionText.classList.add("hidden");
    if (finalSelectionAudio) finalSelectionAudio.classList.add("hidden");

    if (selectedInput === "webcam") {
        initWebcam();
    } else if (selectedInput === "audio") {
        initAudio();
    }
}

// Function to load API keys from localStorage
function loadApiKeys() {
    const apiKeyInput = document.getElementById("apiKey");
    const meshyApiKeyInput = document.getElementById("meshyApiKey");
    const zoocadApiKeyInput = document.getElementById("zoocadApiKey");
    
    if (apiKeyInput && localStorage.getItem("apiKey")) {
        apiKeyInput.value = localStorage.getItem("apiKey");
    }
    
    if (meshyApiKeyInput && localStorage.getItem("meshyApiKey")) {
        meshyApiKeyInput.value = localStorage.getItem("meshyApiKey");
    }
    
    if (zoocadApiKeyInput && localStorage.getItem("zoocadApiKey")) {
        zoocadApiKeyInput.value = localStorage.getItem("zoocadApiKey");
    }
}

// Setup remaining input event listeners
function setupInputEventListeners() {
    // Image upload handler
    const imageUpload = document.getElementById("imageUpload");
    if (imageUpload) {
        imageUpload.addEventListener("change", function(event) {
            const imagePreview = document.getElementById('imagePreview');
            const file = event.target.files[0];

            if (file && imagePreview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove("hidden");
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Describe image button
    const describeImageBtn = document.getElementById("describeImageButton");
    if (describeImageBtn) {
        describeImageBtn.addEventListener("click", describeUploadedImage);
    }
    
    // Describe captured image button
    const describeCapturedImageBtn = document.getElementById("describeCapturedImageButton");
    if (describeCapturedImageBtn) {
        describeCapturedImageBtn.addEventListener("click", describeCapturedImage);
    }
    
    // Webcam capture button
    const captureButton = document.getElementById("captureButton");
    if (captureButton) {
        captureButton.addEventListener("click", captureWebcamImage);
    }
    
    // Download captured image button
    const downloadCapturedImageBtn = document.getElementById("downloadCapturedImage");
    if (downloadCapturedImageBtn) {
        downloadCapturedImageBtn.addEventListener("click", function() {
            const capturedImage = document.getElementById('capturedImage');
            const link = document.createElement('a');
            link.href = capturedImage.src;
            link.download = 'captured_image.png';
            link.click();
        });
    }
    
    // Refine prompt buttons
    const refineButton = document.getElementById("refineButton");
    if (refineButton) {
        refineButton.addEventListener("click", function() {
            refinePrompt();
            const finalSelectionText = document.getElementById("finalSelectionText");
            if (finalSelectionText) finalSelectionText.classList.remove("hidden");
        });
    }
    
    const refineButtonAudio = document.getElementById("refineButtonAudio");
    if (refineButtonAudio) {
        refineButtonAudio.addEventListener("click", function() {
            refinePrompt();
            const finalSelectionAudio = document.getElementById("finalSelectionAudio");
            if (finalSelectionAudio) finalSelectionAudio.classList.remove("hidden");
        });
    }
    
    // Record button for audio input
    const recordButton = document.getElementById("recordButton");
    if (recordButton) {
        recordButton.addEventListener("click", toggleAudioRecording);
    }
    
    // Setup image/description selection listeners
    setupImageInputSelectionListeners();
    
    // Input change event listeners for real-time saving
    const userText = document.getElementById("userText");
    if (userText) {
        userText.addEventListener("input", updateFinalInput);
    }
    
    const transcription = document.getElementById("transcription");
    if (transcription) {
        transcription.addEventListener("input", updateFinalInput);
    }
    
    const refinedOutputAudio = document.getElementById("refinedOutputAudio");
    if (refinedOutputAudio) {
        refinedOutputAudio.addEventListener("input", updateFinalInput);
    }
    
    // Selection inputs for final input choice
    document.querySelectorAll('input[name="finalInputText"]').forEach(input => {
        input.addEventListener("change", updateFinalInput);
    });

    document.querySelectorAll('input[name="finalInputAudio"]').forEach(input => {
        input.addEventListener("change", updateFinalInput);
    });
    
    // Show refinement section when text or audio input is active
    const inputTypeSelect = document.getElementById("inputType");
    if (inputTypeSelect) {
        inputTypeSelect.addEventListener("change", function() {
            const inputType = this.value;
            const refinementSection = document.getElementById("refinementSection");
            const refinementSectionAudio = document.getElementById("refinementSectionAudio");
            
            if (inputType === "text") {
                if (refinementSection) refinementSection.classList.remove("hidden");
                if (refinementSectionAudio) refinementSectionAudio.classList.add("hidden");
            } else if (inputType === "audio") {
                if (refinementSectionAudio) refinementSectionAudio.classList.remove("hidden");
                if (refinementSection) refinementSection.classList.add("hidden");
            } else {
                if (refinementSection) refinementSection.classList.add("hidden");
                if (refinementSectionAudio) refinementSectionAudio.classList.add("hidden");
            }
        });
    }
}

// Output components initialization
function initOutputHandlers() {
    console.log("Initializing output handlers");
    
    // Add event listener for output type change
    const outputTypeSelect = document.getElementById("outputType");
    if (outputTypeSelect) {
        outputTypeSelect.addEventListener("change", handleOutputTypeChange);
        console.log("Output type change event listener added");
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
    }
    
    // Add event listener for the download 3D button
    const download3DButton = document.getElementById("download3D");
    if (download3DButton) {
        download3DButton.addEventListener("click", downloadGenerated3DModel);
    }
    
    // Add event listener for Zoo button
    const goToZooCadButton = document.getElementById("goToZooCadButton");
    if (goToZooCadButton) {
        goToZooCadButton.addEventListener("click", function() {
            window.open("https://text-to-cad.zoo.dev/", "_blank");
        });
    }
}

// Make components initialization
function initMakeHandlers() {
    console.log("Initializing make handlers");
    
    // Add event listeners for analyze button
    const analyzeButton = document.getElementById('analyze3DPrint');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyze3DPrint);
        console.log("Analyze button event listener added");
    }
    
    // Add event listeners for file upload
    const fileInput = document.getElementById('objUpload');
    if (fileInput) {
        fileInput.addEventListener('change', handleObjUpload);
        console.log("File input event listener added");
    }
    
    // Initialize the 3D canvas
    if (typeof initCanvas === 'function') {
        initCanvas();
    }
}

// Function to capture image from webcam
function captureWebcamImage() {
    const webcam = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const capturedImage = document.getElementById('capturedImage');

    if (!webcam || !webcam.srcObject) {
        alert('Webcam is not active. Please allow camera access.');
        return;
    }

    // Ensure the video frame is drawn before capturing
    setTimeout(() => {
        const ctx = canvas.getContext('2d');
        canvas.width = webcam.videoWidth || 640;
        canvas.height = webcam.videoHeight || 480;

        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

        // Convert to base64 image & show preview
        const imageDataUrl = canvas.toDataURL('image/png');
        capturedImage.src = imageDataUrl;
        capturedImage.classList.remove("hidden");

        // Enable the describe button and download button
        const describeCapturedImageButton = document.getElementById("describeCapturedImageButton");
        const downloadCapturedImage = document.getElementById("downloadCapturedImage");
        
        if (describeCapturedImageButton) describeCapturedImageButton.classList.remove("hidden");
        if (downloadCapturedImage) downloadCapturedImage.classList.remove("hidden");
    }, 100);
}

// Audio recording variables and functions
let stream = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Toggle audio recording state
function toggleAudioRecording() {
    const recordButton = document.getElementById("recordButton");
    
    if (!isRecording) {
        startAudioRecording();
        if (recordButton) recordButton.textContent = "Stop Recording";
    } else {
        stopAudioRecording();
        if (recordButton) recordButton.textContent = "Start Recording";
    }
}

// Start audio recording
async function startAudioRecording() {
    try {
        if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            stopAudioStream();
            await sendToOpenAI(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
    } catch (error) {
        console.error('Audio recording error:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

// Stop audio recording
function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

// Stop the audio stream
function stopAudioStream() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Send audio to OpenAI
async function sendToOpenAI(audioBlob) {
    const apiKey = document.getElementById("apiKey").value;

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "whisper-1");

    try {
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            body: formData
        });

        const result = await response.json();
        if (result.text) {
            const transcriptionBox = document.getElementById("transcription");
            if (transcriptionBox) {
                transcriptionBox.value = result.text;
                transcriptionBox.readOnly = false; // Make it editable
                transcriptionBox.classList.remove("hidden");
            }

            // Auto-save transcription to localStorage
            localStorage.setItem("finalPrompt", result.text);
            console.log("✅ Transcription Auto-Saved:", result.text);
        } else {
            console.error("Error in transcription:", result);
            alert("Failed to transcribe the audio.");
        }
    } catch (error) {
        console.error("Error sending audio:", error);
        alert("An error occurred while processing the audio.");
    }
}

// Webcam Initialization
async function initWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const webcam = document.getElementById('webcam');
        if (webcam) {
            webcam.srcObject = stream;
    
            // Ensure the video is fully loaded before allowing capture
            await new Promise(resolve => webcam.onloadedmetadata = resolve);
            webcam.play();
        }
    } catch (error) {
        console.error('Webcam error:', error);
        alert('Could not access webcam. Please check permissions.');
    }
}

// Audio Initialization
async function initAudio() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const transcription = document.getElementById("transcription");
        if (transcription) {
            transcription.classList.remove("hidden");
        }
    } catch (error) {
        console.error('Audio error:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

// Stop All Media (Webcam & Audio)
function stopAllMedia() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
    
    isRecording = false;
    const recordButton = document.getElementById("recordButton");
    if (recordButton) recordButton.textContent = "Start Recording";
}

// Hide all input sections
function hideAllSections() {
    document.querySelectorAll(".input-section").forEach(section => {
        section.classList.add("hidden");
    });
}

// CORS Proxy for external URLs
function proxyUrl(url) {
    if (url.includes('assets.meshy.ai') || url.includes('zoo.dev')) {
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }
    return url;
}

// Clean up before window unload
window.addEventListener('beforeunload', stopAllMedia);

// Function to update final input
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

// Function to set up image input selection listeners
function setupImageInputSelectionListeners() {
    // For uploaded images
    document.querySelectorAll('input[name="imageInputChoice"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateImageInputSelection("image", this.value);
        });
    });
    
    // For webcam images
    document.querySelectorAll('input[name="webcamInputChoice"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateImageInputSelection("webcam", this.value);
        });
    });
}

// Function to update image input selection based on radio button choice
function updateImageInputSelection(sourceType, choiceValue) {
    const outputTypeSelect = document.getElementById("outputType");
    
    // If using image directly and output type is meshy, we don't need text prompt
    if (choiceValue === "image" && outputTypeSelect.value === "meshy") {
        console.log(`✅ Using ${sourceType} directly for Meshy 3D generation`);
        
        // Clear the finalPrompt in localStorage as we'll use the image directly
        localStorage.removeItem("finalPrompt");
    } else if (choiceValue === "description") {
        // If using description, make sure we have a description to use
        const descriptionElement = sourceType === "image" 
            ? document.getElementById("imageDescription") 
            : document.getElementById("capturedImageDescription");
        
        const description = descriptionElement.value.trim();
        
        if (description) {
            localStorage.setItem("finalPrompt", description);
            console.log(`✅ Using ${sourceType} description as prompt:`, description);
        } else {
            alert(`❌ Please describe the ${sourceType} first.`);
            document.querySelector(`input[name="${sourceType}InputChoice"][value="image"]`).checked = true;
        }
    }
}

// Function to selectively clear localStorage items while preserving API keys
function clearLocalStorageExceptAPIKeys() {
    // Save API keys
    const apiKey = localStorage.getItem("apiKey");
    const meshyApiKey = localStorage.getItem("meshyApiKey");
    const zoocadApiKey = localStorage.getItem("zoocadApiKey");
    const lastPage = localStorage.getItem("lastPage");
    
    // Create a temporary object to store preserved values
    const preserveValues = {
        apiKey: apiKey,
        meshyApiKey: meshyApiKey,
        zoocadApiKey: zoocadApiKey,
        lastPage: lastPage
    };
    
    // Clear all localStorage
    localStorage.clear();
    
    // Restore preserved values
    Object.keys(preserveValues).forEach(key => {
        if (preserveValues[key]) {
            localStorage.setItem(key, preserveValues[key]);
        }
    });
    
    console.log("LocalStorage cleared except API keys and last page");
}

// Enhanced version of clearPageContent that also clears localStorage temporary data
function clearAllPageContent() {
    // First, clear the UI elements
    clearPageContent();
    
    // Then clear localStorage except API keys
    clearLocalStorageExceptAPIKeys();
}

// Add this function to initialize clean state on page load
function initializeCleanState() {
    // Clear temporary data on page load
    clearAllPageContent();
    
    // Re-apply API keys to form inputs
    loadApiKeys();
    
    // Navigate to saved page or default
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
}

// Add this event listener to the DOMContentLoaded function in app.js
document.addEventListener('DOMContentLoaded', function() {
    initializeCleanState();
    
    // Add clear data button to sidebar if desired
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        const clearDataBtn = document.createElement('button');
        clearDataBtn.textContent = "Reset All Data";
        clearDataBtn.className = "reset-button";
        clearDataBtn.style.marginTop = "20px";
        clearDataBtn.style.backgroundColor = "#dc3545";
        clearDataBtn.style.color = "white";
        
        clearDataBtn.addEventListener('click', function() {
            if (confirm("This will reset all temporary data but keep your API keys. Continue?")) {
                clearAllPageContent();
                alert("All temporary data has been cleared.");
            }
        });
        
        sidebar.appendChild(clearDataBtn);
    }
});