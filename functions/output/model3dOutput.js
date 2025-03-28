// model3dOutput.js

// Three.js global variables
let scene, camera, renderer, controls, model;
let isViewerInitialized = false;

export async function generate3DOutput(apiKey, inputText, apiType = 'meshy') {
    const outputBox = document.getElementById("outputBox");
    const output3D = document.getElementById("output3D");
    const output3DViewer = document.getElementById("output3DViewer");
    const download3DButton = document.getElementById("download3D");
    const loadingMessage = document.getElementById("loadingOutput");

    if (!outputBox || !output3D || !output3DViewer) {
        console.error("Output elements not found");
        return;
    }

    try {
        if (apiType === 'meshy') {
            console.log("Generating 3D model with Meshy");
            
            const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
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
            console.log("Meshy API response:", result);
            
            if (result.result) {
                const taskId = result.result;
                
                // Show the 3D output container early for better UX
                output3D.classList.remove("hidden");
                output3DViewer.innerHTML = '<div class="loading-3d">Generating 3D model, please wait...</div>';
                outputBox.classList.add("hidden");
                
                const modelUrl = await pollMeshyTaskStatus(taskId, apiKey);
                if (modelUrl) {
                    download3DButton.classList.remove("hidden");
                    download3DButton.setAttribute("data-model-url", modelUrl);
                    console.log("3D model loaded successfully");
                } else {
                    outputBox.value = "Error: Failed to generate 3D model.";
                    outputBox.classList.remove("hidden");
                    output3D.classList.add("hidden");
                    console.error("Failed to get model URL");
                }
            } else {
                outputBox.value = result.error?.message || "Error: No valid response from Meshy API.";
                outputBox.classList.remove("hidden");
                console.error("Invalid Meshy API response:", result);
            }
        } else if (apiType === 'zoocad') {
            try {
                console.log("Sending request to backend proxy for ZooCAD...");

                const response = await fetch("http://localhost:5000/api/text-to-cad", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: inputText,
                        apiKey: apiKey
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error! Status: ${response.status}`);
                }

                const result = await response.json();
                console.log("ZooCAD Response:", result);

                if (result.model_url) {
                    output3DViewer.src = result.model_url;
                    output3DViewer.classList.remove("hidden");
                    console.log("ZooCAD model displayed");
                } else {
                    alert("Error: No valid 3D model received from ZooCAD.");
                    console.error("Invalid ZooCAD response:", result);
                }
            } catch (error) {
                console.error("Error contacting backend proxy:", error);
                alert("Error connecting to the backend. Make sure the server is running.");
            }
        }
    } catch (error) {
        console.error("Error generating 3D model:", error);
        outputBox.value = "Error generating 3D model: " + error.message;
        outputBox.classList.remove("hidden");
        output3D.classList.add("hidden");
    }
}

// Function to poll Meshy task status and load model when ready
async function pollMeshyTaskStatus(taskId, apiKey) {
    const endpoint = `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`;
    const headers = { "Authorization": `Bearer ${apiKey}` };

    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(endpoint, { headers });
            const result = await response.json();
            console.log(`Polling attempt ${attempts + 1}:`, result);

            if (result.status === "SUCCEEDED") {
                const objUrl = result.model_urls.obj;
                console.log("Model generation succeeded. URL:", objUrl);
                
                // Initialize the 3D viewer if not already initialized
                if (!isViewerInitialized) {
                    initViewer('output3DViewer');
                }
                
                // Load the OBJ model in the viewer
                loadOBJModel(objUrl);
                
                return objUrl; // Return the OBJ URL for download
            } else if (result.status === "FAILED") {
                console.error("Meshy task failed:", result);
                throw new Error("Meshy task failed: " + (result.error || "Unknown error"));
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

    throw new Error("Meshy task timeout after " + maxAttempts + " attempts.");
}

// Initialize the 3D viewer
function initViewer(containerId) {
    try {
        console.log("Initializing 3D viewer:", containerId);
        
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
            if (!camera || !renderer || !container) return;
            
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

// Load OBJ model with CORS proxy
function loadOBJModel(url) {
    console.log("Loading OBJ model:", url);
    
    if (!scene || !camera) {
        console.error("Scene or camera not initialized");
        return;
    }
    
    // Add a temporary loading message
    const container = document.getElementById('output3DViewer');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-3d';
    loadingDiv.textContent = 'Loading 3D model...';
    
    if (container && !container.querySelector('canvas')) {
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
        
        // Apply CORS proxy to the URL to fix CORS issues
        const proxiedUrl = proxyUrl(url);
        console.log("Using proxied URL:", proxiedUrl);
        
        loader.load(
            proxiedUrl,
            (loadedModel) => {
                model = loadedModel;
                console.log("Model loaded successfully");
                
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
            },
            (xhr) => {
                if (loadingDiv) {
                    loadingDiv.textContent = `Loading: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`;
                }
            },
            (error) => {
                console.error('Error loading OBJ model:', error);
                if (loadingDiv) {
                    loadingDiv.textContent = 'Error loading 3D model. CORS issues may be preventing access.';
                    loadingDiv.style.color = 'red';
                    
                    // Add download button as fallback
                    const downloadBtn = document.createElement('button');
                    downloadBtn.textContent = 'Download Model Instead';
                    downloadBtn.className = 'fallback-button';
                    downloadBtn.style.marginTop = '10px';
                    downloadBtn.addEventListener('click', function() {
                        // Create download link for the original URL
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'model.obj';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });
                    
                    if (container) {
                        container.appendChild(downloadBtn);
                    }
                }
            }
        );
    } catch (error) {
        console.error("Error creating or using OBJLoader:", error);
        if (loadingDiv && container) {
            loadingDiv.textContent = 'Error: 3D model loading failed. Try downloading instead.';
            loadingDiv.style.color = 'red';
            container.appendChild(loadingDiv);
        }
    }
}

// Function to download the generated 3D model
export function downloadGenerated3DModel() {
    console.log("Download 3D model function called");
    
    const downloadButton = document.getElementById("download3D");
    if (!downloadButton) {
        console.error("Download 3D button not found");
        return;
    }
    
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
    console.log("3D model downloaded");
}

// Function to add preview button after download
function addPreviewButton() {
    const modelControlsDiv = document.querySelector('.model-controls');
    if (!modelControlsDiv) {
        console.error("Model controls div not found");
        return;
    }
    
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
    console.log("Preview button added");
}

// Function to preview locally uploaded OBJ file
function previewLocalOBJFile(file) {
    console.log("Preview local OBJ file:", file.name);
    
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
        const output3D = document.getElementById('output3D');
        if (output3D) {
            output3D.classList.remove('hidden');
        }
        
        // Initialize the viewer if not already initialized
        if (!isViewerInitialized) {
            initViewer('output3DViewer');
        }
        
        // Load the model
        loadOBJModel(url);
    };
    
    reader.readAsText(file);
}

// Clean up Three.js resources
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

// Function to generate a timestamped filename
function generateFilename(type) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    return `${dateStr}_${type}.obj`; // Save as OBJ format
}

// CORS Proxy for external URLs
function proxyUrl(url) {
    if (url.includes('assets.meshy.ai') || url.includes('zoo.dev')) {
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }
    return url;
}