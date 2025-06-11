/**
 * Module for handling insights display in the popup
 */

// Import the simplified helpers
import { sendMessageToContentScript, showElementFeedback } from "../../utils/tab-helpers.js"

/**
 * Updates the insights display with analysis results
 * @param {Object} data - Analysis data object
 */
export function updateInsightsDisplay(data) {
  console.log("Updating insights display with data:", data)

  // Update CLS display
  if (data.cls !== undefined) {
    console.log("Updating CLS display")
    updateCLSDisplay(data.cls)
  }

  // Update LCP display
  if (data.lcp !== undefined) {
    console.log("Updating LCP display")
    updateLCPDisplay(data.lcp)
  }

  // Update INP display
  if (data.inp !== undefined) {
    console.log("Updating INP display")
    updateINPDisplay(data.inp)
  }

  // Update TTFB display
  if (data.additionalMetrics !== undefined) {
    console.log("Updating TTFB display")
    updateTTFBDisplay(data.additionalMetrics)
  }

  // Update plugin conflicts
  if (data.pluginRecommendations !== undefined) {
    console.log("Updating plugin conflicts")
    updatePluginConflicts(data.pluginRecommendations)
  } else {
    // Show loading state only if no data has been received yet
    const container = document.getElementById("pluginConflicts")
    if (container && container.innerHTML === "") {
      container.innerHTML = '<div class="loading-state">Analyzing cache plugins...</div>'
    }
  }
}

/**
 * Updates the CLS display
 * @param {Object} clsData - CLS data object
 */
export function updateCLSDisplay(clsData) {
  console.log("updateCLSDisplay called with:", clsData)

  const clsScore = document.querySelector("#clsScore .metric-value")
  const clsRating = document.querySelector("#clsScore .metric-rating")
  const clsIndicator = document.getElementById("clsIndicator")
  const clsElementPreview = document.getElementById("clsElementPreview")

  if (clsScore && clsRating && clsIndicator) {
    const value = clsData.value || 0
    const rating = clsData.rating || "good"

    clsScore.textContent = value.toFixed(3)
    clsRating.textContent = rating.charAt(0).toUpperCase() + rating.slice(1).replace("-", " ")
    clsRating.className = `metric-rating ${rating}`

    // Update indicator position (0.5 = 50% of bar width)
    const position = Math.min((value / 0.5) * 100, 100)
    clsIndicator.style.left = `${position}%`

    // IMPORTANT: Always show the CLS element preview section when CLS value > 0
    if (clsElementPreview) {
      if (value > 0) {
        // Always show the preview section when there's any CLS detected
        clsElementPreview.style.display = "block"

        // Update the element preview with whatever data we have
        updateCLSElementPreview(clsData.element || {}, value)

        console.log("CLS element preview should now be visible with value:", value)
      } else {
        console.log("Hiding CLS element preview - no layout shifts detected")
        clsElementPreview.style.display = "none"
      }
    }
  } else {
    console.error("CLS display elements not found")
  }
}

/**
 * Updates the LCP display
 * @param {Object} lcpData - LCP data object
 */
export function updateLCPDisplay(lcpData) {
  console.log("updateLCPDisplay called with:", lcpData)

  const lcpScore = document.querySelector("#lcpScore .metric-value")
  const lcpRating = document.querySelector("#lcpScore .metric-rating")
  const lcpIndicator = document.getElementById("lcpIndicator")
  const lcpElementPreview = document.getElementById("lcpElementPreview")

  if (lcpScore && lcpRating && lcpIndicator) {
    const value = lcpData.value || 0
    const rating = lcpData.rating || "good"

    lcpScore.textContent = value > 0 ? `${Math.round(value)}ms` : "0ms"
    lcpRating.textContent = rating.charAt(0).toUpperCase() + rating.slice(1).replace("-", " ")
    lcpRating.className = `metric-rating ${rating}`

    // Update indicator position (8000ms = 100% of bar width)
    const position = Math.min((value / 8000) * 100, 100)
    lcpIndicator.style.left = `${position}%`

    // IMPORTANT: Always show the LCP element preview section
    if (lcpElementPreview) {
      // Always show the preview section, even if element data is incomplete
      lcpElementPreview.style.display = "block"

      // Update the element preview with whatever data we have
      updateLCPElementPreview(lcpData.element || {})

      console.log("LCP element preview should now be visible")
    }
  } else {
    console.error("LCP display elements not found")
  }
}

/**
 * Updates the INP display
 * @param {Object} inpData - INP data object
 */
