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
    
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("recordButton")?.addEventListener("click", startRecording);
        document.getElementById("transcription")?.addEventListener("input", updateFinalAudioInput);
        document.getElementById("refinedOutputAudio")?.addEventListener("input", updateFinalAudioInput);
    
        document.querySelectorAll('input[name="finalInputAudio"]').forEach(input => {
            input.addEventListener("change", updateFinalAudioInput);
        });
    });

    function updateFinalAudioInput() {
        const selectedOption = document.querySelector('input[name="finalInputAudio"]:checked')?.value || "original";
        const userTranscription = document.getElementById("transcription")?.value.trim() || "";
        const refinedAudio = document.getElementById("refinedOutputAudio")?.value.trim() || "";
    
        const finalInput = selectedOption === "refined" && refinedAudio ? refinedAudio : userTranscription;
    
        if (finalInput) {
            localStorage.setItem("finalPrompt", finalInput);
            console.log("✅ Final Audio Input Updated:", finalInput);
        }
    }
 
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
    