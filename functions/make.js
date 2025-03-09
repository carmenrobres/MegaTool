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
    
    // Create and show detailed loading animation
    createLoadingAnimation();
    
    // Get the original printInstructions element - check if it exists first
    const outputBox = document.getElementById('printInstructions');
    
    // Check if the formatted output already exists (from a previous analysis)
    const formattedOutput = document.getElementById('formattedPrintInstructions');
    
    // Hide any previous results
    if (outputBox) {
        outputBox.classList.add('hidden');
    }
    
    if (formattedOutput) {
        formattedOutput.remove();
    }
    
    // Hide the help text
    const helpText = document.querySelector('.help-text');
    if (helpText) {
        helpText.classList.add('hidden');
    }

    try {
        // Update loading step
        updateLoadingStep('model-reading');
        
        // 1. Read the file content and extract key metrics
        const fileContent = await readFileAsText(file);
        const objMetrics = extractObjMetrics(fileContent);
        
        // Update loading step
        updateLoadingStep('model-capture');
        
        // 2. Capture a screenshot of the 3D model
        const canvas = document.getElementById('objCanvas');
        const imageDataUrl = canvas.toDataURL('image/png');
        
        // Update loading step
        updateLoadingStep('ai-analysis');
        
        // 3. Create a comprehensive prompt with specific file data
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
                            text: `I need specific 3D printing advice for this OBJ model: "${file.name}"

OBJ File Analysis Results:
- Vertices: ${objMetrics.vertices}
- Faces: ${objMetrics.faces}
- Dimensions: Width=${objMetrics.width.toFixed(2)}mm, Height=${objMetrics.height.toFixed(2)}mm, Depth=${objMetrics.depth.toFixed(2)}mm
- Bounding Box Volume: ${objMetrics.volume.toFixed(2)} cubic mm
- Min/Max coordinates: X(${objMetrics.minX.toFixed(2)} to ${objMetrics.maxX.toFixed(2)}), Y(${objMetrics.minY.toFixed(2)} to ${objMetrics.maxY.toFixed(2)}), Z(${objMetrics.minZ.toFixed(2)} to ${objMetrics.maxZ.toFixed(2)})
- Material/Groups: ${objMetrics.materialCount}
- Has Texture Coordinates: ${objMetrics.hasTextureCoords ? "Yes" : "No"}
- Has Normals: ${objMetrics.hasNormals ? "Yes" : "No"}

Based on this specific data and the image of the model, please provide a detailed 3D printing guide with these sections:

## Model Integrity Analysis
- Is the model likely watertight based on the vertex/face count and structure?
- Are there potential issues with the mesh based on the data above?
- Given the polygon count of ${objMetrics.faces}, what level of detail can I expect?

## Dimensions and Scale
- Based on the dimensions (${objMetrics.width.toFixed(2)}mm × ${objMetrics.height.toFixed(2)}mm × ${objMetrics.depth.toFixed(2)}mm), is this appropriately sized for printing?
- Should I scale the model? If so, what's the recommended scale factor?

## Printing Orientation & Support
- What is the best orientation to print this model given its dimensions?
- Which areas will likely need supports?
- Given the model's height of ${objMetrics.height.toFixed(2)}mm, are there stability concerns?

## Printing Parameters
- Specific layer height recommendation for this model
- Precise infill percentage based on the model's structure
- Exact wall thickness needed
- Support settings tailored to this specific model
- Most appropriate adhesion type

## Material Recommendations
- Which specific material would work best for a model with these characteristics?
- Exact temperature settings for the recommended material
- Specific cooling strategy

The advice should be tailored to THIS SPECIFIC MODEL, not generic printing advice.` 
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

        // Update loading step
        updateLoadingStep('formatting-results');

        const result = await response.json();
        
        if (result.choices && result.choices.length > 0) {
            // Short delay to show the formatting step
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Update loading step
            updateLoadingStep('complete');
            
            // Allow a moment to see completion message
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Remove loading animation
            removeLoadingAnimation();
            
            // Show results with proper markdown formatting
            displayFormattedResults(result.choices[0].message.content.trim());
        } else {
            removeLoadingAnimation();
            
            // For error messages, recreate the textarea if needed
            displayErrorMessage("⚠️ Error: Could not generate instructions.");
        }
    } catch (error) {
        console.error("Error:", error);
        removeLoadingAnimation();
        
        // Add specific message for network errors
        if (error.message === "Failed to fetch" || error.name === "TypeError") {
            displayErrorMessage("⚠️ Network error: Please check your internet connection and try again.");
        } else {
            displayErrorMessage("⚠️ Error analyzing the file: " + (error.message || "Please try again."));
        }
    }
}

