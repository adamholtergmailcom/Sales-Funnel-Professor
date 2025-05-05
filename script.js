document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const generateButton = document.getElementById('generate-button');
    const promptInput = document.getElementById('promptInput');
    const imageResultsDiv = document.getElementById('imageResults');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const messageArea = document.getElementById('messageArea');
    const extensionInfo = document.getElementById('extensionInfo');
    const hiddenImageContainer = document.querySelector('div[style="display: none;"]');
    const referenceImageElements = hiddenImageContainer ? hiddenImageContainer.querySelectorAll('img') : [];

    // API Configuration (Now handled by serverless function)
    // const GEMINI_API_KEY = "AIzaSyBwJ4RetyK7zFtU6ZiXYtVL8OuQaNMFgns"; // REMOVED
    // const MODEL_ID = "gemini-2.0-flash-exp-image-generation"; // REMOVED
    // const API_URL = `...`; // REMOVED
    const SERVERLESS_API_URL = '/api/generate'; // Target our Vercel function

    // State
    let referenceImagesBase64 = {}; // To store loaded Base64 data
    let imagesLoadedSuccessfully = false;

    // --- Image Loading Function ---
    async function getBase64FromImage(imgElement) {
        return new Promise((resolve, reject) => {
            // Ensure image is loaded before trying to draw
             // Add a check for src existence
             if (!imgElement.src || imgElement.src.endsWith('/')) {
                reject(new Error(`Image source is missing or invalid for element ID ${imgElement.id}`));
                return;
            }

            if (imgElement.complete && imgElement.naturalHeight !== 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElement.naturalWidth;
                    canvas.height = imgElement.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imgElement, 0, 0);
                    const dataUrl = canvas.toDataURL(imgElement.dataset.mimetype);
                    const base64Data = dataUrl.split(',')[1];
                    if (!base64Data) {
                        reject(new Error(`Could not extract Base64 data for ${imgElement.dataset.filename}`));
                        return;
                    }
                    resolve({
                        filename: imgElement.dataset.filename,
                        mimeType: imgElement.dataset.mimetype,
                        data: base64Data
                    });
                } catch (error) {
                    if (error.name === 'SecurityError') {
                         // This error *shouldn't* happen when served via HTTP, but keep check just in case
                        reject(new Error(`Browser security policy blocked reading image data for ${imgElement.dataset.filename}. Try refreshing.`));
                    } else {
                        reject(new Error(`Canvas error for ${imgElement.dataset.filename}: ${error.message}`));
                    }
                }
            } else {
                // If image not loaded yet, wait for onload or reject on error
                imgElement.onload = () => getBase64FromImage(imgElement).then(resolve).catch(reject);
                imgElement.onerror = () => reject(new Error(`Failed to load image: ${imgElement.src}. Check file path and network.`));
            }
        });
    }

    async function loadReferenceImages() {
        if (referenceImageElements.length === 0) {
            updateStatus("Error: Could not find reference image elements in HTML.", true);
            return false;
        }
        updateStatus("Loading reference images...", false);
        const promises = Array.from(referenceImageElements).map(img => getBase64FromImage(img));
        try {
            const results = await Promise.all(promises);
            referenceImagesBase64 = {};
            results.forEach(result => {
                referenceImagesBase64[result.filename] = { mimeType: result.mimeType, data: result.data };
            });
            console.log("Reference images loaded and converted.");
            updateStatus("Reference images loaded successfully.", false, true);
            imagesLoadedSuccessfully = true;
            generateButton.textContent = "Generate Images";
            generateButton.disabled = false;
            return true;
        } catch (error) {
            console.error("Error loading reference images:", error);
            // Provide more specific feedback if possible
            let errorMsg = `Error loading reference images: ${error.message}.`;
            if (error.message.includes('Failed to load image')) {
                 errorMsg += ' Ensure image files exist in the correct path and the server is running.';
            } else if (error.message.includes('Browser security policy')) {
                 errorMsg += ' This might happen if not running via a local server (http://).';
            }
            updateStatus(errorMsg, true);
            imagesLoadedSuccessfully = false;
            generateButton.textContent = "Image Load Failed";
            generateButton.disabled = true;
            return false;
        }
    }

    // --- UI Update Functions ---
    function updateStatus(message, isError = false, isSuccess = false) {
        extensionInfo.textContent = message;
        extensionInfo.classList.remove('status-ok', 'status-error');
        if (isError) extensionInfo.classList.add('status-error');
        else if (isSuccess) extensionInfo.classList.add('status-ok');
    }

    function showLoading(isLoading) {
        loadingIndicator.classList.toggle('visible', isLoading);
        generateButton.disabled = isLoading || !imagesLoadedSuccessfully;
    }

    function showMessage(message, type = 'error') {
        messageArea.textContent = message;
        messageArea.className = 'visible';
        messageArea.classList.add(type);
    }

    function clearResults() {
        imageResultsDiv.innerHTML = '';
        messageArea.textContent = '';
        messageArea.className = '';
    }

    // --- API Call Logic (Simplified for Serverless) ---

    function displayImageFromData(mimeType, base64Data, index) {
        const imgElement = document.createElement('img');
        imgElement.src = `data:${mimeType};base64,${base64Data}`;
        imgElement.alt = `Generated Professor Image ${index + 1}`;
        imageResultsDiv.appendChild(imgElement);
    }

    // Main function to handle the button click
    async function handleGeneration() {
        const actionDescription = promptInput.value.trim();
        if (!actionDescription) {
            showMessage("Please describe the action for the professor.", 'info');
            return;
        }
        if (!imagesLoadedSuccessfully) {
             showMessage("Reference images could not be loaded. Cannot generate.", 'error');
             return;
        }

        clearResults();
        showLoading(true);
        showMessage("Generating images via serverless function...", 'info');

        try {
            // Send prompt and reference images to our serverless backend
            const response = await fetch(SERVERLESS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    actionDescription: actionDescription,
                    referenceImagesBase64: referenceImagesBase64 // Send the loaded data
                }),
            });

            const result = await response.json(); // Expect JSON response { images: [...] }

            if (!response.ok) {
                // Use error message from serverless function response if available
                throw new Error(result.error || `Serverless function request failed: ${response.status} ${response.statusText}`);
            }

            if (!result.images || result.images.length === 0) {
                 showMessage("Generation finished, but no images were returned by the serverless function.", 'info');
            } else {
                 result.images.forEach((imgData, index) => {
                     displayImageFromData(imgData.mimeType, imgData.data, index);
                 });
                 showMessage(`Successfully generated ${result.images.length} image variation(s).`, 'success');
            }

        } catch (error) {
            console.error("Error during image generation via serverless function:", error);
            showMessage(`An error occurred: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    // --- Initialization ---
    generateButton.addEventListener('click', handleGeneration);
    loadReferenceImages(); // Attempt to load images on page load

}); // End DOMContentLoaded
