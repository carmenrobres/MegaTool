// utils.js - Common utility functions

// CORS Proxy function for loading external resources
// Add this function at the top of your output.js file:

// Function to use a CORS proxy for external URLs
function proxyUrl(url) {
    // Only proxy URLs from specific domains that have CORS issues
    if (url.includes('assets.meshy.ai') || url.includes('zoo.dev')) {
        // Use a public CORS proxy - several options
        // Option 1: corsproxy.io
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
        
        // Option 2: CORS Anywhere (requires visiting https://cors-anywhere.herokuapp.com/ to request temporary access)
        // return `https://cors-anywhere.herokuapp.com/${url}`;
        
        // Option 3: allOrigins
        // return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
    return url;
}

// Then modify your loadOBJModel function in output.js
// Find where you call loader.load and change it to:

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
        
        // Apply the CORS proxy to the URL
        const proxiedUrl = proxyUrl(url);
        console.log("Using proxied URL:", proxiedUrl);
        
        loader.load(
            proxiedUrl, // Use the proxied URL here
            (loadedModel) => {
                // Success handler - existing code
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
                // Progress handler - existing code
                if (loadingDiv) {
                    loadingDiv.textContent = `Loading: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`;
                }
            },
            (error) => {
                // Error handler - existing code with better handling
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

// Generate timestamped filename
function generateTimestampedFilename(prefix, extension) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-'); // Format: HH-MM-SS
    return `${prefix}_${dateStr}_${timeStr}.${extension}`;
}

// Read file as text - returns a Promise
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

// Read file as data URL - returns a Promise
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// Convert markdown to HTML
function markdownToHtml(markdown) {
    if (!markdown) return '';
    
    // Process headers
    markdown = markdown.replace(/## (.*?)$/gm, '<h2>$1</h2>');
    markdown = markdown.replace(/### (.*?)$/gm, '<h3>$1</h3>');
    
    // Process bold
    markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Process italic
    markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Process lists
    markdown = markdown.replace(/^- (.*?)$/gm, '<li>$1</li>');
    let hasLists = markdown.includes('<li>');
    if (hasLists) {
        markdown = markdown.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
    }
    
    // Process code blocks
    markdown = markdown.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Process paragraphs
    const lines = markdown.split('\n');
    let result = '';
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
            result += '\n';
            continue;
        }
        
        if (line.startsWith('<ul>')) inList = true;
        if (line.startsWith('</ul>')) inList = false;
        
        if (!inList && 
            !line.startsWith('<h') && 
            !line.startsWith('<ul') && 
            !line.startsWith('</ul') && 
            !line.startsWith('<li') && 
            !line.startsWith('</li')) {
            
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

// Create loading animation element
function createLoadingElement(message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    loadingDiv.textContent = message || 'Loading...';
    
    container.appendChild(loadingDiv);
    return loadingDiv;
}

// Remove loading element
function removeLoadingElement(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

// Display error message
function displayError(message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    container.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode === container) {
            container.removeChild(errorDiv);
        }
    }, 5000);
}

// Check if API key is available
function checkApiKey() {
    const apiKey = document.getElementById("apiKey")?.value;
    
    if (!apiKey) {
        displayError("Please enter your OpenAI API Key in the settings.", "output-controls");
        return false;
    }
    
    return true;
}