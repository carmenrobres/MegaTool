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
    mediaRecorder.stop();
    isRecording = false;
    document.getElementById("recordButton").textContent = "Start Recording";
}
