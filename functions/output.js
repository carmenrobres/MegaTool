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

function handleOutputTypeChange() {
    const outputType = document.getElementById("outputType").value;
    const generateButton = document.getElementById("generateOutput");

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
async function generateOutput() {
    const apiKey = document.getElementById("apiKey").value;
    const zoocadApiKey = document.getElementById("zoocadApiKey").value;
    const meshyApiKey = document.getElementById("meshyApiKey").value;
    const inputText = localStorage.getItem("finalPrompt")?.trim() || "";
    
    const loadingMessage = document.getElementById("loadingOutput");

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!inputText) {
        alert("❌ Please provide input text before generating output.");
        return;
    }

    console.log("🚀 Using Input for Output Generation:", inputText);
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
            // Generate 3D model using Meshy API
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

// Function to poll Meshy task status and load model when ready
async function pollMeshyTaskStatus(taskId, meshyApiKey) {
    const endpoint = `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`;
    const headers = { "Authorization": `Bearer ${meshyApiKey}` };

    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(endpoint, { headers });
            const result = await response.json();

            if (result.status === "SUCCEEDED") {
                const objUrl = result.model_urls.obj;
                
                // Initialize the 3D viewer if not already initialized
                if (!isViewerInitialized) {
                    initViewer('output3DViewer');
                }
                
                // Load the OBJ model in the viewer
                loadOBJModel(objUrl);
                
                return objUrl; // Return the OBJ URL for download
            } else if (result.status === "FAILED") {
                throw new Error("Meshy task failed.");
            }
        } catch (error) {
            console.error("Error polling Meshy task status:", error);
            throw error;
        }

        attempts++;
        
        // Update the loading message with progress
        const output3DViewer = document.getElementById("output3DViewer");
        if (output3DViewer) {
            output3DViewer.innerHTML = `<div class="loading-3d">Generating 3D model... Attempt ${attempts}/${maxAttempts}</div>`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before polling again
    }

    throw new Error("Meshy task timeout.");
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

// Add this new function to your output.js file

// Function for generating 3D models from images using Meshy
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

        // Create a data URL from the base64 image
        const imageDataUrl = `data:image/png;base64,${base64Image}`;
        
        // Try the Meshy API
        const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${meshyApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mode: "preview",
                prompt: "Generate 3D model from this image",
                imageData: base64Image,
                art_style: "realistic",
                should_remesh: true
            })
        });

        let responseText = await response.text();
        let result;
        
        try {
            // Try to parse the response as JSON
            result = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse response as JSON:", responseText);
            throw new Error(`Failed to parse Meshy API response: ${responseText}`);
        }

        // Check for subscription error specifically
        if (responseText.includes("NoMoreConcurrentTasks") || 
            (result && result.message && result.message.includes("NoMoreConcurrentTasks"))) {
            
            // Display a more user-friendly message for subscription limits
            output3DViewer.innerHTML = `
                <div class="error-message">
                    <h3>Subscription Limit Reached</h3>
                    <p>Your Meshy account has reached its concurrent task limit.</p>
                    <p>Options to resolve this:</p>
                    <ul style="text-align: left; margin: 10px 20px;">
                        <li>Wait for your existing tasks to complete</li>
                        <li>Cancel pending tasks in your Meshy dashboard</li>
                        <li>Upgrade your subscription at <a href="https://www.meshy.ai/settings/subscription" target="_blank">Meshy.ai</a></li>
                    </ul>
                </div>
            `;
            throw new Error("Meshy subscription limit reached: You cannot run more concurrent tasks on your current plan.");
        }

        if (!response.ok) {
            throw new Error(`Meshy API error: ${responseText}`);
        }
        
        // Extract task ID
        const taskId = result.result;
        
        if (!taskId) {
            throw new Error("No task ID returned from Meshy API");
        }

        output3DViewer.innerHTML = '<div class="loading-3d">Task submitted successfully. Waiting for model generation...</div>';
        
        // Use your existing pollMeshyTaskStatus function
        const modelUrl = await pollMeshyTaskStatus(taskId, meshyApiKey);
        
        if (modelUrl) {
            download3DButton.classList.remove("hidden");
            download3DButton.setAttribute("data-model-url", modelUrl);
        } else {
            throw new Error("Failed to get model URL from completed task");
        }
    } catch (error) {
        console.error("Error in image-to-3D generation:", error);
        
        // Check if this is a subscription error and display a more user-friendly message
        if (error.message && error.message.includes("subscription limit")) {
            outputBox.value = `Meshy subscription limit reached: Please wait for your existing tasks to complete or upgrade your subscription.`;
        } else {
            outputBox.value = `Error generating 3D model from image: ${error.message}`;
        }
        
        outputBox.classList.remove("hidden");
        // Keep the 3D output visible if we already displayed a custom error message there
        if (!output3DViewer.innerHTML.includes("Subscription Limit Reached")) {
            output3D.classList.add("hidden");
        }
    } finally {
        loadingMessage.classList.add("hidden");
    }
}