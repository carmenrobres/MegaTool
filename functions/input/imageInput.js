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
                localStorage.removeItem("finalPrompt");
            }
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    setupImageInputSelectionListeners();
});

function setupImageInputSelectionListeners() {
    document.querySelectorAll('input[name="imageInputChoice"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateImageInputSelection("image", this.value);
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
