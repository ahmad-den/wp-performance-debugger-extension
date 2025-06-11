/**
 * Module for handling extension messages
 */

import { storeTabResults, getTabResults } from "./tab-manager.js"
import { getTabParameters, addTabParameter, removeTabParameter, applyParametersToTab } from "./parameter-manager.js"
import {
  createDetachedWindow,
  attachPopup,
  getCurrentWindowState,
  focusDetachedWindow,
  handleDetachedWindowClosed,
} from "./window-manager.js"
import { getWindowState, WINDOW_STATES } from "../utils/window-state.js"

// Declare chrome variable

/**
 * Sets up message handlers for the extension
 * @param {Object} chrome - The Chrome API object
 */
export function setupMessageHandlers(chrome) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateBadge") {
      handleUpdateBadge(request, sender, chrome)
    } else if (request.action === "analysisResults") {
      handleAnalysisResults(request, sender)
    } else if (request.action === "getAnalysisResults") {
      handleGetAnalysisResults(request, sendResponse)
      return true
    } else if (request.action === "updateParameters") {
      handleUpdateParameters(request, sendResponse, chrome)
      return true
    } else if (request.action === "getParameters") {
      handleGetParameters(sendResponse, chrome, request) // Pass request object
      return true
    } else if (request.action === "detachPopup") {
      handleDetachPopup(sendResponse, chrome)
      return true
    } else if (request.action === "attachPopup") {
      handleAttachPopup(sendResponse)
      return true
    } else if (request.action === "getWindowState") {
      handleGetWindowState(sendResponse)
      return true
    } else if (request.action === "tabUrlChanged") {
      // New handler for tab URL changes
      handleTabUrlChanged(request, sendResponse)
      return true
    } else if (request.action === "getTabUrl") {
      // New handler to get a tab's URL
      handleGetTabUrl(request, sendResponse)
      return true
    }
    return true
  })

  // Add listener for tab URL changes
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      // Broadcast URL change to all extension contexts
      chrome.runtime
        .sendMessage({
          action: "tabUrlChanged",
          tabId: tabId,
          url: changeInfo.url,
        })
        .catch(() => {
          // Ignore errors if no receivers
        })
    }
  })
}

// Add this new handler function to get a tab's URL
function handleGetTabUrl(request, sendResponse) {
  if (!request.tabId) {
    sendResponse({ success: false, error: "No tab ID provided" })
    return
  }

  chrome.tabs.get(request.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message })
      return
    }

    if (tab) {
      sendResponse({ success: true, url: tab.url, tab: tab })
    } else {
      sendResponse({ success: false, error: "Tab not found" })
    }
  })
}

/**
 * Handles tab URL changes
 * @param {Object} request - The request object
 * @param {Function} sendResponse - The response callback
 */
function handleTabUrlChanged(request, sendResponse) {
  console.log("Tab URL changed:", request.tabId, request.url)
  // Forward to any open detached windows
  forwardToDetachedWindows({
    action: "tabUrlChanged",
    tabId: request.tabId,
    url: request.url,
  })

  if (sendResponse) {
    sendResponse({ success: true })
  }
}

/**
 * Handles extension icon clicks based on current window state
 */
export async function handleExtensionIconClick() {
  const currentState = await getWindowState()
  console.log("Extension icon clicked, current state:", currentState)

  if (currentState === WINDOW_STATES.DETACHED) {
    console.log("In detached mode, attempting to focus window")
    const focused = await focusDetachedWindow()
    if (!focused) {
      console.log("Failed to focus detached window, resetting to attached state")
      // Window was closed, reset to attached state
      await handleDetachedWindowClosed()
      return false // Allow default popup behavior
    }
    console.log("Successfully focused detached window")
    return true // Prevent default popup behavior
  }

  console.log("In attached mode, allowing default popup behavior")
  // For attached state, Chrome handles the default popup behavior
  return false
}

/**
 * Handles badge update requests
 * @param {Object} request - The request object
 * @param {Object} sender - The sender object
 * @param {Object} chrome - The Chrome API object
 */
function handleUpdateBadge(request, sender, chrome) {
  const hostedBy = request.hostedBy ? request.hostedBy.toLowerCase() : ""
  const cacheStatus = request.cacheStatus ? request.cacheStatus.toLowerCase() : ""

  const isHostedByBigScoots = hostedBy === "bigscoots"
  const isCacheHit = cacheStatus === "hit"

  let badgeColor

  if (isHostedByBigScoots && isCacheHit) {
    // Both conditions met - blue badge
    badgeColor = "#1a73e8"
  } else if (isHostedByBigScoots) {
    // Only BigScoots hosting - green badge
    badgeColor = "#4CAF50"
  } else {
    // Neither condition met - red badge
    badgeColor = "#F44336"
  }

  chrome.action.setBadgeText({ text: "●", tabId: sender.tab.id })
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0], tabId: sender.tab.id })
  chrome.action.setBadgeTextColor({ color: badgeColor, tabId: sender.tab.id })
}

