/**
 * Main popup script for the BigScoots Performance Debugger extension
 */

// Import display modules
import { updateImageDisplay } from "./displays/image-display.js"
import { updateFontDisplay } from "./displays/font-display.js"
import { updateHeaderDisplay } from "./displays/header-display.js"
import {
  updateInsightsDisplay,
  updateCLSDisplay,
  updateLCPDisplay,
  updateINPDisplay,
  updateTTFBDisplay,
} from "./displays/insights-display.js"

// Import management modules
import { setupTabSwitching } from "./tab-manager.js"
import { setupToggleManagement } from "./toggle-manager.js"
import {
  detachPopup,
  attachPopup,
  isDetachedWindow,
  applyDetachedModeStyles,
  updateWindowControlButton,
} from "./window-state-manager.js"

// Import the tab helpers
import { getTargetTabId, getOriginalTabIdFromUrl, verifyTabExists } from "../utils/tab-helpers.js"

// Declare chrome variable

/**
 * Tab configuration
 */
const TABS = [
  { id: "imageAnalyzerTab", contentId: "imageAnalyzerContent" },
  { id: "fontAnalyzerTab", contentId: "fontAnalyzerContent" },
  { id: "headerAnalyzerTab", contentId: "headerAnalyzerContent" },
  { id: "insightsTab", contentId: "insightsContent" },
  { id: "perfmattersDebugTab", contentId: "perfmattersDebugContent" },
]

// Store for cached data to persist across refreshes
let cachedAnalysisData = null
let isDetachedMode = false
let boundTabId = null // The tab this detached window is bound to
let boundTabUrl = null // The URL of the bound tab

/**
 * Gets the correct tab ID for messaging, handling detached mode
 * @returns {Promise<number|null>} Tab ID or null if not available
 */
async function getTargetTabIdForMessaging() {
  if (isDetachedMode && boundTabId) {
    // In detached mode, always use the bound tab ID
    return boundTabId
  }
  return await getTargetTabId(isDetachedMode)
}

/**
 * Updates the current URL display in the header
 * @param {string} url - The URL to display
 */
function updateCurrentUrlDisplay(url) {
  const currentUrlElement = document.getElementById("currentUrl")
  const currentUrlValue = document.getElementById("currentUrlValue")

  if (currentUrlElement && currentUrlValue && url) {
    // Clean up the URL for display
    let displayUrl = url
    try {
      const urlObj = new URL(url)

      // Get hostname and pathname
      displayUrl = urlObj.hostname

      // Add pathname but remove trailing slash
      let pathname = urlObj.pathname
      if (pathname !== "/" && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1)
      }

      // Only add pathname if it's not just "/"
      if (pathname !== "/") {
        displayUrl += pathname
      }

      // Add search params if present
      if (urlObj.search) {
        displayUrl += urlObj.search
      }
    } catch (error) {
      // If URL parsing fails, use the original URL
      // Still try to remove trailing slash
      if (displayUrl.endsWith("/") && displayUrl.length > 1) {
        displayUrl = displayUrl.slice(0, -1)
      }
    }

    currentUrlValue.textContent = displayUrl
    currentUrlElement.classList.add("visible")

    // Store the bound tab URL in detached mode
    if (isDetachedMode) {
      boundTabUrl = url
    }
  } else if (currentUrlElement) {
    currentUrlElement.classList.remove("visible")
  }
}

/**
 * Updates the popup with analysis results
 */
