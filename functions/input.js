window.handleInputChange = handleInputChange;

document.addEventListener('DOMContentLoaded', function () {
    let stream = null;
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];

    // Handle input type changes
    function handleInputChange() {
        stopAllMedia();
        hideAllSections();
    
        const selectedInput = document.getElementById("inputType").value;
        if (!selectedInput) return;
    
        // Show the correct input section
        const section = document.getElementById(selectedInput + "Input");
        section.classList.remove("hidden");
    
        // Show output type selector when input is selected
        const outputTypeSelect = document.getElementById("outputType");
        outputTypeSelect.classList.toggle("hidden", !selectedInput);
    
        // Hide selection boxes when switching input
        document.getElementById("finalSelectionText").classList.add("hidden");
        document.getElementById("finalSelectionAudio").classList.add("hidden");
    
        if (selectedInput === "webcam") {
            initWebcam();
        } else if (selectedInput === "audio") {
            initAudio();
        }
    }
    

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

    // Image Upload
    document.getElementById("imageUpload")?.addEventListener("change", function (event) {
        const imagePreview = document.getElementById('imagePreview');
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    // Webcam Initialization
    async function initWebcam() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const webcam = document.getElementById('webcam');
            webcam.srcObject = stream;

            // Ensure the video is fully loaded before allowing capture
            await new Promise(resolve => webcam.onloadedmetadata = resolve);
            webcam.play();
        } catch (error) {
            console.error('Webcam error:', error);
            alert('Could not access webcam. Please check permissions.');
        }
    }

    // Webcam Capture Fix
   // Webcam Capture Fix
// Webcam Capture Fix
document.getElementById("captureButton")?.addEventListener("click", function () {
    const webcam = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const capturedImage = document.getElementById('capturedImage');

    if (!webcam.srcObject) {
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

        // Enable the describe button
        document.getElementById("describeCapturedImageButton")?.classList.remove("hidden");

        // Optional: Stop webcam after capture
        // stopWebcam();
    }, 100);
});


    document.getElementById("downloadCapturedImage")?.addEventListener("click", function () {
        const capturedImage = document.getElementById('capturedImage');
        const link = document.createElement('a');
        link.href = capturedImage.src;
        link.download = 'captured_image.png';
        link.click();
    });

    document.getElementById("capturedImage").classList.remove("hidden");
    document.getElementById("downloadCapturedImage").classList.remove("hidden");

    // Stop webcam function
    function stopWebcam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    // Audio Initialization
    async function initAudio() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            document.getElementById("transcription").classList.remove("hidden");
        } catch (error) {
            console.error('Audio error:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    // Start & Stop Audio Recording
    document.getElementById("recordButton")?.addEventListener("click", async function () {
        if (!stream) {
            await initAudio();
            return;
        }
    
        if (!isRecording) {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
    
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
    
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    
                // Stop the microphone immediately after recording
                stopAudioStream();
    
                await sendToOpenAI(audioBlob);
            };
    
            mediaRecorder.start();
            isRecording = true;
            this.textContent = "Stop Recording";
        } else {
            mediaRecorder.stop();
            isRecording = false;
            this.textContent = "Start Recording";
        }
    });
    
    // Stop the microphone stream when done recording
    function stopAudioStream() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop()); // Stop all tracks
            stream = null;
        }
    }
    
    
    // Send Audio to OpenAI
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
                transcriptionBox.value = result.text;
                transcriptionBox.readOnly = false; // Make it editable
    
                // **Auto-save transcription to localStorage**
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

// ✅ Attach event listeners to ensure the input is saved instantly
document.querySelectorAll('input[name="finalInputText"]').forEach(input => {
    input.addEventListener("change", updateFinalInput);
});

document.querySelectorAll('input[name="finalInputAudio"]').forEach(input => {
    input.addEventListener("change", updateFinalInput);
});

document.getElementById("userText")?.addEventListener("input", updateFinalInput);
document.getElementById("transcription")?.addEventListener("input", updateFinalInput);


// Attach event listeners to selection inputs
document.querySelectorAll('input[name="finalInputText"]').forEach(input => {
    input.addEventListener("change", updateFinalInput);
});

document.querySelectorAll('input[name="finalInputAudio"]').forEach(input => {
    input.addEventListener("change", updateFinalInput);
});

