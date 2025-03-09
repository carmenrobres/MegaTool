document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('analyze3DPrint')?.addEventListener('click', analyze3DPrint);
    document.getElementById('objUpload')?.addEventListener('change', handleObjUpload);
    
    // Initialize the 3D canvas
    initCanvas();
});

// Global variables for Three.js
let makeScene, makeCamera, makeRenderer, makeControls, makeModel;

// Initialize the canvas for 3D model preview
function initCanvas() {
    const canvas = document.getElementById('objCanvas');
    if (!canvas) return;
    
    // Set canvas size based on container
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Create scene
    makeScene = new THREE.Scene();
    makeScene.background = new THREE.Color(0x222222);
    
    // Create camera
    makeCamera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    makeCamera.position.z = 5;
    
    // Create renderer
    makeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    makeRenderer.setSize(canvas.width, canvas.height);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    makeScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    makeScene.add(directionalLight);
    
    // Add OrbitControls
    makeControls = new THREE.OrbitControls(makeCamera, canvas);
    makeControls.enableDamping = true;
    makeControls.dampingFactor = 0.25;
    
    // Add a grid helper for better visualization
    const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    makeScene.add(gridHelper);
    
    // Add an axes helper
    const axesHelper = new THREE.AxesHelper(5);
    makeScene.add(axesHelper);
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        makeControls.update();
        makeRenderer.render(makeScene, makeCamera);
    }
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update canvas size
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Update camera aspect ratio
        makeCamera.aspect = canvas.width / canvas.height;
        makeCamera.updateProjectionMatrix();
        
        // Update renderer size
        makeRenderer.setSize(canvas.width, canvas.height);
    });
}

// Handle OBJ file upload
function handleObjUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show placeholder text while loading
    const helpText = document.querySelector('.help-text');
    if (helpText) {
        helpText.textContent = 'Loading 3D model...';
    }
    
    // Clear previous analysis
    const printInstructions = document.getElementById('printInstructions');
    if (printInstructions) {
        printInstructions.value = '';
        printInstructions.classList.add('hidden');
    }
    
    // Create object URL for the file
    const objUrl = URL.createObjectURL(file);
    
    // Load the model in the viewer
    loadObjModel(objUrl, file.name);
}

// Load OBJ model into the canvas
function loadObjModel(url, filename = 'model.obj') {
    if (!makeScene) {
        console.error("3D scene not initialized");
        return;
    }
    
    // Clear previous model
    if (makeModel) {
        makeScene.remove(makeModel);
        makeModel = null;
    }
    
    // Create OBJ loader
    const loader = new THREE.OBJLoader();
    
    loader.load(
        url,
        (object) => {
            makeModel = object;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(makeModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            makeModel.position.x = -center.x;
            makeModel.position.y = -center.y;
            makeModel.position.z = -center.z;
            
            // Adjust camera position based on model size
            const maxDim = Math.max(size.x, size.y, size.z);
            makeCamera.position.z = maxDim * 2;
            
            // Add model to scene
            makeScene.add(makeModel);
            
            // Update placeholder text
            const helpText = document.querySelector('.help-text');
            if (helpText) {
                helpText.textContent = `Model "${filename}" loaded. Click "Analyze for 3D Printing" to get recommendations.`;
            }
            
            console.log("Model loaded successfully");
        },
        (xhr) => {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            const helpText = document.querySelector('.help-text');
            if (helpText) {
                helpText.textContent = `Loading model: ${percent}%`;
            }
        },
        (error) => {
            console.error('Error loading OBJ model:', error);
            const helpText = document.querySelector('.help-text');
            if (helpText) {
                helpText.textContent = 'Error loading model. Please try another file.';
            }
        }
    );
}

// Function to analyze the 3D print with GPT-4o
async function analyze3DPrint() {
    const fileInput = document.getElementById('objUpload');
    const loadingMessage = document.getElementById('loading3DPrint');
    const outputBox = document.getElementById('printInstructions');
    const apiKey = document.getElementById('apiKey').value;

    if (!apiKey) {
        alert("❌ Please enter your OpenAI API Key in the sidebar.");
        return;
    }

    if (!fileInput.files.length) {
        alert("❌ Please upload an OBJ file first.");
        return;
    }

    const file = fileInput.files[0];
    
    // Show loading message
    loadingMessage.classList.remove('hidden');
    
    // Hide previous results
    outputBox.classList.add('hidden');

    try {
        // 1. Capture a screenshot of the 3D model
        const canvas = document.getElementById('objCanvas');
        const imageDataUrl = canvas.toDataURL('image/png');
        
        // 2. Read the file content
        const fileContent = await readFileAsText(file);
        const truncatedContent = fileContent.substring(0, 5000); // First 5,000 characters to save tokens
        
        // 3. Create a comprehensive prompt that includes both visual and text data
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
                        { 
                            type: "text", 
                            text: `I am preparing this 3D model (${file.name}) for printing. Please analyze both the OBJ file content and the visual render to provide a comprehensive printing guide with the following sections:

## Model Integrity Analysis
- Is the model watertight?
- Are there non-manifold edges or floating elements?
- Estimate polygon count and complexity

## Dimensions and Scale
- What are the approximate dimensions?
- Is the model properly scaled for printing?

## Printing Orientation & Support
- What is the ideal print orientation?
- Where will supports be needed?
- Are there any overhangs over 45 degrees?

## Printing Parameters
- Suggested layer height
- Recommended infill percentage
- Wall thickness recommendations
- Support structure advice
- Adhesion type (raft, brim, etc.)

## Material Recommendations
- Best filament type(s)
- Temperature settings
- Cooling considerations

Here is the beginning of the OBJ file content:
\`\`\`
${truncatedContent}
\`\`\`
` 
                        },
                        { 
                            type: "image_url", 
                            image_url: { 
                                url: imageDataUrl 
                            } 
                        }
                    ]
                }],
                max_tokens: 1000
            })
        });

        const result = await response.json();
        
        if (result.choices && result.choices.length > 0) {
            outputBox.value = result.choices[0].message.content.trim();
            outputBox.classList.remove('hidden');
            
            // Hide the help text when showing results
            const helpText = document.querySelector('.help-text');
            if (helpText) {
                helpText.classList.add('hidden');
            }
        } else {
            outputBox.value = "⚠️ Error: Could not generate instructions.";
            outputBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error:", error);
        outputBox.value = "⚠️ Error analyzing the file. Please try again.";
        outputBox.classList.remove('hidden');
    } finally {
        loadingMessage.classList.add('hidden');
    }
}

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}