// Helper function to display error messages
function displayErrorMessage(message) {
    // Get the analysis column
    const analysisColumn = document.querySelector('.analysis-column');
    if (!analysisColumn) return;
    
    // Check if we already have a printInstructions element
    let outputBox = document.getElementById('printInstructions');
    
    // If not, create a new one
    if (!outputBox) {
        outputBox = document.createElement('textarea');
        outputBox.id = 'printInstructions';
        outputBox.placeholder = "Preparation steps will appear here...";
        outputBox.readOnly = true;
        analysisColumn.appendChild(outputBox);
    }
    
    // Show the error message
    outputBox.value = message;
    outputBox.classList.remove('hidden');
}

// This fixes the displayFormattedResults function to handle cases where the printInstructions element may not exist
function displayFormattedResults(resultText) {
    // Get the analysis column
    const analysisColumn = document.querySelector('.analysis-column');
    if (!analysisColumn) return;
    
    // Check if we already have a formatted output
    let formattedOutput = document.getElementById('formattedPrintInstructions');
    
    // If a formatted output already exists, update it
    if (formattedOutput) {
        formattedOutput.innerHTML = markdownToHtml(resultText);
        formattedOutput.classList.remove('hidden');
        return;
    }
    
    // Check if we need to replace the printInstructions element
    const outputBox = document.getElementById('printInstructions');
    
    // Create a new formatted output element
    formattedOutput = document.createElement('div');
    formattedOutput.id = 'formattedPrintInstructions';
    formattedOutput.className = 'markdown-output';
    formattedOutput.innerHTML = markdownToHtml(resultText);
    
    // Add it to the DOM - either replace outputBox or append to analysisColumn
    if (outputBox && outputBox.parentNode) {
        outputBox.parentNode.replaceChild(formattedOutput, outputBox);
    } else {
        analysisColumn.appendChild(formattedOutput);
    }
}

function displayFormattedResults(resultText) {
    const outputBox = document.getElementById('printInstructions');
    
    // Create a div to replace the textarea
    const formattedOutput = document.createElement('div');
    formattedOutput.id = 'formattedPrintInstructions';
    formattedOutput.className = 'markdown-output';
    
    // Convert markdown to HTML and set content
    formattedOutput.innerHTML = markdownToHtml(resultText);
    
    // Replace the textarea with the div
    const parent = outputBox.parentNode;
    parent.replaceChild(formattedOutput, outputBox);
  }

function markdownToHtml(markdown) {
    if (!markdown) return '';
    
    // Process headers
    markdown = markdown.replace(/## (.*?)$/gm, '<h2>$1</h2>');
    markdown = markdown.replace(/### (.*?)$/gm, '<h3>$1</h3>');
    
    // Process bold
    markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Process italic
    markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Process lists (handle unordered lists)
    markdown = markdown.replace(/^- (.*?)$/gm, '<li>$1</li>');
    // Group list items
    let hasLists = markdown.includes('<li>');
    if (hasLists) {
      // Add opening <ul> tags
      markdown = markdown.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
    }
    
    // Process code blocks
    markdown = markdown.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Make sure paragraphs are separated
    // Split by newlines and wrap in paragraph tags if not already wrapped
    const lines = markdown.split('\n');
    let result = '';
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        result += '\n';
        continue;
      }
      
      // Check if we're entering or leaving a list
      if (line.startsWith('<ul>')) inList = true;
      if (line.startsWith('</ul>')) inList = false;
      
      // If not in a list and not a header or already in an HTML tag, wrap in paragraph
      if (!inList && 
          !line.startsWith('<h') && 
          !line.startsWith('<ul') && 
          !line.startsWith('</ul') && 
          !line.startsWith('<li') && 
          !line.startsWith('</li')) {
        
        // Only add paragraph if not already wrapped in one
        if (!line.startsWith('<p>') && !line.startsWith('</p>')) {
          result += '<p>' + line + '</p>\n';
        } else {
          result += line + '\n';
        }
      } else {
        result += line + '\n';
      }
    }
    
    return result;
  }