export function updateINPDisplay(inpData) {
  console.log("updateINPDisplay called with:", inpData)

  const inpScore = document.querySelector("#inpScore .metric-value")
  const inpRating = document.querySelector("#inpScore .metric-rating")
  const inpIndicator = document.getElementById("inpIndicator")
  const inpStatus = document.getElementById("inpStatus")

  if (inpScore && inpRating && inpIndicator && inpStatus) {
    const value = inpData.value
    const rating = inpData.rating || "good"
    const status = inpData.status || "waiting"

    if (value !== null && value !== undefined) {
      inpScore.textContent = `${value}ms`
      inpRating.textContent = rating.charAt(0).toUpperCase() + rating.slice(1).replace("-", " ")
      inpRating.className = `metric-rating ${rating}`

      // Update indicator position (800ms = 100% of bar width)
      const position = Math.min((value / 800) * 100, 100)
      inpIndicator.style.left = `${position}%`

      // Update status message
      if (inpData.entries && inpData.entries.length > 0) {
        const latestEntry = inpData.entries[0]
        inpStatus.innerHTML = `
          <div class="inp-message">
            Latest interaction: ${latestEntry.name} on ${latestEntry.target} (${latestEntry.duration}ms)
          </div>
        `
      } else {
        inpStatus.innerHTML = `<div class="inp-message">INP measured: ${value}ms</div>`
      }
    } else {
      inpScore.textContent = "-"
      inpRating.textContent = status === "waiting" ? "Monitoring" : "Good"
      inpRating.className = `metric-rating ${status === "waiting" ? "monitoring" : "good"}`
      inpIndicator.style.left = "0%"

      if (status === "waiting") {
        inpStatus.innerHTML = `<div class="inp-message">Click anywhere on the page to measure interaction responsiveness</div>`
      } else {
        inpStatus.innerHTML = `<div class="inp-message">No interactions detected yet</div>`
      }
    }
  } else {
    console.error("INP display elements not found")
  }
}

/**
 * Updates the TTFB display
 * @param {Object} metrics - Metrics object containing TTFB data
 */
export function updateTTFBDisplay(metrics) {
  console.log("updateTTFBDisplay called with:", metrics)

  const ttfbScore = document.querySelector("#ttfbScore .metric-value")
  const ttfbRating = document.querySelector("#ttfbScore .metric-rating")
  const ttfbIndicator = document.getElementById("ttfbIndicator")

  if (ttfbScore && ttfbRating && ttfbIndicator && metrics.ttfb) {
    const value = metrics.ttfb
    const rating = value < 800 ? "good" : value < 1800 ? "needs-improvement" : "poor"

    ttfbScore.textContent = `${value}ms`
    ttfbRating.textContent = rating.charAt(0).toUpperCase() + rating.slice(1).replace("-", " ")
    ttfbRating.className = `metric-rating ${rating}`

    // Update indicator position (2400ms = 100% of bar width)
    const position = Math.min((value / 2400) * 100, 100)
    ttfbIndicator.style.left = `${position}%`
  } else {
    console.error("TTFB display elements not found or no TTFB data")
  }
}

/**
 * Updates the CLS element preview with enhanced information
 * @param {Object} element - CLS element data
 * @param {number} clsValue - Current CLS value
 */
