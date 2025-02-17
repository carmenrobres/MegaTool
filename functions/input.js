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
                document.getElementById("transcription").value = result.text;
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
