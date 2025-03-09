document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for output type change
    document.getElementById("outputType")?.addEventListener("change", handleOutputTypeChange);
    
    // Add event listener for generate button
    document.getElementById("generateOutput")?.addEventListener("click", generateOutput);

    // Add event listener for the download button
    document.getElementById("downloadImage")?.addEventListener("click", downloadGeneratedImage);
    
    // Add event listener for the download 3D button
    document.getElementById("download3D")?.addEventListener("click", downloadGenerated3DModel);
});

// Three.js global variables
let scene, camera, renderer, controls, model;
let isViewerInitialized = false;

// Update this function in your output.js file
function handleOutputTypeChange() {
    const outputType = document.getElementById("outputType").value;
    const generateButton = document.getElementById("generateOutput");
    const inputType = document.getElementById("inputType").value;

    // Show generate button only when output type is selected
    generateButton.classList.toggle("hidden", !outputType);

    // Hide all output elements
    document.getElementById("outputBox").classList.add("hidden");
    document.getElementById("outputImage").classList.add("hidden");
    document.getElementById("downloadImage").classList.add("hidden");
    document.getElementById("output3D").classList.add("hidden");
    document.getElementById("download3D").classList.add("hidden");

    // Remove preview button if it exists
    const previewButton = document.getElementById("preview3D");
    if (previewButton) {
        previewButton.remove();
    }

    // Clear output fields
    const outputBox = document.getElementById("outputBox");
    if (outputBox) outputBox.value = "";
    const outputImage = document.getElementById("outputImage");
    if (outputImage) outputImage.src = "";
    
    // Reset Three.js variables if the output type is changed
    cleanupThreeJS();
    
    // Special handling for Meshy when using images
    if (outputType === "meshy" && (inputType === "image" || inputType === "webcam")) {
        // If image or webcam is the input, check the "use image as input" radio button
        if (inputType === "image") {
            const imageInput = document.querySelector('input[name="imageInputChoice"][value="image"]');
            if (imageInput) {
                imageInput.checked = true;
                // Trigger the change event to update localStorage
                const event = new Event('change');
                imageInput.dispatchEvent(event);
            }
        } else if (inputType === "webcam") {
            const webcamInput = document.querySelector('input[name="webcamInputChoice"][value="image"]');
            if (webcamInput) {
                webcamInput.checked = true;
                // Trigger the change event to update localStorage
                const event = new Event('change');
                webcamInput.dispatchEvent(event);
            }
        }
        
        // Add a helpful message
        const helpMessage = document.createElement('p');
        helpMessage.id = 'meshyImageHelp';
        helpMessage.className = 'info-message';
        helpMessage.textContent = 'Using the image directly for 3D model generation';
        helpMessage.style.color = '#28a745';
        helpMessage.style.fontWeight = 'bold';
        helpMessage.style.margin = '10px 0';
        
        // Add it near the generate button
        const parentElement = generateButton.parentElement;
        if (parentElement && !document.getElementById('meshyImageHelp')) {
            parentElement.insertBefore(helpMessage, generateButton);
        }
    } else {
        // Remove the help message if it exists
        const helpMessage = document.getElementById('meshyImageHelp');
        if (helpMessage) {
            helpMessage.remove();
        }
    }
}

function cleanupThreeJS() {
    if (renderer) {
        const container = document.getElementById("output3DViewer");
        if (container && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
        renderer = null;
    }
    
    if (scene) {
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
        scene = null;
    }
    
    camera = null;
    controls = null;
    model = null;
    isViewerInitialized = false;
}

// Initialize the 3D viewer
function initViewer(containerId) {
    try {
        // Clean up any existing viewer
        cleanupThreeJS();
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222222);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 5;
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Clear container and add renderer
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Add OrbitControls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        
        // Animation loop
        function animate() {
            if (!renderer || !scene || !camera) return;
            
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (!camera || !renderer) return;
            
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        
        isViewerInitialized = true;
        console.log("3D Viewer initialized successfully");
    } catch (error) {
        console.error("Error initializing 3D viewer:", error);
        
        // Show error message in container
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="error-message" style="color: red; padding: 20px; text-align: center;">Error initializing 3D viewer.<br>Please check your browser console for details.</div>';
        }
    }
}

