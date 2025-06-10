/**
 * Module for handling insights display in the popup
 */

/**
 * Updates the insights display with analysis results
 * @param {Object} data - Analysis data object
 */
export function updateInsightsDisplay(data) {
    // Update CLS display
    if (data.cls !== undefined) {
      updateCLSDisplay(data.cls)
    }
  
    // Update LCP display
    if (data.lcp !== undefined) {
      updateLCPDisplay(data.lcp)
    }
  
    // Update INP display
    if (data.inp !== undefined) {
      updateINPDisplay(data.inp)
    }
  
    // Update TTFB display
    if (data.additionalMetrics !== undefined) {
      updateTTFBDisplay(data.additionalMetrics)
    }
  
    // Update plugin conflicts
    if (data.pluginRecommendations !== undefined) {
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
    const clsScore = document.querySelector("#clsScore .metric-value")
    const clsRating = document.querySelector("#clsScore .metric-rating")
    const clsIndicator = document.getElementById("clsIndicator")
  
    if (clsScore && clsRating && clsIndicator) {
      const value = clsData.value || 0
      const rating = clsData.rating || "good"
  
      clsScore.textContent = value.toFixed(3)
      clsRating.textContent = rating.charAt(0).toUpperCase() + rating.slice(1).replace("-", " ")
      clsRating.className = `metric-rating ${rating}`
  
      // Update indicator position (0.5 = 50% of bar width)
      const position = Math.min((value / 0.5) * 100, 100)
      clsIndicator.style.left = `${position}%`
    }
  }
  
  /**
   * Updates the LCP display
   * @param {Object} lcpData - LCP data object
   */
  export function updateLCPDisplay(lcpData) {
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
  
      // Update LCP element preview
      if (lcpData.element && lcpElementPreview) {
        updateLCPElementPreview(lcpData.element)
        lcpElementPreview.style.display = "block"
      } else {
        lcpElementPreview.style.display = "none"
      }
    }
  }
  
  /**
   * Updates the INP display
   * @param {Object} inpData - INP data object
   */
  export function updateINPDisplay(inpData) {
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
    }
  }
  
  /**
   * Updates the TTFB display
   * @param {Object} metrics - Metrics object containing TTFB data
   */
  export function updateTTFBDisplay(metrics) {
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
    }
  }
  
  /**
   * Updates the LCP element preview
   * @param {Object} element - LCP element data
   */
  function updateLCPElementPreview(element) {
    const elementTag = document.getElementById("lcpElementTag")
    const elementImage = document.getElementById("lcpElementImage")
    const elementDimensions = document.getElementById("lcpElementDimensions")
    const elementPosition = document.getElementById("lcpElementPosition")
    const elementSrcContainer = document.getElementById("lcpElementSrcContainer")
    const elementSrc = document.getElementById("lcpElementSrc")
    const elementTextContainer = document.getElementById("lcpElementTextContainer")
    const elementText = document.getElementById("lcpElementText")
  
    if (!element) return
  
    // Update element tag
    if (elementTag) {
      let tagDisplay = element.tagName.toUpperCase()
      if (element.id) tagDisplay += `#${element.id}`
      if (element.className) tagDisplay += `.${element.className.split(" ")[0]}`
      elementTag.textContent = tagDisplay
    }
  
    // Update dimensions and position
    if (elementDimensions && element.dimensions) {
      elementDimensions.textContent = `${element.dimensions.width}×${element.dimensions.height}px`
    }
    if (elementPosition && element.position) {
      elementPosition.textContent = `${element.position.left}, ${element.position.top}px`
    }
  
    // Update source if it's an image
    if (element.src) {
      elementSrcContainer.style.display = "block"
      elementSrc.textContent = element.src.length > 50 ? element.src.substring(0, 50) + "..." : element.src
      elementSrc.title = element.src
    } else {
      elementSrcContainer.style.display = "none"
    }
  
    // Update text content
    if (element.textContent) {
      elementTextContainer.style.display = "block"
      elementText.textContent =
        element.textContent.length > 50 ? element.textContent.substring(0, 50) + "..." : element.textContent
      elementText.title = element.textContent
    } else {
      elementTextContainer.style.display = "none"
    }
  
    // Update preview image
    if (elementImage) {
      if (element.preview) {
        elementImage.innerHTML = `<img src="${element.preview}" alt="LCP Element Preview" class="element-preview-img">`
      } else {
        elementImage.innerHTML = '<div class="preview-placeholder">No preview available</div>'
      }
    }
  }
  
  /**
   * Updates the plugin conflicts display
   * @param {Array} recommendations - Array of plugin recommendations
   */
  function updatePluginConflicts(recommendations) {
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
  