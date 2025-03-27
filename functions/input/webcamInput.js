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

// Stop webcam function
function stopWebcam() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

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