// Load OBJ model
function loadOBJModel(url) {
    if (!scene || !camera) {
        console.error("Scene or camera not initialized");
        return;
    }
    
    // Add a temporary loading message
    const container = document.getElementById('output3DViewer');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-3d';
    loadingDiv.textContent = 'Loading 3D model...';
    
    if (container && !renderer) {
        container.innerHTML = '';
        container.appendChild(loadingDiv);
    }
    
    // Clear previous model if it exists
    if (model && scene) {
        scene.remove(model);
        model = null;
    }
    
    try {
        // Create new OBJLoader
        const loader = new THREE.OBJLoader();
        
        loader.load(
            url,
            (loadedModel) => {
                model = loadedModel;
                
                // Center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                model.position.x = -center.x;
                model.position.y = -center.y;
                model.position.z = -center.z;
                
                // Adjust camera position based on model size
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.z = maxDim * 2;
                
                // Add model to scene
                scene.add(model);
                
                // Remove loading message if it exists
                if (container && loadingDiv.parentNode === container) {
                    container.removeChild(loadingDiv);
                }
                
                console.log("Model loaded successfully");
            },
            (xhr) => {
                if (loadingDiv) {
                    loadingDiv.textContent = `Loading: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`;
                }
            },
            (error) => {
                console.error('Error loading OBJ model:', error);
                if (loadingDiv) {
                    loadingDiv.textContent = 'Error loading 3D model';
                    loadingDiv.style.color = 'red';
                }
            }
        );
    } catch (error) {
        console.error("Error creating or using OBJLoader:", error);
        if (loadingDiv && container) {
            loadingDiv.textContent = 'Error: 3D model loading failed';
            loadingDiv.style.color = 'red';
            container.appendChild(loadingDiv);
        }
    }
}