async function updatePopupWithResults() {
  try {
    if (isDetachedMode) {
      // In detached mode, get the original tab ID
      const originalTabId = await getOriginalTabIdFromUrl()

      if (!originalTabId) {
        console.log("No original tab ID found in detached mode")
        showEmptyStates()
        updateCurrentUrlDisplay("Tab not available")
        return
      }

      // Verify the tab still exists
      const tabExists = await verifyTabExists(originalTabId)
      if (!tabExists) {
        console.log("Original tab no longer exists:", originalTabId)
        showEmptyStates()
        updateCurrentUrlDisplay("Tab closed or unavailable")
        return
      }

      // Set the bound tab ID
      boundTabId = originalTabId
      console.log("Detached mode: bound to tab", boundTabId)

      // Get the URL of the bound tab
      chrome.runtime.sendMessage({ action: "getTabUrl", tabId: boundTabId }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          console.log(
            "Error getting tab URL:",
            chrome.runtime.lastError || (response ? response.error : "Unknown error"),
          )
          return
        }

        console.log("Bound tab URL:", response.url)
        updateCurrentUrlDisplay(response.url)
      })

      // Get analysis results for the bound tab
      chrome.runtime.sendMessage({ action: "getAnalysisResults", tabId: boundTabId }, (data) => {
        if (chrome.runtime.lastError) {
          console.log("Error getting analysis results:", chrome.runtime.lastError)
          return
        }

        if (data && Object.keys(data).length > 0) {
          console.log("Received analysis data for bound tab")
          cachedAnalysisData = data
          displayAnalysisData(data)
        } else {
          console.log("No analysis data available for bound tab, requesting fresh analysis")
          chrome.tabs.sendMessage(boundTabId, { action: "requestAnalysis" }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("Content script not ready on bound tab")
            }
          })
        }
      })

      // Get current performance data
      chrome.tabs.sendMessage(boundTabId, { action: "getCurrentPerformanceData" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Error getting performance data:", chrome.runtime.lastError)
          return
        }

        if (response) {
          updatePerformanceMetrics(response)
        }
      })

      return
    }

    // Attached mode logic
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (chrome.runtime.lastError || !activeTabs || activeTabs.length === 0) {
        console.log("No active tabs found in attached mode")
        showEmptyStates()
        return
      }

      const currentTabId = activeTabs[0].id
      const currentTab = activeTabs[0]

      // Update URL display
      if (currentTab.url) {
        updateCurrentUrlDisplay(currentTab.url)
      }

      // Query stored analysis results from background script
      chrome.runtime.sendMessage({ action: "getAnalysisResults", tabId: currentTabId }, (data) => {
        if (chrome.runtime.lastError) {
          console.log("Error getting analysis results:", chrome.runtime.lastError)
          return
        }

        if (data && Object.keys(data).length > 0) {
          console.log("Received analysis data for current tab")
          cachedAnalysisData = data
          displayAnalysisData(data)
        } else {
          console.log("No analysis data available, requesting fresh analysis")
          chrome.tabs.sendMessage(currentTabId, { action: "requestAnalysis" }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("Content script not ready yet")
            }
          })
        }
      })

      // Query content script for current performance data
      chrome.tabs.sendMessage(currentTabId, { action: "getCurrentPerformanceData" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Content script message error:", chrome.runtime.lastError)
          return
        }

        if (response) {
          updatePerformanceMetrics(response)
        }
      })
    })
  } catch (error) {
    console.error("Error updating popup with results:", error)
    showEmptyStates()
  }
}

/**
 * Displays analysis data in the UI
 * @param {Object} data - Analysis data to display
 */
function displayAnalysisData(data) {
  if (data.images) {
    console.log("Updating images:", data.images.length)
    updateImageDisplay(data.images)
  }
  if (data.fonts) {
    console.log("Updating fonts:", data.fonts.length)
    updateFontDisplay(data.fonts)
  }
  if (data.headers) {
    console.log("Updating headers")
    updateHeaderDisplay(data.headers)
  }
  updateInsightsDisplay(data)
}

/**
 * Updates performance metrics
 * @param {Object} response - Performance data response
 */
function updatePerformanceMetrics(response) {
  console.log("Updating performance metrics")
  if (response.cls) updateCLSDisplay(response.cls)
  if (response.lcp) updateLCPDisplay(response.lcp)
  if (response.inp) updateINPDisplay(response.inp)
  if (response.additionalMetrics) updateTTFBDisplay(response.additionalMetrics)
}

/**
 * Shows empty states for all displays
 */
function showEmptyStates() {
  updateImageDisplay([])
  updateFontDisplay([])
  updateHeaderDisplay({})
  updateInsightsDisplay({})
}

/**
 * Sets up periodic polling for performance data
 */
function setupPeriodicPolling() {
  setInterval(async () => {
    if (!isDetachedMode) {
      // In attached mode, we don't need to poll - the popup will be recreated when clicked
      return
    }

    // In detached mode, poll the bound tab
    if (boundTabId) {
      // First verify the tab still exists
      const tabExists = await verifyTabExists(boundTabId)
      if (!tabExists) {
        console.log("Bound tab no longer exists:", boundTabId)
        showEmptyStates()
        updateCurrentUrlDisplay("Tab closed or unavailable")
        return
      }

      // Get current performance data
      chrome.tabs.sendMessage(boundTabId, { action: "getCurrentPerformanceData" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Error polling bound tab:", chrome.runtime.lastError)
          return
        }

        if (response) {
          updatePerformanceMetrics(response)
        }
      })
    }
  }, 2000)
}