// **Ensure refined voice prompt updates when user types**
document.getElementById("transcription")?.addEventListener("input", updateFinalInput);
document.getElementById("refinedOutputAudio")?.addEventListener("input", updateFinalInput);





// Refinement Functionality
document.addEventListener('DOMContentLoaded', function () {
        document.getElementById("refineButton")?.addEventListener("click", function() {
            refinePrompt();
            document.getElementById("finalSelectionText").classList.remove("hidden");
        });
    
        document.getElementById("refineButtonAudio")?.addEventListener("click", function() {
            refinePrompt();
            document.getElementById("finalSelectionAudio").classList.remove("hidden");
        });

        
    
    // Show refinement section when text or audio input is active
    document.getElementById("inputType")?.addEventListener("change", function () {
        const inputType = this.value;
        const refinementSection = document.getElementById("refinementSection");
        const refinementSectionAudio = document.getElementById("refinementSectionAudio");
    
        if (inputType === "text") {
            refinementSection.classList.remove("hidden");
            refinementSectionAudio.classList.add("hidden");
        } else if (inputType === "audio") {
            refinementSectionAudio.classList.remove("hidden");
            refinementSection.classList.add("hidden");
        } else {
            refinementSection.classList.add("hidden");
            refinementSectionAudio.classList.add("hidden");
        }
    });
    
});

async function refinePrompt() {
    const apiKey = document.getElementById("apiKey").value;
    const inputType = document.getElementById("inputType").value; // Get the selected input type
    const inputText = inputType === "text" 
        ? document.getElementById("userText")?.value.trim() 
        : document.getElementById("transcription")?.value.trim();
    const refinementType = inputType === "text"
        ? document.getElementById("refinementType")?.value 
        : document.getElementById("refinementTypeAudio")?.value;

    // Get output elements based on input type
    const suitabilityOutput = inputType === "text" 
        ? document.getElementById("suitabilityOutput") 
        : document.getElementById("suitabilityOutputAudio");
    const suitabilityText = inputType === "text" 
        ? document.getElementById("suitabilityText") 
        : document.getElementById("suitabilityTextAudio");
    const refinedOutput = inputType === "text" 
        ? document.getElementById("refinedOutput") 
        : document.getElementById("refinedOutputAudio");

    // **Loading Message**
    const loadingMessage = inputType === "text" 
    ? document.getElementById("loadingRefinement")  // ✅ FIXED ID
    : document.getElementById("loadingRefinementAudio");
    // ✅ Check if element exists before using classList
    if (loadingMessage) {
        loadingMessage.classList.remove("hidden");
    } else {
        console.error("❌ Loading message element not found for", inputType);
    }

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!inputText) {
        alert("Please provide input text before refining.");
        return;
    }

    if (!refinementType) {
        alert("Please select a refinement type.");
        return;
    }

    // **Show loading message before making API call**
    loadingMessage.classList.remove("hidden");

    // Define structured prompt for API call
    let refinementPrompt = "";
    switch (refinementType) {
        case "3d_cad":
            refinementPrompt = `Analyze the following description and determine if CAD is the best format for creating this object. If it is, explain why. If not, explain why another format (e.g., 3D Mesh) might be better.

            Then, refine the input into a structured CAD modeling prompt using the following best practices:
            'Describe an object that can be modeled in CAD with simple operations, being as explicit as possible, using meassures if possible and focusing on single, self-contained items rather than assemblies. Try to make descriptions as operations in a cad software. Try not to build super long prompts.
            **Input:**  
            "${inputText}"

            **Respond with this exact format:**
            ---
            Suitability: [CAD is/is not the best format because ...]
            Refined Prompt: "[Improved CAD modeling prompt following best practices]"
            ---`;
            break;

        case "3d_mesh":
            refinementPrompt = `Analyze the following description and determine if a 3D Mesh is the best format for creating this object. If it is, explain why. If not, explain why another format (e.g., CAD) might be better.

            Then, refine the input into a structured 3D Mesh modeling prompt based on the best possible representation. 
            - **Tailor the style to its purpose** (e.g., low-poly for games, high-precision for manufacturing).
            - **Keep prompts clear and concise** (1-2 sentences work best).
            - **Indicate dimensions and proportions** using precise units (mm, cm, m).

            **Input:**  
            "${inputText}"

            **Respond with this exact format:**
            ---
            Suitability: [Mesh is/is not the best format because ...]
            Refined Prompt: "[Improved Mesh modeling prompt]"
            ---`;
            break;

        case "image_generation":
            refinementPrompt = `Refine the following text into a structured and detailed prompt for AI image generation.

            Ensure the refined prompt:
            - Clearly describes the **subject** and **composition**.
            - Specifies **lighting, colors, and atmosphere**.
            - Defines **style or artistic approach** (e.g., photorealistic, cyberpunk, watercolor).
            - Avoids vague concepts like "beautiful" or "amazing"—instead, describe specific details.

            **Input:**  
            "${inputText}"

            **Respond with this exact format:**
            ---
            Refined Prompt: "[Detailed Image Generation prompt]"
            ---`;
            break;

        default:
            alert("Invalid refinement type.");
            return;
    }

    // Call OpenAI API to refine the prompt
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: refinementPrompt }],
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const result = await response.json();
        const refinedText = result.choices[0].message.content.trim();

        // **Fixed Parsing Logic**
        const suitabilityMatch = refinedText.match(/Suitability:\s*"?([\s\S]+?)"?\s*Refined Prompt:/);
        const promptMatch = refinedText.match(/Refined Prompt:\s*"?([\s\S]+?)"?\s*---/);

        if (promptMatch) {
            const prompt = promptMatch[1].trim();
            refinedOutput.value = prompt;
            refinedOutput.readOnly = false;
            refinedOutput.classList.remove("hidden");

            if (suitabilityMatch) {
                const suitability = suitabilityMatch[1].trim();
                suitabilityText.textContent = suitability;
                suitabilityOutput.classList.remove("hidden");
            } else {
                // If there's no suitability message, hide the section
                suitabilityOutput.classList.add("hidden");
            }
        } else {
            console.error("Failed to parse AI response:", refinedText);
            alert("Unexpected AI response format. Try again.");
        }

    } catch (error) {
        console.error("Error refining prompt:", error);
        alert("Network error! Please check your internet connection and API key.");
    } finally {
        // **Hide loading message after response**
        loadingMessage.classList.add("hidden");
    }
}





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
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("describeImageButton")?.addEventListener("click", describeUploadedImage);
});