// Function to generate output (text, image, 3D)
// Updated generateOutput function with image-to-3D support
async function generateOutput() {
    const apiKey = document.getElementById("apiKey").value;
    const zoocadApiKey = document.getElementById("zoocadApiKey").value;
    const meshyApiKey = document.getElementById("meshyApiKey").value;
    const inputText = localStorage.getItem("finalPrompt")?.trim() || "";
    
    const loadingMessage = document.getElementById("loadingOutput");
    const inputType = document.getElementById("inputType").value;

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    // Get output type
    const outputType = document.getElementById("outputType").value;
    const outputBox = document.getElementById("outputBox");
    const outputImage = document.getElementById("outputImage");
    const output3D = document.getElementById("output3D");
    const output3DViewer = document.getElementById("output3DViewer");
    const downloadButton = document.getElementById("downloadImage");
    const download3DButton = document.getElementById("download3D");

    if (outputType === "meshy" && !meshyApiKey) {
        alert("Please enter your Meshy API Key.");
        return;
    }

    if (outputType === "zoocad" && !zoocadApiKey) {
        alert("Please enter your ZooCAD API Key.");
        return;
    }

    // Check if we have the required inputs based on input and output types
    if (outputType !== "meshy" && !inputText) {
        alert("❌ Please provide input text before generating output.");
        return;
    }

    // Special handling for image-to-3D with Meshy
    if (outputType === "meshy" && (inputType === "image" || inputType === "webcam")) {
        // Check if "use image as input" is selected
        const useImageAsInput = inputType === "image" 
            ? document.querySelector('input[name="imageInputChoice"][value="image"]').checked
            : document.querySelector('input[name="webcamInputChoice"][value="image"]').checked;

        if (useImageAsInput) {
            // Get the image source
            let imageSource;
            if (inputType === "image") {
                imageSource = document.getElementById("imagePreview");
            } else if (inputType === "webcam") {
                imageSource = document.getElementById("capturedImage");
            }

            if (!imageSource || !imageSource.src || imageSource.classList.contains("hidden")) {
                alert("❌ Please provide an image before generating 3D model.");
                return;
            }

            // Show the loading message
            loadingMessage.classList.remove("hidden");

            // Remove preview button if it exists
            const previewButton = document.getElementById("preview3D");
            if (previewButton) {
                previewButton.remove();
            }

            try {
                // Convert image to base64 and remove the data URL prefix
                const base64Image = imageSource.src.split(',')[1];
                
                // Call Meshy API with image
                await generateMeshyFrom3DImage(base64Image, meshyApiKey);
                
                return; // Exit early as we've handled the image case
            } catch (error) {
                console.error("Error generating 3D model from image:", error);
                outputBox.value = "Error generating 3D model from image.";
                outputBox.classList.remove("hidden");
                output3D.classList.add("hidden");
                loadingMessage.classList.add("hidden");
                return;
            }
        }
    }

    console.log("🚀 Using Input for Output Generation:", inputText);

    // Remove preview button if it exists
    const previewButton = document.getElementById("preview3D");
    if (previewButton) {
        previewButton.remove();
    }

    // Show the loading message before making API requests
    loadingMessage.classList.remove("hidden");

    try {
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
                    downloadButton.classList.add("hidden");
                    output3D.classList.add("hidden");
                } else {
                    outputBox.value = "Error: No valid response from API.";
                    outputBox.classList.remove("hidden");
                }
            } catch (error) {
                console.error("Error generating text:", error);
                outputBox.value = "Error generating output.";
                outputBox.classList.remove("hidden");
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
                    downloadButton.classList.remove("hidden");
                    downloadButton.setAttribute("data-image-url", result.data[0].url);
                    output3D.classList.add("hidden");
                } else {
                    outputImage.classList.add("hidden");
                    outputBox.value = "Error: No image generated.";
                    outputBox.classList.remove("hidden");
                    downloadButton.classList.add("hidden");
                }
            } catch (error) {
                console.error("Error generating image:", error);
                outputBox.value = "Error generating output.";
                outputBox.classList.remove("hidden");
            }
        } else if (outputType === "meshy") {
            // Generate 3D model using Meshy API with text prompt
            try {
                const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${meshyApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mode: "preview",
                        prompt: inputText,
                        art_style: "realistic",
                        should_remesh: true
                    })
                });

                const result = await response.json();
                if (result.result) {
                    const taskId = result.result;
                    
                    // Show the 3D output container early for better UX
                    output3D.classList.remove("hidden");
                    output3DViewer.innerHTML = '<div class="loading-3d">Generating 3D model, please wait...</div>';
                    outputBox.classList.add("hidden");
                    outputImage.classList.add("hidden");
                    
                    const modelUrl = await pollMeshyTaskStatus(taskId, meshyApiKey);
                    if (modelUrl) {
                        download3DButton.classList.remove("hidden");
                        download3DButton.setAttribute("data-model-url", modelUrl);
                    } else {
                        outputBox.value = "Error: Failed to generate 3D model.";
                        outputBox.classList.remove("hidden");
                        output3D.classList.add("hidden");
                    }
                } else {
                    outputBox.value = "Error: No valid response from Meshy API.";
                    outputBox.classList.remove("hidden");
                }
            } catch (error) {
                console.error("Error generating 3D model with Meshy:", error);
                outputBox.value = "Error generating 3D model.";
                outputBox.classList.remove("hidden");
                output3D.classList.add("hidden");
            }
        } else if (outputType === "zoocad") {
            // Your existing zoocad code here
        }
    } catch (error) {
        console.error("Error generating output:", error);
        outputBox.value = "Error generating output.";
        outputBox.classList.remove("hidden");
    } finally {
        // Hide the loading message when the response is received
        loadingMessage.classList.add("hidden");
    }
}

