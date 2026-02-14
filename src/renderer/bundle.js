"use strict";
(() => {
  // src/renderer/app.js
  var promptInput = document.getElementById("prompt-input");
  var generateBtn = document.getElementById("generate-btn");
  var iconSend = generateBtn.querySelector(".icon-send");
  var btnLoading = generateBtn.querySelector(".btn-loading");
  var resultSection = document.getElementById("result-section");
  var resultText = document.getElementById("result-text");
  var refineBtn = document.getElementById("refine-btn");
  var insertBtn = document.getElementById("insert-btn");
  var errorSection = document.getElementById("error-section");
  var errorText = document.getElementById("error-text");
  var cancelBtn = document.getElementById("cancel-btn");
  var currentResult = "";
  var isGenerating = false;
  function setLoading(loading) {
    isGenerating = loading;
    generateBtn.disabled = loading;
    if (loading) {
      iconSend.style.display = "none";
      btnLoading.classList.remove("hidden");
    } else {
      iconSend.style.display = "block";
      btnLoading.classList.add("hidden");
    }
  }
  function showError(message) {
    errorText.textContent = message;
    errorSection.classList.remove("hidden");
    resultSection.classList.add("hidden");
  }
  function hideError() {
    errorSection.classList.add("hidden");
  }
  function showResult(text) {
    currentResult = text;
    resultText.textContent = text;
    resultSection.classList.remove("hidden");
    hideError();
  }
  function hideResult() {
    resultSection.classList.add("hidden");
    currentResult = "";
  }
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
        showError(response.error || "Failed to generate text");
      }
    } catch (error) {
      showError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }
  async function insert() {
    if (!currentResult) return;
    try {
      await window.promptOS.insert(currentResult);
      reset();
    } catch (error) {
      showError("Failed to insert text");
    }
  }
  function refine() {
    promptInput.focus();
    promptInput.select();
  }
  function reset() {
    promptInput.value = "";
    hideResult();
    hideError();
  }
  function dismiss() {
    window.promptOS.dismiss();
    reset();
  }
  generateBtn.addEventListener("click", generate);
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generate();
    } else if (e.key === "Escape") {
      dismiss();
    }
  });
  refineBtn.addEventListener("click", refine);
  insertBtn.addEventListener("click", insert);
  cancelBtn.addEventListener("click", dismiss);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dismiss();
    }
  });
  window.promptOS.onWindowShown(() => {
    promptInput.focus();
  });
  window.promptOS.onWindowHidden(() => {
    reset();
  });
})();
//# sourceMappingURL=bundle.js.map
