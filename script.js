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
}

function stopRecording() {
    mediaRecorder.stop();
    isRecording = false;
    document.getElementById("recordButton").textContent = "Start Recording";
}

async function sendToOpenAI(audioBlob) {
    const apiKey = document.getElementById("apiKey").value;
    if (!apiKey) {
        alert("Please enter your OpenAI API Key");
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
        document.getElementById("transcription").textContent = result.text || "Transcription failed.";
    } catch (error) {
        console.error("Error during transcription:", error);
        document.getElementById("transcription").textContent = "Error transcribing audio.";
    }
}