// New function for generating 3D models from images using Meshy
// Updated function for generating 3D models from images using Meshy API
async function generateMeshyFrom3DImage(base64Image, meshyApiKey) {
    const outputBox = document.getElementById("outputBox");
    const output3D = document.getElementById("output3D");
    const output3DViewer = document.getElementById("output3DViewer");
    const download3DButton = document.getElementById("download3D");
    const loadingMessage = document.getElementById("loadingOutput");

    try {
        // Show the 3D output container early for better UX
        output3D.classList.remove("hidden");
        output3DViewer.innerHTML = '<div class="loading-3d">Preparing to upload image for 3D conversion...</div>';
        outputBox.classList.add("hidden");

        // First, we need to upload the image to a temporary URL service or convert to a data URL
        // For this implementation, we'll first try direct Base64 upload with image_url parameter
        
        // Create a data URL from the base64 image
        const imageDataUrl = `data:image/png;base64,${base64Image}`;
        
        // Try the meshy API with image_url instead of image_data
        const response = await fetch("https://api.meshy.ai/v1/image-to-3d", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${meshyApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                image_url: imageDataUrl,
                generate_normal_map: true,
                generate_mtl: true
            })
        });

        // If we get a 400 error, let's try with the v2 endpoint
        if (!response.ok && (response.status === 400 || response.status === 404)) {
            const errorText = await response.text();
            console.log("First API attempt failed:", errorText);
            
            output3DViewer.innerHTML = '<div class="loading-3d">First attempt failed. Trying alternative approach...</div>';
            
            // Try without the data URL prefix, just raw base64
            const secondResponse = await fetch("https://api.meshy.ai/v2/image-to-3d", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${meshyApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    image_data: base64Image, // Try with image_data again but with v2 endpoint
                    generate_normal_map: true,
                    generate_mtl: true
                })
            });
            
            if (!secondResponse.ok) {
                // If second attempt fails, try a third approach with a different parameter structure
                const secondErrorText = await secondResponse.text();
                console.log("Second API attempt failed:", secondErrorText);
                
                output3DViewer.innerHTML = '<div class="loading-3d">Second attempt failed. Trying final approach...</div>';
                
                const thirdResponse = await fetch("https://api.meshy.ai/v1/image-to-3d", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${meshyApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        image: {
                            data: base64Image
                        },
                        settings: {
                            generate_normal_map: true,
                            generate_mtl: true
                        }
                    })
                });
                
                if (!thirdResponse.ok) {
                    // All attempts failed - let's show the detailed error messages
                    const thirdErrorText = await thirdResponse.text();
                    console.log("Third API attempt failed:", thirdErrorText);
                    
                    throw new Error(`All API attempts failed. Last error: ${thirdErrorText}`);
                }
                
                // If third attempt succeeded, use this response for further processing
                var result = await thirdResponse.json();
            } else {
                // Second attempt succeeded
                var result = await secondResponse.json();
            }
        } else if (!response.ok) {
            // Other error than 400/404
            const errorText = await response.text();
            throw new Error(`Meshy API error: ${errorText}`);
        } else {
            // First attempt succeeded
            var result = await response.json();
        }
        
        // Extract task ID - different APIs might have different response structures
        const taskId = result.id || result.task_id || result.result;
        
        if (!taskId) {
            throw new Error("No task ID returned from Meshy API");
        }

        output3DViewer.innerHTML = '<div class="loading-3d">Task submitted successfully. Waiting for model generation...</div>';
        
        // Poll for task completion using a flexible polling function
        const modelUrl = await pollMeshyTaskFlexible(taskId, meshyApiKey);
        
        if (modelUrl) {
            download3DButton.classList.remove("hidden");
            download3DButton.setAttribute("data-model-url", modelUrl);
        } else {
            throw new Error("Failed to get model URL from completed task");
        }
    } catch (error) {
        console.error("Error in image-to-3D generation:", error);
        outputBox.value = `Error generating 3D model from image: ${error.message}`;
        outputBox.classList.remove("hidden");
        output3D.classList.add("hidden");
    } finally {
        loadingMessage.classList.add("hidden");
    }
}