/**
 * Handles analysis results storage
 * @param {Object} request - The request object
 * @param {Object} sender - The sender object
 */
function handleAnalysisResults(request, sender) {
  console.log("Storing analysis results for tab:", sender.tab.id)
  storeTabResults(sender.tab.id, request)

  // Forward to any open detached windows
  forwardToDetachedWindows(request)
}

/**
 * Forwards messages to detached windows
 * @param {Object} message - Message to forward
 */
async function forwardToDetachedWindows(message) {
  try {
    const currentState = await getWindowState()
    if (currentState === WINDOW_STATES.DETACHED) {
      // Send message to all extension contexts (including detached windows)
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore errors if no receivers
      })
    }
  } catch (error) {
    console.debug("Error forwarding to detached windows:", error)
  }
}

/**
 * Handles requests for analysis results
 * @param {Object} request - The request object
 * @param {Function} sendResponse - The response callback
 */
function handleGetAnalysisResults(request, sendResponse) {
  const results = getTabResults(request.tabId)
  console.log("Returning analysis results for tab:", request.tabId, results ? "found" : "not found")
  sendResponse(results)
}

/**
 * Handles parameter update requests
 * @param {Object} request - The request object
 * @param {Function} sendResponse - The response callback
 * @param {Object} chrome - The Chrome API object
 */
function handleUpdateParameters(request, sendResponse, chrome) {
  // If a specific tab ID is provided, use it; otherwise fall back to active tab
  if (request.tabId) {
    console.log("Updating parameters for specific tab:", request.tabId)

    chrome.tabs.get(request.tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        console.error("Tab not found:", request.tabId, chrome.runtime.lastError)
        sendResponse({ urlChanged: false, error: "Tab not found" })
        return
      }

      let changed = false

      if (request.add) {
        changed = addTabParameter(tab.id, request.parameter)
      } else {
        changed = removeTabParameter(tab.id, request.parameter)
      }

      if (changed) {
        applyParametersToTab(tab.id, chrome)
      }

      sendResponse({ urlChanged: changed })
    })
  } else {
    // Fallback to active tab behavior
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        sendResponse({ urlChanged: false, error: "No active tab found" })
        return
      }

      const activeTab = tabs[0]
      let changed = false

      if (request.add) {
        changed = addTabParameter(activeTab.id, request.parameter)
      } else {
        changed = removeTabParameter(activeTab.id, request.parameter)
      }

      if (changed) {
        applyParametersToTab(activeTab.id, chrome)
      }

      sendResponse({ urlChanged: changed })
    })
  }
}

/**
 * Handles requests for parameters
 * @param {Function} sendResponse - The response callback
 * @param {Object} chrome - The Chrome API object
 */
function handleGetParameters(sendResponse, chrome) {
  // If a specific tab ID is provided in the request, use it
  const request = arguments[2] // Get the original request object

  if (request && request.tabId) {
    console.log("Getting parameters for specific tab:", request.tabId)
    const params = getTabParameters(request.tabId)
    sendResponse(Array.from(params))
    return
  }

  // Fallback to active tab behavior
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
      sendResponse([])
      return
    }

    const activeTab = tabs[0]
    const params = getTabParameters(activeTab.id)
    sendResponse(Array.from(params))
  })
}

/**
 * Handles popup detachment requests
 * @param {Function} sendResponse - The response callback
 * @param {Object} chrome - The Chrome API object
 */
async function handleDetachPopup(sendResponse, chrome) {
  try {
    console.log("Creating detached popup window")

    // Get the current active tab ID to pass to the detached window
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          resolve([])
        } else {
          resolve(tabs || [])
        }
      })
    })

    const originalTabId = tabs.length > 0 ? tabs[0].id : null

    console.log("Original tab ID for detached window:", originalTabId)

    const window = await createDetachedWindow(originalTabId)
    sendResponse({ success: true, windowId: window.id, originalTabId })
  } catch (error) {
    console.error("Failed to create detached window:", error)
    sendResponse({ success: false, error: error.message })
  }
}

/**
 * Handles popup attachment requests
 * @param {Function} sendResponse - The response callback
 */
async function handleAttachPopup(sendResponse) {
  try {
    console.log("Attaching popup to extension icon")
    await attachPopup()
    sendResponse({ success: true })
  } catch (error) {
    console.error("Failed to attach popup:", error)
    sendResponse({ success: false, error: error.message })
  }
}

/**
 * Handles window state requests
 * @param {Function} sendResponse - The response callback
 */
async function handleGetWindowState(sendResponse) {
  try {
    const state = await getCurrentWindowState()
    sendResponse({ state })
  } catch (error) {
    sendResponse({ state: "attached", error: error.message })
  }
}