// Function to create loading animation
function createLoadingAnimation() {
    // Remove any existing loading animation
    removeLoadingAnimation();
    
    // Get the analysis column
    const analysisColumn = document.querySelector('.analysis-column');
    if (!analysisColumn) return;
    
    // Create loading container
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-3d-print';
    loadingContainer.id = 'detailed-loading-animation';
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    // Create loading message
    const message = document.createElement('div');
    message.className = 'loading-message-text';
    message.textContent = 'Analyzing your 3D model...';
    
    // Create steps list
    const stepsList = document.createElement('ul');
    stepsList.className = 'loading-steps';
    
    // Define steps
    const steps = [
        { id: 'model-reading', text: 'Reading model data...' },
        { id: 'model-capture', text: 'Capturing model visualization...' },
        { id: 'ai-analysis', text: 'Analyzing with AI...' },
        { id: 'formatting-results', text: 'Formatting results...' },
        { id: 'complete', text: 'Analysis complete!' }
    ];
    
    // Add steps to list
    steps.forEach(step => {
        const li = document.createElement('li');
        li.id = `loading-step-${step.id}`;
        li.textContent = step.text;
        stepsList.appendChild(li);
    });
    
    // Assemble the loading container
    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(message);
    loadingContainer.appendChild(stepsList);
    
    // Add to the analysis column
    analysisColumn.appendChild(loadingContainer);
    
    // Activate the first step
    updateLoadingStep('model-reading');
}

// Function to update the current loading step
function updateLoadingStep(stepId) {
    // Get all steps
    const allSteps = document.querySelectorAll('.loading-steps li');
    
    // Set appropriate classes for each step
    let foundCurrent = false;
    
    allSteps.forEach(step => {
        // Get the step ID from the element ID
        const currentStepId = step.id.replace('loading-step-', '');
        
        if (currentStepId === stepId) {
            // This is the current step
            step.className = 'active';
            foundCurrent = true;
        } else if (!foundCurrent) {
            // This step is completed
            step.className = 'completed';
        } else {
            // This step is upcoming
            step.className = '';
        }
    });
}

// Function to remove loading animation
function removeLoadingAnimation() {
    const loadingAnimation = document.getElementById('detailed-loading-animation');
    if (loadingAnimation) {
        loadingAnimation.remove();
    }
    
    // Also make sure the original loading message is hidden
    const loadingMessage = document.getElementById('loading3DPrint');
    if (loadingMessage) {
        loadingMessage.classList.add('hidden');
    }
}

// Helper function to extract key metrics from an OBJ file
function extractObjMetrics(objContent) {
    // Initialize counters and values
    let vertices = 0;
    let faces = 0;
    let materialCount = 0;
    let hasTextureCoords = false;
    let hasNormals = false;
    
    // Initialize bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    // Process the file line by line
    const lines = objContent.split('\n');
    
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        
        if (parts.length > 0) {
            // Count vertices and update bounding box
            if (parts[0] === 'v' && parts.length >= 4) {
                vertices++;
                
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                const z = parseFloat(parts[3]);
                
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
            }
            // Count texture coordinates
            else if (parts[0] === 'vt') {
                hasTextureCoords = true;
            }
            // Count normals
            else if (parts[0] === 'vn') {
                hasNormals = true;
            }
            // Count faces
            else if (parts[0] === 'f') {
                faces++;
            }
            // Count materials
            else if (parts[0] === 'usemtl' || parts[0] === 'g') {
                materialCount++;
            }
        }
    }
    
    // Calculate dimensions
    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    
    // Calculate approximate volume
    const volume = width * height * depth;
    
    // Return all metrics
    return {
        vertices,
        faces,
        minX, maxX,
        minY, maxY,
        minZ, maxZ,
        width,
        height,
        depth,
        volume,
        materialCount: Math.max(1, materialCount), // Ensure at least 1
        hasTextureCoords,
        hasNormals
    };
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

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}