// Flexible polling function that tries multiple endpoint formats
async function pollMeshyTaskFlexible(taskId, meshyApiKey) {
    // Potential endpoints to try
    const endpointFormats = [
        `https://api.meshy.ai/v1/image-to-3d/${taskId}`,
        `https://api.meshy.ai/v2/image-to-3d/${taskId}`,
        `https://api.meshy.ai/v1/tasks/${taskId}`,
        `https://api.meshy.ai/v2/tasks/${taskId}`
    ];
    
    let lastError = null;
    let attempts = 0;
    const maxAttempts = 40; // More attempts with shorter intervals
    const output3DViewer = document.getElementById("output3DViewer");
    
    // Find a working endpoint first
    let workingEndpoint = null;
    
    for (const endpoint of endpointFormats) {
        try {
            const response = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${meshyApiKey}` }
            });
            
            if (response.ok) {
                workingEndpoint = endpoint;
                console.log("Found working endpoint:", workingEndpoint);
                break;
            }
        } catch (error) {
            console.warn(`Endpoint ${endpoint} failed:`, error);
        }
    }
    
    if (!workingEndpoint) {
        throw new Error("Could not find a working API endpoint to check task status");
    }
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(workingEndpoint, {
                headers: { "Authorization": `Bearer ${meshyApiKey}` }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Polling attempt ${attempts + 1}, status:`, result.status || "unknown");
            
            // Check various status field possibilities
            const status = result.status || result.state || "";
            
            if (status.toUpperCase() === "SUCCEEDED" || status.toUpperCase() === "COMPLETED") {
                // Look for model URL in various possible locations in the response
                let objUrl = null;
                
                // Try different possible paths to the OBJ URL
                if (result.model_urls && result.model_urls.obj) {
                    objUrl = result.model_urls.obj;
                } else if (result.result && result.result.model_urls && result.result.model_urls.obj) {
                    objUrl = result.result.model_urls.obj;
                } else if (result.data && result.data.model_urls && result.data.model_urls.obj) {
                    objUrl = result.data.model_urls.obj;
                } else if (result.output && result.output.obj_url) {
                    objUrl = result.output.obj_url;
                }
                
                if (!objUrl) {
                    // If we couldn't find the OBJ URL, log the entire response for debugging
                    console.error("Task succeeded but could not find model URL in response:", result);
                    throw new Error("Model URL not found in successful response");
                }
                
                // Update the viewer with success message
                if (output3DViewer) {
                    output3DViewer.innerHTML = '<div class="loading-3d" style="color: #28a745;">3D model generated successfully! Loading preview...</div>';
                }
                
                // Initialize the 3D viewer if not already initialized
                if (!isViewerInitialized) {
                    initViewer('output3DViewer');
                }
                
                // Load the OBJ model in the viewer
                loadOBJModel(objUrl);
                
                return objUrl;
            } else if (status.toUpperCase() === "FAILED" || status.toUpperCase() === "ERROR") {
                // Show error message in viewer
                if (output3DViewer) {
                    output3DViewer.innerHTML = `
                        <div class="error-message">
                            <p>Failed to generate 3D model from image.</p>
                            <p>${result.message || result.error || 'Task failed'}</p>
                            <p>Please try a different image or settings.</p>
                        </div>
                    `;
                }
                throw new Error(result.message || result.error || "Task failed");
            } else {
                // Still processing
                const progress = result.progress || 0;
                const progressPercent = Math.round(progress * 100);
                
                // Get current step if available
                const step = result.step || result.current_step || "Processing";
                
                if (output3DViewer) {
                    output3DViewer.innerHTML = `
                        <div class="loading-3d">
                            <p>Generating 3D model from image...</p>
                            <p>Progress: ${progressPercent}%</p>
                            <p>Current step: ${step}</p>
                            <p>Attempt ${attempts + 1}/${maxAttempts}</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error(`Error polling task (attempt ${attempts + 1}):`, error);
            lastError = error;
            
            // Show error in viewer but continue polling
            if (output3DViewer) {
                output3DViewer.innerHTML = `
                    <div class="loading-3d" style="color: #ffc107;">
                        <p>Warning: Error checking status (attempt ${attempts + 1})</p>
                        <p>Will retry in 8 seconds...</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 8000)); // Wait 8 seconds before polling again
    }

    // If we reach here, it's a timeout
    if (output3DViewer) {
        output3DViewer.innerHTML = `
            <div class="error-message">
                <p>Timeout after ${maxAttempts} attempts.</p>
                <p>The 3D model generation is taking too long.</p>
                <p>You can try again with a different image.</p>
                <p>Last error: ${lastError ? lastError.message : 'None'}</p>
            </div>
        `;
    }
    
    throw new Error("Task timeout after " + maxAttempts + " attempts");
}

