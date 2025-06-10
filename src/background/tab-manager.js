/**
 * Module for managing tab-specific data
 */

// Store analysis results per tab
const tabResults = new Map()

/**
 * Stores analysis results for a specific tab
 * @param {number} tabId - The ID of the tab
 * @param {Object} results - The analysis results to store
 */
export function storeTabResults(tabId, results) {
  tabResults.set(tabId, results)
}

/**
 * Gets analysis results for a specific tab
 * @param {number} tabId - The ID of the tab
 * @returns {Object|null} The analysis results or null if not found
 */
export function getTabResults(tabId) {
  return tabResults.get(tabId) || null
}

/**
 * Removes stored data for a tab
 * @param {number} tabId - The ID of the tab to clean up
 */
export function cleanupTab(tabId) {
  tabResults.delete(tabId)
}
