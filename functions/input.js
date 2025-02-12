document.addEventListener('DOMContentLoaded', function() {
    const inputType = document.getElementById('inputType');
    if (inputType) {
        inputType.addEventListener('change', handleInputChange);
    }

    const recordButton = document.getElementById('recordButton');
    if (recordButton) {
        recordButton.addEventListener('click', async function() {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
    }
    
function handleInputChange() {
    document.querySelectorAll(".input-section").forEach(section => section.classList.add("hidden"));
    const selectedInput = document.getElementById("inputType").value;
    document.getElementById(selectedInput + "Input").classList.remove("hidden");

    if (selectedInput === "webcam") {
        startWebcam();
    }
}

// Audio Recording
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

document.getElementById("recordButton").addEventListener("click", async function() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioChunks = [];
            sendToOpenAI(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        document.getElementById("recordButton").textContent = "Stop Recording";
    } catch (error) {
        console.error("Error starting recording:", error);
        alert("Could not start recording. Please check microphone permissions.");
    }
}


function stopRecording() {
    if (!mediaRecorder) {
        console.error("MediaRecorder is not initialized.");
        alert("Recording was not started properly.");
        return;
    }

    if (mediaRecorder.state !== "recording") {
        console.warn("MediaRecorder is not in a recording state.");
        return;
    }

    mediaRecorder.stop();
    isRecording = false;
    document.getElementById("recordButton").textContent = "Start Recording";
}

async function sendToOpenAI(audioBlob) {
    const apiKey = document.getElementById("apiKey").value;
    
    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "whisper-1"); // OpenAI's Whisper model for transcription

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
            document.getElementById("transcription").value = result.text; // Display transcribed text
        } else {
            console.error("Error in transcription:", result);
            alert("Failed to transcribe the audio.");
        }
    } catch (error) {
        console.error("Error sending audio:", error);
        alert("An error occurred while processing the audio.");
    }
}
});