// Flexible polling function that tries multiple endpoint formats
async function pollMeshyTaskFlexible(taskId, meshyApiKey) {
    // Potential endpoints to try
    const endpointFormats = [
        `https://api.meshy.ai/v1/image-to-3d/${taskId}`,
        `https://api.meshy.ai/v2/image-to-3d/${taskId}`,
        `https://api.meshy.ai/v1/tasks/${taskId}`,
        `https://api.meshy.ai/v2/tasks/${taskId}`
    ];
    
    let lastError = null;
    let attempts = 0;
    const maxAttempts = 40; // More attempts with shorter intervals
    const output3DViewer = document.getElementById("output3DViewer");
    
    // Find a working endpoint first
    let workingEndpoint = null;
    
    for (const endpoint of endpointFormats) {
        try {
            const response = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${meshyApiKey}` }
            });
            
            if (response.ok) {
                workingEndpoint = endpoint;
                console.log("Found working endpoint:", workingEndpoint);
                break;
            }
        } catch (error) {
            console.warn(`Endpoint ${endpoint} failed:`, error);
        }
    }
    
    if (!workingEndpoint) {
        throw new Error("Could not find a working API endpoint to check task status");
    }
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(workingEndpoint, {
                headers: { "Authorization": `Bearer ${meshyApiKey}` }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Polling attempt ${attempts + 1}, status:`, result.status || "unknown");
            
            // Check various status field possibilities
            const status = result.status || result.state || "";
            
            if (status.toUpperCase() === "SUCCEEDED" || status.toUpperCase() === "COMPLETED") {
                // Look for model URL in various possible locations in the response
                let objUrl = null;
                
                // Try different possible paths to the OBJ URL
                if (result.model_urls && result.model_urls.obj) {
                    objUrl = result.model_urls.obj;
                } else if (result.result && result.result.model_urls && result.result.model_urls.obj) {
                    objUrl = result.result.model_urls.obj;
                } else if (result.data && result.data.model_urls && result.data.model_urls.obj) {
                    objUrl = result.data.model_urls.obj;
                } else if (result.output && result.output.obj_url) {
                    objUrl = result.output.obj_url;
                }
                
                if (!objUrl) {
                    // If we couldn't find the OBJ URL, log the entire response for debugging
                    console.error("Task succeeded but could not find model URL in response:", result);
                    throw new Error("Model URL not found in successful response");
                }
                
                // Update the viewer with success message
                if (output3DViewer) {
                    output3DViewer.innerHTML = '<div class="loading-3d" style="color: #28a745;">3D model generated successfully! Loading preview...</div>';
                }
                
                // Initialize the 3D viewer if not already initialized
                if (!isViewerInitialized) {
                    initViewer('output3DViewer');
                }
                
                // Load the OBJ model in the viewer
                loadOBJModel(objUrl);
                
                return objUrl;
            } else if (status.toUpperCase() === "FAILED" || status.toUpperCase() === "ERROR") {
                // Show error message in viewer
                if (output3DViewer) {
                    output3DViewer.innerHTML = `
                        <div class="error-message">
                            <p>Failed to generate 3D model from image.</p>
                            <p>${result.message || result.error || 'Task failed'}</p>
                            <p>Please try a different image or settings.</p>
                        </div>
                    `;
                }
                throw new Error(result.message || result.error || "Task failed");
            } else {
                // Still processing
                const progress = result.progress || 0;
                const progressPercent = Math.round(progress * 100);
                
                // Get current step if available
                const step = result.step || result.current_step || "Processing";
                
                if (output3DViewer) {
                    output3DViewer.innerHTML = `
                        <div class="loading-3d">
                            <p>Generating 3D model from image...</p>
                            <p>Progress: ${progressPercent}%</p>
                            <p>Current step: ${step}</p>
                            <p>Attempt ${attempts + 1}/${maxAttempts}</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error(`Error polling task (attempt ${attempts + 1}):`, error);
            lastError = error;
            
            // Show error in viewer but continue polling
            if (output3DViewer) {
                output3DViewer.innerHTML = `
                    <div class="loading-3d" style="color: #ffc107;">
                        <p>Warning: Error checking status (attempt ${attempts + 1})</p>
                        <p>Will retry in 8 seconds...</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 8000)); // Wait 8 seconds before polling again
    }

    // If we reach here, it's a timeout
    if (output3DViewer) {
        output3DViewer.innerHTML = `
            <div class="error-message">
                <p>Timeout after ${maxAttempts} attempts.</p>
                <p>The 3D model generation is taking too long.</p>
                <p>You can try again with a different image.</p>
                <p>Last error: ${lastError ? lastError.message : 'None'}</p>
            </div>
        `;
    }
    
    throw new Error("Task timeout after " + maxAttempts + " attempts");
}

