async function refinePrompt() {
    const apiKey = document.getElementById("apiKey").value;
    const inputType = document.getElementById("inputType").value; // Get the selected input type
    const inputText = inputType === "text" 
        ? document.getElementById("userText")?.value.trim() 
        : document.getElementById("transcription")?.value.trim();
    const refinementType = inputType === "text"
        ? document.getElementById("refinementType")?.value 
        : document.getElementById("refinementTypeAudio")?.value;

    // Get output elements based on input type
    const suitabilityOutput = inputType === "text" 
        ? document.getElementById("suitabilityOutput") 
        : document.getElementById("suitabilityOutputAudio");
    const suitabilityText = inputType === "text" 
        ? document.getElementById("suitabilityText") 
        : document.getElementById("suitabilityTextAudio");
    const refinedOutput = inputType === "text" 
        ? document.getElementById("refinedOutput") 
        : document.getElementById("refinedOutputAudio");

    // **Loading Message**
    const loadingMessage = inputType === "text" 
    ? document.getElementById("loadingRefinement")  // ✅ FIXED ID
    : document.getElementById("loadingRefinementAudio");
    // ✅ Check if element exists before using classList
    if (loadingMessage) {
        loadingMessage.classList.remove("hidden");
    } else {
        console.error("❌ Loading message element not found for", inputType);
    }

    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!inputText) {
        alert("Please provide input text before refining.");
        return;
    }

    if (!refinementType) {
        alert("Please select a refinement type.");
        return;
    }

    // **Show loading message before making API call**
    loadingMessage.classList.remove("hidden");

    // Define structured prompt for API call
    let refinementPrompt = "";
    switch (refinementType) {
        case "3d_cad":
            refinementPrompt = `Analyze the following description and determine if CAD is the best format for creating this object. If it is, explain why. If not, explain why another format (e.g., 3D Mesh) might be better.

            Then, refine the input into a structured CAD modeling prompt using the following best practices:
            'Describe an object that can be modeled in CAD with simple operations, being as explicit as possible, using meassures if possible and focusing on single, self-contained items rather than assemblies. Try to make descriptions as operations in a cad software. Try not to build super long prompts.
            **Input:**  
            "${inputText}"

            **Respond with this exact format:**
            ---
            Suitability: [CAD is/is not the best format because ...]
            Refined Prompt: "[Improved CAD modeling prompt following best practices]"
            ---`;
            break;

        case "3d_mesh":
            refinementPrompt = `Analyze the following description and determine if a 3D Mesh is the best format for creating this object. If it is, explain why. If not, explain why another format (e.g., CAD) might be better.

            Then, refine the input into a structured 3D Mesh modeling prompt based on the best possible representation. 
            - **Tailor the style to its purpose** (e.g., low-poly for games, high-precision for manufacturing).
            - **Keep prompts clear and concise** (1-2 sentences work best).
            - **Indicate dimensions and proportions** using precise units (mm, cm, m).

            **Input:**  
            "${inputText}"

            **Respond with this exact format:**
            ---
            Suitability: [Mesh is/is not the best format because ...]
            Refined Prompt: "[Improved Mesh modeling prompt]"
            ---`;
            break;

        case "image_generation":
            refinementPrompt = `Refine the following text into a structured and detailed prompt for AI image generation.

            Ensure the refined prompt:
            - Clearly describes the **subject** and **composition**.
            - Specifies **lighting, colors, and atmosphere**.
            - Defines **style or artistic approach** (e.g., photorealistic, cyberpunk, watercolor).
            - Avoids vague concepts like "beautiful" or "amazing"—instead, describe specific details.

            **Input:**  
            "${inputText}"

            **Respond with this exact format:**
            ---
            Refined Prompt: "[Detailed Image Generation prompt]"
            ---`;
            break;

        default:
            alert("Invalid refinement type.");
            return;
    }

    // Call OpenAI API to refine the prompt
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: refinementPrompt }],
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const result = await response.json();
        const refinedText = result.choices[0].message.content.trim();

        // **Fixed Parsing Logic**
        const suitabilityMatch = refinedText.match(/Suitability:\s*"?([\s\S]+?)"?\s*Refined Prompt:/);
        const promptMatch = refinedText.match(/Refined Prompt:\s*"?([\s\S]+?)"?\s*---/);

        if (promptMatch) {
            const prompt = promptMatch[1].trim();
            refinedOutput.value = prompt;
            refinedOutput.readOnly = false;
            refinedOutput.classList.remove("hidden");

            if (suitabilityMatch) {
                const suitability = suitabilityMatch[1].trim();
                suitabilityText.textContent = suitability;
                suitabilityOutput.classList.remove("hidden");
            } else {
                // If there's no suitability message, hide the section
                suitabilityOutput.classList.add("hidden");
            }
        } else {
            console.error("Failed to parse AI response:", refinedText);
            alert("Unexpected AI response format. Try again.");
        }

    } catch (error) {
        console.error("Error refining prompt:", error);
        alert("Network error! Please check your internet connection and API key.");
    } finally {
        // **Hide loading message after response**
        loadingMessage.classList.add("hidden");
    }
}

document.getElementById("refineButtonAudio")?.addEventListener("click", function() {
    refinePrompt();
    document.getElementById("finalSelectionAudio").classList.remove("hidden");
});

document.getElementById("refineButton")?.addEventListener("click", function() {
    refinePrompt();
    document.getElementById("finalSelectionText")?.classList.remove("hidden");
});
