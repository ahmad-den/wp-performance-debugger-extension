/**
 * Module for handling extension messages
 */

import { storeTabResults, getTabResults } from "./tab-manager.js"
import { getTabParameters, addTabParameter, removeTabParameter, applyParametersToTab } from "./parameter-manager.js"

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
    } else if (request.action === "updateParameters") {
      handleUpdateParameters(request, sendResponse, chrome)
      return true // Keep the message channel open for async response
    } else if (request.action === "getParameters") {
      handleGetParameters(sendResponse, chrome)
      return true // Keep the message channel open for async response
    }
    return true
  })
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
  storeTabResults(sender.tab.id, request)
}

/**
 * Handles requests for analysis results
 * @param {Object} request - The request object
 * @param {Function} sendResponse - The response callback
 */
function handleGetAnalysisResults(request, sendResponse) {
  sendResponse(getTabResults(request.tabId))
}

/**
 * Handles parameter update requests
 * @param {Object} request - The request object
 * @param {Function} sendResponse - The response callback
 * @param {Object} chrome - The Chrome API object
 */
function handleUpdateParameters(request, sendResponse, chrome) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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

/**
 * Handles requests for parameters
 * @param {Function} sendResponse - The response callback
 * @param {Object} chrome - The Chrome API object
 */
function handleGetParameters(sendResponse, chrome) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0]
    const params = getTabParameters(activeTab.id)
    sendResponse(Array.from(params))
  })
}