// Add a new function to poll for image-to-3D task status
async function pollMeshyImageTaskStatus(taskId, meshyApiKey) {
    // Use the correct endpoint for checking image-to-3D task status
    const endpoint = `https://api.meshy.ai/openapi/v2/image-to-3d/tasks/${taskId}`;
    const headers = { "Authorization": `Bearer ${meshyApiKey}` };

    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)
    const output3DViewer = document.getElementById("output3DViewer");
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(endpoint, { headers });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            
            const result = await response.json();

            // Log progress for debugging
            console.log(`Meshy image task status (attempt ${attempts+1}/${maxAttempts}):`, result.status);

            if (result.status === "SUCCEEDED") {
                // The structure of result for image-to-3D may be different
                const objUrl = result.result?.model_urls?.obj || result.model_urls?.obj;
                
                if (!objUrl) {
                    throw new Error("Model URL not found in the successful response");
                }
                
                // Update the viewer with success message
                if (output3DViewer) {
                    output3DViewer.innerHTML = '<div class="loading-3d" style="color: #28a745;">3D model generated successfully! Loading preview...</div>';
                }
                
                // Initialize the 3D viewer if not already initialized
                if (!isViewerInitialized) {
                    initViewer('output3DViewer');
                }
                
                // Load the OBJ model in the viewer
                loadOBJModel(objUrl);
                
                return objUrl; // Return the OBJ URL for download
            } else if (result.status === "FAILED") {
                // Show error message in viewer
                if (output3DViewer) {
                    output3DViewer.innerHTML = `
                        <div class="error-message">
                            <p>Failed to generate 3D model from image.</p>
                            <p>${result.message || 'Unknown error'}</p>
                            <p>Please try a different image or settings.</p>
                        </div>
                    `;
                }
                throw new Error(result.message || "Meshy task failed.");
            } else if (result.status === "PROCESSING") {
                // Update progress information
                const progress = result.progress || 0;
                const progressPercent = Math.round(progress * 100);
                
                if (output3DViewer) {
                    output3DViewer.innerHTML = `
                        <div class="loading-3d">
                            <p>Generating 3D model from image... ${progressPercent}% complete</p>
                            <p>Step: ${result.current_step || 'Processing'}</p>
                            <p>Attempt ${attempts + 1}/${maxAttempts}</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error("Error polling Meshy image task status:", error);
            
            // Show error in viewer but continue polling
            if (output3DViewer) {
                output3DViewer.innerHTML = `
                    <div class="loading-3d" style="color: #ffc107;">
                        <p>Warning: Error checking status (attempt ${attempts + 1})</p>
                        <p>Will retry in 10 seconds...</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before polling again
    }

    // If we reach here, it's a timeout
    if (output3DViewer) {
        output3DViewer.innerHTML = `
            <div class="error-message">
                <p>Timeout after ${maxAttempts} attempts.</p>
                <p>The 3D model generation is taking too long.</p>
                <p>You can try again with a different image.</p>
            </div>
        `;
    }
    
    throw new Error("Meshy image task timeout after " + maxAttempts + " attempts.");
}