async function describeUploadedImage() {
    const apiKey = document.getElementById("apiKey").value;
    const fileInput = document.getElementById("imageUpload");
    const descriptionBox = document.getElementById("imageDescription");
    const loadingMessage = document.getElementById("loadingImageDescription");
    const describeType = document.getElementById("imageDescribeType").value;

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (fileInput.files.length === 0) {
        alert("Please select an image first.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(event) {
        const base64Image = event.target.result.split(",")[1];
        loadingMessage.classList.remove("hidden");

        // Set the appropriate prompt based on selection
        let promptText = "";

        switch(describeType) {
            case "3d_cad":
                promptText = `Describe the main object in this image explicitly and concisely for CAD modeling. 
                - Use clear geometric shapes (cylinders, cubes, spheres).
                - Include explicit dimensions or realistic estimates.
                - Focus only on one single, standalone object.
                - Keep your description short and precise.`;
                break;
        
            case "3d_mesh":
                promptText = `Describe the main element in this image for 3D mesh modeling, clearly identifying visual details and focusing explicitly on one object. Keep the description concise but detailed enough for modeling.`;
                break;
        
            case "image_generation":
                promptText = `Provide a detailed description of this image, including the main subjects, composition, colors, lighting, and artistic style, intended to be used as a prompt for AI image generation.`;
                break;
        
            default:
                promptText = `Describe this picture in detail.`;
                break;
        }
                
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
                            { type: "text", text: promptText },
                            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
                        ]
                    }],
                    max_tokens: 400
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }

            const result = await response.json();
            const description = result.choices[0].message.content.trim();

            descriptionBox.value = description;
            descriptionBox.classList.remove("hidden");
        } catch (error) {
            console.error("Error describing image:", error);
            alert("Failed to describe the image.");
        } finally {
            loadingMessage.classList.add("hidden");
        }
    };

    reader.readAsDataURL(file);
    // Automatically select description as input after generating description
    // Immediately after receiving description
    descriptionBox.value = description;
    descriptionBox.classList.remove("hidden");

    // Automatically select description as input and save to localStorage
    document.querySelector('input[name="imageInputChoice"][value="description"]').checked = true;
    localStorage.setItem("finalPrompt", description);
    console.log("✅ Image description set as final input:", description);


}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input[name="imageInputChoice"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const choice = this.value;
    
            if (choice === "description") {
                const description = document.getElementById("imageDescription").value.trim();
                if (description) {
                    localStorage.setItem("finalPrompt", description);
                    console.log("✅ Using Description as Input:", description);
                } else {
                    alert("❌ Please describe the image first.");
                    document.querySelector('input[value="image"]').checked = true;
                }
            } else {
                // Use original image as input: Clear the description prompt
                localStorage.removeItem("finalPrompt");
            }
        });
    });
    
});


