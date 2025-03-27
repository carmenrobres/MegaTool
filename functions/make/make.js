document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('analyze3DPrint').addEventListener('click', analyze3DPrint);
    document.getElementById('objUpload').addEventListener('change', handleFileUpload);
});

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const helpText = document.querySelector('.help-text');
    if (helpText) {
        helpText.textContent = `File "${file.name}" ready for analysis. Click "Analyze for 3D Printing".`;
    }
    
    const printInstructions = document.getElementById('formattedPrintInstructions');
    if (printInstructions) {
        printInstructions.innerHTML = '';
        printInstructions.classList.add('hidden');
    }
}

// Keep the analyze3DPrint function but remove any 3D viewer related code
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
    createLoadingAnimation();
    
    try {
        updateLoadingStep('model-reading');
        const fileContent = await readFileAsText(file);
        const objMetrics = extractObjMetrics(fileContent);
        
        updateLoadingStep('ai-analysis');
        
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
                    content: `I need specific 3D printing advice for this OBJ model: "${file.name}"
                    
OBJ File Analysis Results:
- Vertices: ${objMetrics.vertices}
- Faces: ${objMetrics.faces}
- Dimensions: Width=${objMetrics.width.toFixed(2)}mm, Height=${objMetrics.height.toFixed(2)}mm, Depth=${objMetrics.depth.toFixed(2)}mm
- Bounding Box Volume: ${objMetrics.volume.toFixed(2)} cubic mm
- Min/Max coordinates: X(${objMetrics.minX.toFixed(2)} to ${objMetrics.maxX.toFixed(2)}), Y(${objMetrics.minY.toFixed(2)} to ${objMetrics.maxY.toFixed(2)}), Z(${objMetrics.minZ.toFixed(2)} to ${objMetrics.maxZ.toFixed(2)})
- Material/Groups: ${objMetrics.materialCount}
- Has Texture Coordinates: ${objMetrics.hasTextureCoords ? "Yes" : "No"}
- Has Normals: ${objMetrics.hasNormals ? "Yes" : "No"}

[Keep the same detailed analysis prompt as before...]`
                }],
                max_tokens: 1000
            })
        });

        updateLoadingStep('formatting-results');
        const result = await response.json();
        
        if (result.choices?.length > 0) {
            displayFormattedResults(result.choices[0].message.content.trim());
        } else {
            displayErrorMessage("⚠️ Error: Could not generate instructions.");
        }
    } catch (error) {
        console.error("Error:", error);
        displayErrorMessage("⚠️ Error analyzing the file: " + (error.message || "Please try again."));
    } finally {
        removeLoadingAnimation();
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