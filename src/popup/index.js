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

// Declare chrome variable
const chrome = window.chrome

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

/**
 * Updates the popup with analysis results from the background script
 */
function updatePopupWithResults() {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (chrome.runtime.lastError || !activeTabs || activeTabs.length === 0) {
      showEmptyStates()
      return
    }
    const currentTabId = activeTabs[0].id

    // Query stored analysis results from background script
    chrome.runtime.sendMessage({ action: "getAnalysisResults", tabId: currentTabId }, (data) => {
      if (chrome.runtime.lastError) {
        console.log("Error getting analysis results:", chrome.runtime.lastError)
        data = null
      }

      console.log("Received analysis data:", data) // Debug log

      if (data && Object.keys(data).length > 0) {
        // Update displays with the received data
        if (data.images) {
          console.log("Updating images:", data.images)
          updateImageDisplay(data.images)
        }
        if (data.fonts) {
          console.log("Updating fonts:", data.fonts)
          updateFontDisplay(data.fonts)
        }
        if (data.headers) {
          console.log("Updating headers:", data.headers)
          updateHeaderDisplay(data.headers)
        }
        updateInsightsDisplay(data)
      } else {
        console.log("No analysis data available, showing empty states")
        showEmptyStates()
      }
    })

    // Query content script for current performance data via tab messaging
    chrome.tabs.sendMessage(currentTabId, { action: "getCurrentPerformanceData" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Content script message error:", chrome.runtime.lastError)
        return
      }

      if (response) {
        console.log("Current performance data:", response)
        // Update all metrics without resetting others
        if (response.cls) updateCLSDisplay(response.cls)
        if (response.lcp) updateLCPDisplay(response.lcp)
        if (response.inp) updateINPDisplay(response.inp)
        if (response.additionalMetrics) updateTTFBDisplay(response.additionalMetrics)
      }
    })
  })
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
  setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (!activeTabs || activeTabs.length === 0) return
      const currentTabId = activeTabs[0].id

      // Query for fresh performance data via tab messaging
      chrome.tabs.sendMessage(currentTabId, { action: "getCurrentPerformanceData" }, (response) => {
        if (chrome.runtime.lastError) {
          return // Content script might not be ready
        }

        if (response) {
          // Update all metrics
          if (response.cls) updateCLSDisplay(response.cls)
          if (response.lcp) updateLCPDisplay(response.lcp)
          if (response.inp) updateINPDisplay(response.inp)
          if (response.additionalMetrics) updateTTFBDisplay(response.additionalMetrics)
        }
      })
    })
  }, 2000)
}

/**
 * Sets up message listeners for updates from content script
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Popup received message:", message) // Debug log

    if (message.action === "updateCLS") {
      updateCLSDisplay(message)
    } else if (message.action === "updateLCP") {
      updateLCPDisplay(message)
    } else if (message.action === "updateINP") {
      console.log("Processing INP update:", message) // Debug log
      updateINPDisplay(message)
    } else if (message.action === "updateAdditionalMetrics") {
      updateTTFBDisplay(message.metrics)
    }
  })
}

/**
 * Initializes the popup when DOM is loaded
 */
function initializePopup() {
  // Set up tab switching
  setupTabSwitching(TABS)

  // Set up toggle management
  setupToggleManagement()

  // Update popup with initial results
  updatePopupWithResults()

  // Set up periodic polling
  setupPeriodicPolling()

  // Set up message listeners
  setupMessageListeners()

  console.log("BigScoots Performance Debugger popup initialized")
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializePopup)