function updateCLSElementPreview(element, clsValue) {
  console.log("updateCLSElementPreview called with:", element, clsValue)

  const elementTag = document.getElementById("clsElementTag")
  const elementImage = document.getElementById("clsElementImage")
  const clsShiftValue = document.getElementById("clsShiftValue")
  const elementDimensions = document.getElementById("clsElementDimensions")
  const elementPosition = document.getElementById("clsElementPosition")
  const elementClassesContainer = document.getElementById("clsElementClassesContainer")
  const elementClasses = document.getElementById("clsElementClasses")
  const elementSelectorContainer = document.getElementById("clsElementSelectorContainer")
  const elementSelector = document.getElementById("clsElementSelector")

  // Handle case where element data might be empty or incomplete
  if (!element || Object.keys(element).length === 0) {
    console.log("No CLS element data available, showing placeholder")
    if (elementTag) elementTag.textContent = "Layout Shift Detected"
    if (clsShiftValue) clsShiftValue.textContent = clsValue ? clsValue.toFixed(3) : "Analyzing..."
    if (elementDimensions) elementDimensions.textContent = "Analyzing..."
    if (elementPosition) elementPosition.textContent = "Analyzing..."
    if (elementImage) {
      elementImage.innerHTML = '<div class="preview-placeholder">Analyzing layout shift source...</div>'
    }

    // Hide optional sections
    if (elementClassesContainer) elementClassesContainer.style.display = "none"
    if (elementSelectorContainer) elementSelectorContainer.style.display = "none"
    return
  }

  console.log("Updating CLS element preview with:", element)

  // Update element tag with more detailed information
  if (elementTag) {
    let tagDisplay = element.tagName ? element.tagName.toUpperCase() : "ELEMENT"
    if (element.classList && element.classList.length > 0) {
      tagDisplay += "." + element.classList[0]
    } else if (element.id) {
      tagDisplay += `#${element.id}`
    }
    elementTag.textContent = tagDisplay
    elementTag.style.color = "#ff9500" // Orange color for CLS
  }

  // Update shift value
  if (clsShiftValue) {
    clsShiftValue.textContent = element.shiftValue
      ? element.shiftValue.toFixed(3)
      : clsValue
        ? clsValue.toFixed(3)
        : "0.000"
  }

  // Update dimensions
  if (elementDimensions && element.dimensions) {
    let dimensionText = `${element.dimensions.width || 0}×${element.dimensions.height || 0}px`
    if (element.dimensions.naturalWidth && element.dimensions.naturalHeight) {
      dimensionText += ` (natural: ${element.dimensions.naturalWidth}×${element.dimensions.naturalHeight}px)`
    }
    elementDimensions.textContent = dimensionText
  } else if (elementDimensions) {
    elementDimensions.textContent = "Unknown dimensions"
  }

  // Update position
  if (elementPosition && element.position) {
    elementPosition.textContent = `${element.position.left || 0}, ${element.position.top || 0}px`
  } else if (elementPosition) {
    elementPosition.textContent = "Unknown position"
  }

  // Update classes
  if (elementClassesContainer && elementClasses && element.classList && element.classList.length > 0) {
    elementClassesContainer.style.display = "block"
    elementClasses.textContent = element.classList.join(" ")
    elementClasses.title = element.classList.join(" ")
  } else if (elementClassesContainer) {
    elementClassesContainer.style.display = "none"
  }

  // Update CSS selector
  if (elementSelectorContainer && elementSelector && element.selector) {
    elementSelectorContainer.style.display = "block"
    elementSelector.textContent = element.selector
    elementSelector.title = element.selector
  } else if (elementSelectorContainer) {
    elementSelectorContainer.style.display = "none"
  }

  // Update preview image with click functionality
  if (elementImage) {
    const imageUrl =
      element.preview || element.primarySource || element.src || element.currentSrc || element.backgroundImageUrl

    if (imageUrl) {
      console.log("Setting CLS preview image:", imageUrl)
      elementImage.innerHTML = `
        <img src="${imageUrl}" 
             alt="CLS Element Preview" 
             class="element-preview-img clickable-preview" 
             title="Click to highlight this element on the page"
             crossorigin="anonymous">
      `

      // Add click handler to highlight element
      const previewImg = elementImage.querySelector(".clickable-preview")
      if (previewImg) {
        previewImg.addEventListener("click", () => {
          highlightCLSElementOnPage()
        })

        // Add error handling for image loading
        previewImg.addEventListener("error", () => {
          console.log("CLS preview image failed to load")
          elementImage.innerHTML = '<div class="preview-placeholder">Preview not available</div>'
        })
      }
    } else {
      console.log("No image URL available for CLS preview")
      elementImage.innerHTML = '<div class="preview-placeholder">No preview available</div>'
    }
  }

  // Make the entire preview clickable
  const clsElementPreview = document.getElementById("clsElementPreview")
  if (clsElementPreview) {
    clsElementPreview.style.cursor = "pointer"
    clsElementPreview.title = "Click to highlight this element on the page"

    // Remove existing click handlers
    clsElementPreview.replaceWith(clsElementPreview.cloneNode(true))
    const newPreview = document.getElementById("clsElementPreview")

    newPreview.addEventListener("click", () => {
      highlightCLSElementOnPage()
    })
  }
}

/**
 * Updates the LCP element preview with enhanced information
 * @param {Object} element - LCP element data
 */
