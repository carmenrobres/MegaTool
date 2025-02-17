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

        const section = document.getElementById(selectedInput + "Input");
        section.classList.remove("hidden");

        // Show output type selector when input is selected
        const outputTypeSelect = document.getElementById("outputType");
        outputTypeSelect.classList.toggle("hidden", !selectedInput);

        if (selectedInput === "webcam") {
            initWebcam();
        } else if (selectedInput === "audio") {
            initAudio();
        }
    }

    // Text Input (Handled automatically via textarea)

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
document.getElementById("captureButton")?.addEventListener("click", function () {
    const webcam = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const capturedImage = document.getElementById('capturedImage'); // Get the capturedImage element

    if (!webcam.srcObject) {
        alert('Webcam not active. Please wait or refresh.');
        return;
    }

    if (webcam.readyState !== 4) {
        alert('Webcam is not ready yet. Try again.');
        return;
    }

    // Ensure the video has been properly drawn before capture
    setTimeout(() => {
            canvas.width = webcam.videoWidth;
            canvas.height = webcam.videoHeight;
            const ctx = canvas.getContext('2d');

            // Draw the video frame onto the canvas
            ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

            // Convert to image & display preview
            capturedImage.src = canvas.toDataURL('image/png');
            capturedImage.classList.remove("hidden");

            // Stop the webcam after capture
            stopWebcam();
        }, 100); // Delay ensures the last frame is properly drawn
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

// Refinement Functionality
document.addEventListener('DOMContentLoaded', function () {
    // Add event listeners for refinement buttons
    document.getElementById("refineButton")?.addEventListener("click", refinePrompt);
    document.getElementById("refineButtonAudio")?.addEventListener("click", refinePrompt);
    
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

// Refine Prompt Function
async function refinePrompt() {
    const apiKey = document.getElementById("apiKey").value;
    const inputType = document.getElementById("inputType").value; // Get the selected input type
    const inputText = inputType === "text" 
        ? document.getElementById("userText")?.value.trim() 
        : document.getElementById("transcription")?.value.trim();
    const refinementType = document.getElementById("refinementType")?.value || document.getElementById("refinementTypeAudio")?.value;

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

    // Define structured prompt for API call
    let refinementPrompt = "";
    switch (refinementType) {
        case "3d_cad":
            refinementPrompt = `Analyze the following description and determine if CAD is the best format for creating this object. If it is, explain why. If not, explain why another format (e.g., 3D Mesh) might be better.  

            Then, refine the input into a structured CAD modeling prompt using the following best practices:
            - The object must be described in terms of **geometric shapes** (e.g., cylinders, cubes, spheres).
            - Be **explicit about dimensions** (e.g., "a plate with four 5mm holes evenly spaced").
            - **Assemblies are difficult**, so the prompt should focus on a **single object** rather than multiple interconnected parts.
            - **Shorter prompts** (1-2 sentences) succeed more often than longer ones.
            - If key dimensions are missing, fill in reasonable estimates.

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

            Input: "${inputText}"

            Respond with this exact format:
            ---
            Suitability: [Mesh is/is not the best format because ...]
            Refined Prompt: "[Improved Mesh modeling prompt]"
            ---`;
            break;

        case "image_generation":
            refinementPrompt = `Analyze the following description and refine it into a detailed prompt for AI image generation. Ensure the composition, lighting, style, and key details are included.  

            Input: "${inputText}"

            Respond with this exact format:
            ---
            Refined Prompt: "[Improved Image Generation prompt]"
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
        const suitabilityMatch = refinedText.match(/Suitability: (.+)/);
        const promptMatch = refinedText.match(/Refined Prompt: "(.*)"/);

        if (suitabilityMatch && promptMatch) {
            const suitability = suitabilityMatch[1].trim();
            const prompt = promptMatch[1].trim();

            // Display Suitability (non-editable)
            suitabilityText.textContent = suitability;
            suitabilityOutput.classList.remove("hidden");

            // Display Refined Prompt (editable)
            refinedOutput.value = prompt;
            refinedOutput.readOnly = false;
            refinedOutput.classList.remove("hidden");
        } else {
            console.error("Failed to parse AI response:", refinedText);
            alert("Failed to parse the refined output. Please try again.");
        }
    } catch (error) {
        console.error("Error refining prompt:", error);
        alert("Network error! Please check your internet connection and API key.");
    }
}
