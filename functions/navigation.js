document.addEventListener('DOMContentLoaded', function () {
    // Initialize sidebar controls
    document.getElementById("openSidebar")?.addEventListener("click", function () {
        document.getElementById("sidebar").classList.add("open");
    });

    document.getElementById("closeSidebar")?.addEventListener("click", function () {
        document.getElementById("sidebar").classList.remove("open");
    });

    // Only auto-navigate on index.html
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        const savedPage = localStorage.getItem("lastPage") || "landing";
        navigateTo(savedPage);
    }
    const saveBtn = document.getElementById("saveApiKeys");
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.addEventListener("click", () => {
            const openaiKey = document.getElementById("apiKey")?.value;
            const meshyKey = document.getElementById("meshyApiKey")?.value;

            if (openaiKey) {
                localStorage.setItem("apiKey", openaiKey);
            }

            if (meshyKey) {
                localStorage.setItem("meshyApiKey", meshyKey);
            }

            alert("API keys saved successfully!");
        });

        // Mark this button so we never bind it again
        saveBtn.dataset.bound = "true";
    }

    

});

// Global navigation function
window.navigateTo = function (pageId) {
    console.log("Navigating to:", pageId);

    // Reset forms and content
    clearPageContent();

    // Show the target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        localStorage.setItem("lastPage", pageId);
    }
};

// Function to clear page content while preserving API keys
function clearPageContent() {
    console.log("Clearing page content...");

    // Preserve API keys
    const apiKey = localStorage.getItem("apiKey");
    const meshyApiKey = localStorage.getItem("meshyApiKey");
    const zoocadApiKey = localStorage.getItem("zoocadApiKey");

    // Reset text inputs and textareas except API keys
    document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(input => {
        if (!["apiKey", "meshyApiKey", "zoocadApiKey"].includes(input.id)) {
            input.value = "";
        }
    });

    // Reset file uploads
    document.querySelectorAll('input[type="file"]').forEach(fileInput => {
        fileInput.value = "";
    });

    // Reset image previews
    document.querySelectorAll('img.preview, img#imagePreview, img#capturedImage').forEach(img => {
        img.src = "";
        img.classList.add("hidden");
    });

    /* Hide input sections and output containers
    document.querySelectorAll(".input-section, .hidden, #finalSelectionText, #finalSelectionAudio, #suitabilityOutput, #suitabilityOutputAudio").forEach(element => {
        element.classList.add("hidden");
    });*/

    // Clear textareas used for output
    document.querySelectorAll('#outputBox, #imageDescription, #capturedImageDescription, #refinedOutput, #refinedOutputAudio, #transcription').forEach(element => {
        element.value = "";
        element.classList.add("hidden");
    });

    // Reset image outputs
    const outputImage = document.getElementById("outputImage");
    if (outputImage) {
        outputImage.src = "";
        outputImage.classList.add("hidden");
    }

    // Hide 3D output and reset viewer
    const output3D = document.getElementById("output3D");
    if (output3D) {
        output3D.classList.add("hidden");
    }

    // Reset the OBJ file upload preview
    const objCanvas = document.getElementById("objCanvas");
    if (objCanvas) {
        const ctx = objCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, objCanvas.width, objCanvas.height);
        } else {
          console.warn("Canvas context is null.");
        }
      }
      

    // Reset 3D Model Viewer
    if (typeof makeScene !== 'undefined' && makeScene) {
        while (makeScene.children.length > 0) {
            makeScene.remove(makeScene.children[0]);
        }
    }

    // Reset output type dropdown
    const outputTypeSelect = document.getElementById("outputType");
    if (outputTypeSelect) {
        outputTypeSelect.value = "";
        outputTypeSelect.classList.add("hidden");
    }

    console.log("Page content cleared.");
}
