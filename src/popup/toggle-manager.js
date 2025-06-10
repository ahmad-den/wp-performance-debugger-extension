/**
 * Module for managing debug toggles and parameters
 */

/**
 * Sets up toggle functionality
 */
export function setupToggleManagement() {
    const chrome = window.chrome
  
    // Load initial toggle states
    chrome.runtime.sendMessage({ action: "getParameters" }, (parameters) => {
      if (chrome.runtime.lastError) {
        parameters = []
      }
      // Ensure parameters is an array
      if (!Array.isArray(parameters)) {
        parameters = []
      }
      document.getElementById("perfmattersoff").checked = parameters.includes("perfmattersoff")
      document.getElementById("perfmatterscssoff").checked = parameters.includes("perfmatterscssoff")
      document.getElementById("perfmattersjsoff").checked = parameters.includes("perfmattersjsoff")
      document.getElementById("nocache").checked = parameters.includes("nocache")
      updateToggleStates(true) // Pass true to skip parameter updates during initial load
    })
  
    // Add event listeners to toggles
    const toggleInputs = document.querySelectorAll(".toggle-input")
    toggleInputs.forEach((input) => {
      input.addEventListener("change", () => updateToggleStates(false))
    })
  }
  
  /**
   * Updates toggle states and dependencies
   * @param {boolean} skipParameterUpdate - Whether to skip updating parameters
   */
  function updateToggleStates(skipParameterUpdate = false) {
    const perfmattersoff = document.getElementById("perfmattersoff")
    const perfmatterscssoff = document.getElementById("perfmatterscssoff")
    const perfmattersjsoff = document.getElementById("perfmattersjsoff")
    const nocache = document.getElementById("nocache")
  
    const isPerfmattersOff = perfmattersoff.checked
  
    // Handle dependent toggles
    ;[perfmatterscssoff, perfmattersjsoff].forEach((toggle) => {
      toggle.disabled = isPerfmattersOff
      const container = toggle.closest(".toggle-container")
      if (isPerfmattersOff) {
        toggle.checked = false
        container.classList.add("disabled-toggle")
      } else {
        container.classList.remove("disabled-toggle")
      }
    })
  
    nocache.disabled = isPerfmattersOff || perfmatterscssoff.checked || perfmattersjsoff.checked
    const nocacheContainer = nocache.closest(".toggle-container")
    if (nocache.disabled) {
      if (nocache.checked) nocache.checked = false
      nocacheContainer.classList.add("disabled-toggle")
    } else {
      nocacheContainer.classList.remove("disabled-toggle")
    }
  
    // Only update parameters if not skipping (i.e., when user actually changes toggles)
    if (!skipParameterUpdate) {
      updateParameter("perfmattersoff", perfmattersoff.checked)
      updateParameter("perfmatterscssoff", perfmatterscssoff.checked)
      updateParameter("perfmattersjsoff", perfmattersjsoff.checked)
      updateParameter("nocache", nocache.checked)
    }
  }
  
  /**
   * Updates a parameter via background script
   * @param {string} parameter - Parameter name
   * @param {boolean} isChecked - Whether the parameter is enabled
   */
  function updateParameter(parameter, isChecked) {
    const chrome = window.chrome
    chrome.runtime.sendMessage(
      {
        action: "updateParameters",
        parameter: parameter,
        add: isChecked,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          return
        }
  
        if (response && response.error) {
          // Error handling
        } else if (response && response.urlChanged) {
          // The tab.update should handle the reload automatically
        } else {
          // No URL change needed
        }
      },
    )
  }
  