// Function to generate a timestamped filename
function generateFilename(type) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    return `${dateStr}_${type}.obj`; // Save as OBJ format
}

// Function to download the generated 3D model
function downloadGenerated3DModel() {
    const downloadButton = document.getElementById("download3D");
    const modelUrl = downloadButton.getAttribute("data-model-url");

    if (!modelUrl) {
        alert("No 3D model available for download.");
        return;
    }

    // Determine if it's a Mesh or CAD file based on output type
    const outputType = document.getElementById("outputType").value;
    const fileType = outputType === "meshy" ? "Mesh" : "CAD";
    const filename = generateFilename(fileType);

    // Create and trigger the download
    const link = document.createElement("a");
    link.href = modelUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Add preview button after download
    addPreviewButton();
}

// Function to add preview button after download
function addPreviewButton() {
    const modelControlsDiv = document.querySelector('.model-controls');
    if (!modelControlsDiv) return;
    
    // Check if preview button already exists
    if (document.getElementById('preview3D')) {
        return;
    }
    
    // Create preview button
    const previewButton = document.createElement('button');
    previewButton.id = 'preview3D';
    previewButton.textContent = 'Preview Downloaded File';
    previewButton.className = 'preview-button';
    
    // Add click event to preview button
    previewButton.addEventListener('click', function() {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.obj';
        fileInput.style.display = 'none';
        
        // Add change event to file input
        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                previewLocalOBJFile(e.target.files[0]);
            }
        });
        
        // Add file input to document and trigger click
        document.body.appendChild(fileInput);
        fileInput.click();
        
        // Remove file input after use
        setTimeout(() => {
            document.body.removeChild(fileInput);
        }, 1000);
    });
    
    // Add preview button after download button
    modelControlsDiv.appendChild(previewButton);
}

// Function to preview locally uploaded OBJ file
function previewLocalOBJFile(file) {
    // Check if file is OBJ
    if (!file.name.toLowerCase().endsWith('.obj')) {
        alert('Please select an OBJ file for preview.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const contents = e.target.result;
        
        // Create a blob URL for the file contents
        const blob = new Blob([contents], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Show the 3D viewer container
        document.getElementById('output3D').classList.remove('hidden');
        
        // Initialize the viewer if not already initialized
        if (!isViewerInitialized) {
            initViewer('output3DViewer');
        }
        
        // Load the model
        loadOBJModel(url);
    };
    
    reader.readAsText(file);
}

// Function to download the generated image
function downloadGeneratedImage() {
    const downloadButton = document.getElementById("downloadImage");
    const imageUrl = downloadButton.getAttribute("data-image-url");

    if (!imageUrl) {
        alert("No image available for download.");
        return;
    }

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "generated_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}