function updateLCPElementPreview(element) {
  console.log("updateLCPElementPreview called with:", element)

  const elementTag = document.getElementById("lcpElementTag")
  const elementImage = document.getElementById("lcpElementImage")
  const elementDimensions = document.getElementById("lcpElementDimensions")
  const elementPosition = document.getElementById("lcpElementPosition")
  const elementSrcContainer = document.getElementById("lcpElementSrcContainer")
  const elementSrc = document.getElementById("lcpElementSrc")
  const elementTextContainer = document.getElementById("lcpElementTextContainer")
  const elementText = document.getElementById("lcpElementText")
  const elementClassesContainer = document.getElementById("lcpElementClassesContainer")
  const elementClasses = document.getElementById("lcpElementClasses")
  const elementSelectorContainer = document.getElementById("lcpElementSelectorContainer")
  const elementSelector = document.getElementById("lcpElementSelector")

  // Handle case where element data might be empty or incomplete
  if (!element || Object.keys(element).length === 0) {
    console.log("No element data available, showing placeholder")
    if (elementTag) elementTag.textContent = "LCP Element"
    if (elementDimensions) elementDimensions.textContent = "Analyzing..."
    if (elementPosition) elementPosition.textContent = "Analyzing..."
    if (elementImage) {
      elementImage.innerHTML = '<div class="preview-placeholder">Analyzing LCP element...</div>'
    }

    // Hide optional sections
    if (elementSrcContainer) elementSrcContainer.style.display = "none"
    if (elementTextContainer) elementTextContainer.style.display = "none"
    if (elementClassesContainer) elementClassesContainer.style.display = "none"
    if (elementSelectorContainer) elementSelectorContainer.style.display = "none"
    return
  }

  console.log("Updating LCP element preview with:", element)

  // Update element tag with more detailed information
  if (elementTag) {
    let tagDisplay = element.tagName ? element.tagName.toUpperCase() : "ELEMENT"
    if (element.classList && element.classList.length > 0) {
      tagDisplay += "." + element.classList[0]
    } else if (element.id) {
      tagDisplay += `#${element.id}`
    }
    elementTag.textContent = tagDisplay
    elementTag.style.color = "#007aff" // Make it blue like in the screenshot
  }

  // Update dimensions with natural dimensions if available
  if (elementDimensions && element.dimensions) {
    let dimensionText = `${element.dimensions.width || 0}×${element.dimensions.height || 0}px`
    if (element.dimensions.naturalWidth && element.dimensions.naturalHeight) {
      dimensionText += ` (natural: ${element.dimensions.naturalWidth}×${element.dimensions.naturalHeight}px)`
    }
    elementDimensions.textContent = dimensionText
  } else if (elementDimensions) {
    elementDimensions.textContent = "Unknown dimensions"
  }

  // Update position
  if (elementPosition && element.position) {
    elementPosition.textContent = `${element.position.left || 0}, ${element.position.top || 0}px`
  } else if (elementPosition) {
    elementPosition.textContent = "Unknown position"
  }

  // Update classes
  if (elementClassesContainer && elementClasses && element.classList && element.classList.length > 0) {
    elementClassesContainer.style.display = "block"
    elementClasses.textContent = element.classList.join(" ")
    elementClasses.title = element.classList.join(" ")
  } else if (elementClassesContainer) {
    elementClassesContainer.style.display = "none"
  }

  // Update CSS selector
  if (elementSelectorContainer && elementSelector && element.selector) {
    elementSelectorContainer.style.display = "block"
    elementSelector.textContent = element.selector
    elementSelector.title = element.selector
  } else if (elementSelectorContainer) {
    elementSelectorContainer.style.display = "none"
  }

  // Update source with primary source
  if (element.primarySource || element.src || element.currentSrc || element.backgroundImageUrl) {
    const sourceUrl = element.primarySource || element.src || element.currentSrc || element.backgroundImageUrl
    if (elementSrcContainer && elementSrc) {
      elementSrcContainer.style.display = "block"
      const displaySrc = sourceUrl.length > 60 ? sourceUrl.substring(0, 60) + "..." : sourceUrl
      elementSrc.textContent = displaySrc
      elementSrc.title = sourceUrl
    }
  } else if (elementSrcContainer) {
    elementSrcContainer.style.display = "none"
  }

  // Update text content
  if (element.textContent && element.textContent.trim()) {
    if (elementTextContainer && elementText) {
      elementTextContainer.style.display = "block"
      const displayText =
        element.textContent.length > 60 ? element.textContent.substring(0, 60) + "..." : element.textContent
      elementText.textContent = displayText
      elementText.title = element.textContent
    }
  } else if (elementTextContainer) {
    elementTextContainer.style.display = "none"
  }

  // Update preview image with click functionality
  if (elementImage) {
    const imageUrl =
      element.preview || element.primarySource || element.src || element.currentSrc || element.backgroundImageUrl

    if (imageUrl) {
      console.log("Setting LCP preview image:", imageUrl)
      elementImage.innerHTML = `
        <img src="${imageUrl}" 
             alt="LCP Element Preview" 
             class="element-preview-img clickable-preview" 
             title="Click to highlight this element on the page"
             crossorigin="anonymous">
      `

      // Add click handler to highlight element
      const previewImg = elementImage.querySelector(".clickable-preview")
      if (previewImg) {
        previewImg.addEventListener("click", () => {
          highlightLCPElementOnPage()
        })

        // Add error handling for image loading
        previewImg.addEventListener("error", () => {
          console.log("LCP preview image failed to load")
          elementImage.innerHTML = '<div class="preview-placeholder">Preview not available</div>'
        })
      }
    } else {
      console.log("No image URL available for LCP preview")
      elementImage.innerHTML = '<div class="preview-placeholder">No preview available</div>'
    }
  }

  // Make the entire preview clickable
  const lcpElementPreview = document.getElementById("lcpElementPreview")
  if (lcpElementPreview) {
    lcpElementPreview.style.cursor = "pointer"
    lcpElementPreview.title = "Click to highlight this element on the page"

    // Remove existing click handlers
    lcpElementPreview.replaceWith(lcpElementPreview.cloneNode(true))
    const newPreview = document.getElementById("lcpElementPreview")

    newPreview.addEventListener("click", () => {
      highlightLCPElementOnPage()
    })
  }
}