/**
 * Sets up message listeners for updates from content script
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Popup received message:", message.action)

    // In detached mode, only process messages from the bound tab
    if (isDetachedMode && boundTabId) {
      if (sender.tab && sender.tab.id !== boundTabId) {
        console.log("Ignoring message from non-bound tab:", sender.tab.id, "bound to:", boundTabId)
        return
      }

      // Special handling for tab URL changes
      if (message.action === "tabUrlChanged" && message.tabId === boundTabId) {
        console.log("Bound tab URL changed:", message.url)
        updateCurrentUrlDisplay(message.url)
      }
    }

    // Process performance updates
    if (message.action === "updateCLS") {
      updateCLSDisplay(message)
    } else if (message.action === "updateLCP") {
      updateLCPDisplay(message)
    } else if (message.action === "updateINP") {
      updateINPDisplay(message)
    } else if (message.action === "updateAdditionalMetrics") {
      updateTTFBDisplay(message.metrics)
    } else if (message.action === "analysisResults") {
      // Only process analysis results from the bound tab in detached mode
      if (isDetachedMode && boundTabId) {
        if (sender.tab && sender.tab.id === boundTabId) {
          console.log("Received fresh analysis results from bound tab")
          cachedAnalysisData = message
          displayAnalysisData(message)
        }
      } else if (!isDetachedMode) {
        // In attached mode, process all analysis results
        console.log("Received fresh analysis results in attached mode")
        cachedAnalysisData = message
        displayAnalysisData(message)
      }
    }
  })
}

/**
 * Sets up the detach/attach button functionality
 */
async function setupWindowControls() {
  const windowControlsContainer = document.querySelector(".window-controls")
  if (!windowControlsContainer) return

  // Detect if we're in detached mode
  isDetachedMode = await isDetachedWindow()
  console.log("Window mode detected:", isDetachedMode ? "detached" : "attached")

  // Apply detached mode styles if needed
  applyDetachedModeStyles(isDetachedMode)

  const button = windowControlsContainer.querySelector(".window-toggle-btn")

  if (button) {
    // Update button icon and tooltip based on current state
    updateWindowControlButton(isDetachedMode, button)

    // Add click handler
    button.addEventListener("click", async () => {
      button.disabled = true

      try {
        if (isDetachedMode) {
          await attachPopup()
        } else {
          await detachPopup()
        }
      } catch (error) {
        console.error("Error toggling window state:", error)
      } finally {
        button.disabled = false
      }
    })
  }
}

/**
 * Sets up resize handling for detached mode
 */
function setupResizeHandling() {
  if (isDetachedMode) {
    window.addEventListener("resize", () => {
      // Reapply detached mode styles on resize
      applyDetachedModeStyles(true)
    })
  }
}

/**
 * Refreshes toggle states when popup loads or mode changes
 */
async function refreshToggleStates() {
  try {
    // Get the target tab ID
    const targetTabId = await getTargetTabIdForMessaging()

    if (!targetTabId) {
      console.log("No target tab available for refreshing toggle states")
      return
    }

    console.log("Refreshing toggle states for tab:", targetTabId)

    // Get current parameters for this tab
    chrome.runtime.sendMessage({ action: "getParameters", tabId: targetTabId }, (parameters) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting parameters for refresh:", chrome.runtime.lastError)
        return
      }

      // Ensure parameters is an array
      if (!Array.isArray(parameters)) {
        parameters = []
      }

      console.log("Refreshed parameters for tab", targetTabId, ":", parameters)

      // Update toggle states
      const perfmattersoff = document.getElementById("perfmattersoff")
      const perfmatterscssoff = document.getElementById("perfmatterscssoff")
      const perfmattersjsoff = document.getElementById("perfmattersjsoff")
      const nocache = document.getElementById("nocache")

      if (perfmattersoff) perfmattersoff.checked = parameters.includes("perfmattersoff")
      if (perfmatterscssoff) perfmatterscssoff.checked = parameters.includes("perfmatterscssoff")
      if (perfmattersjsoff) perfmattersjsoff.checked = parameters.includes("perfmattersjsoff")
      if (nocache) nocache.checked = parameters.includes("nocache")

      // Update toggle dependencies
      if (window.updateToggleStates) {
        window.updateToggleStates(true)
      }
    })
  } catch (error) {
    console.error("Error refreshing toggle states:", error)
  }
}

/**
 * Initializes the popup when DOM is loaded
 */
async function initializePopup() {
  try {
    // Detect mode first
    isDetachedMode = await isDetachedWindow()
    console.log("Initializing popup in mode:", isDetachedMode ? "detached" : "attached")

    // Make helper function globally available
    window.getTargetTabId = getTargetTabIdForMessaging

    // Set up tab switching
    setupTabSwitching(TABS)

    // Set up toggle management
    setupToggleManagement()

    // Make updateToggleStates globally available for refresh
    const toggleManagerModule = await import("./toggle-manager.js")
    if (toggleManagerModule.updateToggleStates) {
      window.updateToggleStates = toggleManagerModule.updateToggleStates
    }

    // Set up window controls
    await setupWindowControls()

    // Set up resize handling for detached mode
    setupResizeHandling()

    // Update popup with initial results
    await updatePopupWithResults()

    // Refresh toggle states after everything is loaded
    await refreshToggleStates()

    // Set up periodic polling
    setupPeriodicPolling()

    // Set up message listeners
    setupMessageListeners()

    console.log("BigScoots Performance Debugger popup initialized successfully")
  } catch (error) {
    console.error("Error initializing popup:", error)
    showEmptyStates()
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializePopup)
