document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar controls
    document.getElementById("openSidebar")?.addEventListener("click", function() {
        document.getElementById("sidebar").classList.add("open");
    });

    document.getElementById("closeSidebar")?.addEventListener("click", function() {
        document.getElementById("sidebar").classList.remove("open");
    });

    // Global navigation function
    window.navigateTo = function(pageId) {
        document.querySelectorAll(".page").forEach(page => {
            page.style.display = 'none';
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            localStorage.setItem("lastPage", pageId);
        }
    };

    // Load initial page
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
});

function handleInputChange() {
    document.querySelectorAll(".input-section").forEach(section => section.classList.add("hidden"));
    const selectedInput = document.getElementById("inputType").value;
    document.getElementById(selectedInput + "Input").classList.remove("hidden");
    
    if (selectedInput === "webcam") {
        startWebcam();
    }
}

// Fixing Output Generation to support Text and Image
async function generateOutput() {
    const apiKey = document.getElementById("apiKey").value;
    const inputText = document.getElementById("userText")?.value.trim() || document.getElementById("transcription")?.value.trim();
    const outputType = document.getElementById("outputType").value;
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");

    if (!apiKey) {
        alert("Please enter your OpenAI API Key");
        return;
    }
    
    if (!inputText) {
        alert("Please provide input text before generating output.");
        return;
    }

    if (outputType === "text") {
        const endpoint = "https://api.openai.com/v1/chat/completions";
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{ role: "user", content: inputText }],
                    max_tokens: 100
                })
            });

            const result = await response.json();
            if (result.choices && result.choices.length > 0 && result.choices[0].message) {
                outputBox.value = result.choices[0].message.content.trim();
                outputBox.classList.remove("hidden");
                outputImage.classList.add("hidden");
            } else {
                outputBox.value = "Error: No valid response from API.";
            }
        } catch (error) {
            console.error("Error generating text:", error);
            outputBox.value = "Error generating output.";
        }
    } else if (outputType === "image") {
        const endpoint = "https://api.openai.com/v1/images/generations";
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "dall-e-2",
                    prompt: inputText,
                    n: 1,
                    size: "1024x1024"
                })
            });

            const result = await response.json();
            if (result.data && result.data.length > 0) {
                outputImage.src = result.data[0].url;
                outputImage.classList.remove("hidden");
                outputBox.classList.add("hidden");
            } else {
                outputImage.classList.add("hidden");
                outputBox.value = "Error: No image generated.";
            }
        } catch (error) {
            console.error("Error generating image:", error);
            outputBox.value = "Error generating output.";
        }
    }
}

document.getElementById("generateOutput").addEventListener("click", generateOutput);