/**
 * Highlights the CLS element on the page
 */
async function highlightCLSElementOnPage() {
  console.log("highlightCLSElementOnPage called")

  const clsElementPreview = document.getElementById("clsElementPreview")

  try {
    // Use the global getTargetTabId function that handles both attached and detached modes
    const targetTabId = await window.getTargetTabId()
    console.log("Target tab ID for CLS highlighting:", targetTabId)

    if (!targetTabId) {
      console.log("No target tab available for CLS highlighting")
      if (clsElementPreview) {
        showElementFeedback(clsElementPreview, "error")
      }
      return false
    }

    // Show immediate feedback
    if (clsElementPreview) {
      showElementFeedback(clsElementPreview, "success")
    }

    const response = await sendMessageToContentScript(targetTabId, {
      action: "highlightCLSElement",
    })

    console.log("CLS highlight response:", response)
    return !!response
  } catch (error) {
    console.error("Error highlighting CLS element:", error)
    if (clsElementPreview) {
      showElementFeedback(clsElementPreview, "error")
    }
    return false
  }
}

/**
 * Highlights the LCP element on the page
 */
async function highlightLCPElementOnPage() {
  console.log("highlightLCPElementOnPage called")

  const lcpElementPreview = document.getElementById("lcpElementPreview")

  try {
    // Use the global getTargetTabId function that handles both attached and detached modes
    const targetTabId = await window.getTargetTabId()
    console.log("Target tab ID for LCP highlighting:", targetTabId)

    if (!targetTabId) {
      console.log("No target tab available for LCP highlighting")
      if (lcpElementPreview) {
        showElementFeedback(lcpElementPreview, "error")
      }
      return false
    }

    // Show immediate feedback
    if (lcpElementPreview) {
      showElementFeedback(lcpElementPreview, "success")
    }

    const response = await sendMessageToContentScript(targetTabId, {
      action: "highlightLCPElement",
    })

    console.log("LCP highlight response:", response)
    return !!response
  } catch (error) {
    console.error("Error highlighting LCP element:", error)
    if (lcpElementPreview) {
      showElementFeedback(lcpElementPreview, "error")
    }
    return false
  }
}

/**
 * Updates the plugin conflicts display
 * @param {Array} recommendations - Array of plugin recommendations
 */
function updatePluginConflicts(recommendations) {
  console.log("updatePluginConflicts called with:", recommendations)

  const container = document.getElementById("pluginConflicts")
  if (!container) return

  container.innerHTML = ""

  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = '<div class="no-conflicts">✅ No cache plugin conflicts detected</div>'
    return
  }

  recommendations.forEach((rec) => {
    const conflictEl = document.createElement("div")
    conflictEl.className = `conflict-item ${rec.type}`
    conflictEl.innerHTML = `
      <div class="conflict-header">
        <span class="conflict-icon">${rec.type === "critical" ? "🚨" : rec.type === "warning" ? "⚠️" : "💡"}</span>
        <span class="conflict-title">${rec.title}</span>
        <span class="conflict-impact ${rec.impact.toLowerCase()}">${rec.impact} Impact</span>
      </div>
      <div class="conflict-description">${rec.description}</div>
      <div class="conflict-action">
        <strong>Recommended Action:</strong> ${rec.action}
      </div>
    `
    container.appendChild(conflictEl)
  })
}
