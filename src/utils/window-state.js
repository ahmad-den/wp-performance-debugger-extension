/**
 * Utility module for managing popup window state
 */

// Window state constants
export const WINDOW_STATES = {
    ATTACHED: "attached",
    DETACHED: "detached",
  }
  
  // Storage keys
  export const STORAGE_KEYS = {
    WINDOW_STATE: "popup_window_state",
    DETACHED_WINDOW_ID: "detached_window_id",
    WINDOW_BOUNDS: "detached_window_bounds",
  }
  
  // Default window dimensions
  export const DEFAULT_WINDOW_CONFIG = {
    width: 800, // Increased from 600
    height: 700, // Increased from 600
    type: "popup",
    focused: true,
  }
  
  // Declare chrome variable
  
  /**
   * Gets the current window state from storage
   * @returns {Promise<string>} Current window state
   */
  export async function getWindowState() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.WINDOW_STATE)
      return result[STORAGE_KEYS.WINDOW_STATE] || WINDOW_STATES.ATTACHED
    } catch (error) {
      console.debug("Error getting window state:", error)
      return WINDOW_STATES.ATTACHED
    }
  }
  
  /**
   * Sets the window state in storage
   * @param {string} state - The window state to set
   */
  export async function setWindowState(state) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.WINDOW_STATE]: state })
    } catch (error) {
      console.debug("Error setting window state:", error)
    }
  }
  
  /**
   * Gets the detached window ID from storage
   * @returns {Promise<number|null>} Window ID or null
   */
  export async function getDetachedWindowId() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.DETACHED_WINDOW_ID)
      return result[STORAGE_KEYS.DETACHED_WINDOW_ID] || null
    } catch (error) {
      console.debug("Error getting detached window ID:", error)
      return null
    }
  }
  
  /**
   * Sets the detached window ID in storage
   * @param {number|null} windowId - The window ID to store
   */
  export async function setDetachedWindowId(windowId) {
    try {
      if (windowId === null) {
        await chrome.storage.local.remove(STORAGE_KEYS.DETACHED_WINDOW_ID)
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.DETACHED_WINDOW_ID]: windowId })
      }
    } catch (error) {
      console.debug("Error setting detached window ID:", error)
    }
  }
  
  /**
   * Gets saved window bounds from storage
   * @returns {Promise<Object|null>} Window bounds or null
   */
  export async function getWindowBounds() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.WINDOW_BOUNDS)
      return result[STORAGE_KEYS.WINDOW_BOUNDS] || null
    } catch (error) {
      console.debug("Error getting window bounds:", error)
      return null
    }
  }
  
  /**
   * Saves window bounds to storage
   * @param {Object} bounds - Window bounds object
   */
  export async function setWindowBounds(bounds) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.WINDOW_BOUNDS]: bounds })
    } catch (error) {
      console.debug("Error setting window bounds:", error)
    }
  }
  
  /**
   * Gets the original tab ID from storage
   * @returns {Promise<number|null>} Original tab ID or null
   */
  export async function getOriginalTabId() {
    try {
      const result = await chrome.storage.local.get("originalTabId")
      return result.originalTabId || null
    } catch (error) {
      console.debug("Error getting original tab ID:", error)
      return null
    }
  }
  
  /**
   * Sets the original tab ID in storage
   * @param {number|null} tabId - The tab ID to store
   */
  export async function setOriginalTabId(tabId) {
    try {
      if (tabId === null) {
        await chrome.storage.local.remove("originalTabId")
      } else {
        await chrome.storage.local.set({ originalTabId: tabId })
      }
    } catch (error) {
      console.debug("Error setting original tab ID:", error)
    }
  }
  
  /**
   * Clears the original tab ID from storage
   */
  export async function clearOriginalTabId() {
    try {
      await chrome.storage.local.remove("originalTabId")
    } catch (error) {
      console.debug("Error clearing original tab ID:", error)
    }
  }
  
  /**
   * Checks if current window is the detached popup window
   * @returns {Promise<boolean>} True if this is the detached window
   */
  export async function isCurrentWindowDetached() {
    try {
      const currentWindowId = await getCurrentWindowId()
      const detachedWindowId = await getDetachedWindowId()
      return currentWindowId === detachedWindowId
    } catch (error) {
      console.debug("Error checking if current window is detached:", error)
      return false
    }
  }
  
  /**
   * Gets the current window ID
   * @returns {Promise<number|null>} Current window ID or null
   */
  export async function getCurrentWindowId() {
    try {
      const currentWindow = await chrome.windows.getCurrent()
      return currentWindow.id
    } catch (error) {
      console.debug("Error getting current window ID:", error)
      return null
    }
  }
  