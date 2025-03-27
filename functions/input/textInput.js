// functions/textInput.js

function updateFinalTextInput() {
    const selectedOption = document.querySelector('input[name="finalInputText"]:checked')?.value || "original";
    const userText = document.getElementById("userText")?.value.trim() || "";
    const refinedText = document.getElementById("refinedOutput")?.value.trim() || "";

    const finalInput = selectedOption === "refined" && refinedText ? refinedText : userText;

    if (finalInput) {
        localStorage.setItem("finalPrompt", finalInput);
        console.log("✅ Final Text Input Updated:", finalInput);
    }
}

function setupTextInputListeners() {
    // Text input change
    document.getElementById("userText")?.addEventListener("input", updateFinalTextInput);
    document.getElementById("refinedOutput")?.addEventListener("input", updateFinalTextInput);

    // Radio change (original/refined)
    document.querySelectorAll('input[name="finalInputText"]').forEach(input => {
        input.addEventListener("change", updateFinalTextInput);
    });


    // Show/hide refinement section
    document.getElementById("inputType")?.addEventListener("change", function () {
        const inputType = this.value;
        const refinementSection = document.getElementById("refinementSection");

        if (inputType === "text") {
            refinementSection.classList.remove("hidden");
        } else {
            refinementSection.classList.add("hidden");
        }
    });
}

document.addEventListener("DOMContentLoaded", setupTextInputListeners);
