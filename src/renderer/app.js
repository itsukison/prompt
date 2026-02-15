// DOM elements
const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const iconSend = generateBtn.querySelector('.icon-send');
const btnLoading = generateBtn.querySelector('.btn-loading');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');
const refineBtn = document.getElementById('refine-btn');
const insertBtn = document.getElementById('insert-btn');
const errorSection = document.getElementById('error-section');
const errorText = document.getElementById('error-text');
const cancelBtn = document.getElementById('cancel-btn');
const inputBar = document.querySelector('.input-bar');

let currentResult = '';
let isGenerating = false;

// Show/hide loading state
function setLoading(loading) {
    isGenerating = loading;
    generateBtn.disabled = loading;
    if (loading) {
        iconSend.style.display = 'none';
        btnLoading.classList.remove('hidden');
    } else {
        iconSend.style.display = 'block';
        btnLoading.classList.add('hidden');
    }
}

// Show error
function showError(message) {
    errorText.textContent = message;
    errorSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
}

// Hide error
function hideError() {
    errorSection.classList.add('hidden');
}

// Show result
function showResult(text) {
    currentResult = text;
    resultText.textContent = text;
    resultSection.classList.remove('hidden');
    hideError();
}

// Hide result
function hideResult() {
    resultSection.classList.add('hidden');
    currentResult = '';
}

// Generate text
async function generate() {
    const prompt = promptInput.value.trim();
    if (!prompt || isGenerating) return;

    setLoading(true);
    hideError();

    try {
        const response = await window.promptOS.generate(prompt);
        if (response.success) {
            showResult(response.text);
        } else {
            showError(response.error || 'Failed to generate text');
        }
    } catch (error) {
        showError(error.message || 'An unexpected error occurred');
    } finally {
        setLoading(false);
    }
}

// Insert text
async function insert() {
    if (!currentResult) return;

    try {
        await window.promptOS.insert(currentResult);
        reset();
    } catch (error) {
        showError('Failed to insert text');
    }
}

// Refine - focus back on input to edit prompt
function refine() {
    promptInput.focus();
    promptInput.select();
}

// Reset state
function reset() {
    promptInput.value = '';
    hideResult();
    hideError();
}

// Dismiss overlay
function dismiss() {
    window.promptOS.dismiss();
    reset();
}

// Event listeners
generateBtn.addEventListener('click', generate);

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generate();
    } else if (e.key === 'Escape') {
        dismiss();
    }
});

refineBtn.addEventListener('click', refine);
insertBtn.addEventListener('click', insert);
cancelBtn.addEventListener('click', dismiss);

// Global escape key handler
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        dismiss();
    }
});

// When window is shown, focus the input
window.promptOS.onWindowShown(() => {
    promptInput.focus();
});

// When window is hidden, reset state
window.promptOS.onWindowHidden(() => {
    reset();
});
