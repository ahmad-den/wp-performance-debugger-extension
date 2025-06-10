/**
 * Background service worker for the BigScoots Performance Debugger extension
 */

import { cleanupTab } from "./tab-manager.js"
import {
  cleanupTabParameters,
  getParametersFromUrl,
  updateUrlWithParameters,
  getTabParameters,
} from "./parameter-manager.js"
import { setupMessageHandlers } from "./message-handler.js"

// Set up message handlers
setupMessageHandlers(chrome)

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTab(tabId)
  cleanupTabParameters(tabId)
})

// Handle navigation events
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    try {
      // Only handle main frame navigation
      const currentParams = getTabParameters(details.tabId)
      if (currentParams && currentParams.size > 0) {
        const urlParams = getParametersFromUrl(details.url)
        const mergedParams = new Set([...urlParams, ...currentParams])

        // Update URL only if new parameters were added
        if (mergedParams.size > urlParams.size) {
          const newUrl = updateUrlWithParameters(details.url, mergedParams)
          if (newUrl !== details.url) {
            chrome.tabs.update(details.tabId, { url: newUrl })
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }
})

console.log("BigScoots Performance Debugger background service worker initialized")