document.getElementById("describeCapturedImageButton")?.addEventListener("click", describeCapturedImage);

async function describeCapturedImage() {
    const apiKey = document.getElementById("apiKey").value;
    const capturedImage = document.getElementById("capturedImage").src;
    const descriptionBox = document.getElementById("capturedImageDescription");
    const loadingMessage = document.getElementById("loadingCapturedImageDescription");
    const describeType = document.getElementById("webcamDescribeType").value;

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!capturedImage || capturedImage === "hidden") {
        alert("Please capture an image first.");
        return;
    }

    // Extract base64 image data
    const base64Image = capturedImage.split(",")[1];
    loadingMessage.classList.remove("hidden");

    // Set the appropriate prompt based on selection
    let promptText = "";

    switch(describeType) {
        case "3d_cad":
            promptText = `Describe the main object in this image explicitly and concisely for CAD modeling. 
            - Use clear geometric shapes (cylinders, cubes, spheres).
            - Include explicit dimensions or realistic estimates.
            - Focus only on one single, standalone object.
            - Keep your description short and precise.`;
            break;

        case "3d_mesh":
            promptText = `Describe the main element in this image for 3D mesh modeling, clearly identifying visual details and focusing explicitly on one object. Keep the description concise but detailed enough for modeling.`;
            break;

        case "image_generation":
            promptText = `Provide a detailed description of this image, including the main subjects, composition, colors, lighting, and artistic style, intended to be used as a prompt for AI image generation.`;
            break;

        default:
            promptText = `Describe this picture in detail.`;
            break;
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
                        { type: "text", text: promptText },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
                    ]
                }],
                max_tokens: 400
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const result = await response.json();
        const description = result.choices[0].message.content.trim();

        descriptionBox.value = description;
        descriptionBox.classList.remove("hidden");

        // Auto-select description as input
        document.querySelector('input[name="webcamInputChoice"][value="description"]').checked = true;
        localStorage.setItem("finalPrompt", description);
        console.log("✅ Webcam image description set as final input:", description);
        
    } catch (error) {
        console.error("Error describing captured image:", error);
        alert("Failed to describe the captured image.");
    } finally {
        loadingMessage.classList.add("hidden");
    }
}
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input[name="webcamInputChoice"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const choice = this.value;

            if (choice === "description") {
                const description = document.getElementById("capturedImageDescription").value.trim();
                if (description) {
                    localStorage.setItem("finalPrompt", description);
                    console.log("✅ Using Description as Input:", description);
                } else {
                    alert("❌ Please describe the image first.");
                    document.querySelector('input[value="image"]').checked = true;
                }
            } else {
                // Use original image as input: Clear the description prompt
                localStorage.removeItem("finalPrompt");
            }
        });
    });
});

// Add these functions to your input.js file

document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for image/description selection for meshy
    setupImageInputSelectionListeners();
});

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

// Helper function to get the selected image element based on input type
function getSelectedImageElement() {
    const inputType = document.getElementById("inputType").value;
    
    if (inputType === "image") {
        // Check if image is selected as input
        const useImageAsInput = document.querySelector('input[name="imageInputChoice"][value="image"]').checked;
        return useImageAsInput ? document.getElementById("imagePreview") : null;
    } else if (inputType === "webcam") {
        // Check if image is selected as input
        const useImageAsInput = document.querySelector('input[name="webcamInputChoice"][value="image"]').checked;
        return useImageAsInput ? document.getElementById("capturedImage") : null;
    }
    
    return null;
}
