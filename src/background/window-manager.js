/**
 * Module for managing detachable popup windows
 */

import {
    getWindowState,
    setWindowState,
    getDetachedWindowId,
    setDetachedWindowId,
    getWindowBounds,
    setWindowBounds,
    setOriginalTabId,
    WINDOW_STATES,
    DEFAULT_WINDOW_CONFIG,
  } from "../utils/window-state.js"
  
  // Declare the chrome variable
  
  // Track the current detached window
  let detachedWindow = null
  
  /**
   * Creates a detached popup window
   * @param {number} originalTabId - The ID of the original tab
   * @returns {Promise<chrome.windows.Window>} Created window
   */
  export async function createDetachedWindow(originalTabId) {
    try {
      // Get saved bounds or use defaults
      const savedBounds = await getWindowBounds()
  
      // Include original tab ID in the URL
      const popupUrl = originalTabId
        ? `${chrome.runtime.getURL("popup.html")}?originalTabId=${originalTabId}`
        : chrome.runtime.getURL("popup.html")
  
      const windowConfig = {
        ...DEFAULT_WINDOW_CONFIG,
        url: popupUrl,
        ...savedBounds,
      }
  
      const window = await chrome.windows.create(windowConfig)
      detachedWindow = window
  
      await setDetachedWindowId(window.id)
      await setWindowState(WINDOW_STATES.DETACHED)
  
      // Store the original tab ID in storage as backup
      if (originalTabId) {
        await setOriginalTabId(originalTabId)
      }
  
      console.log("Created detached window with ID:", window.id, "for tab:", originalTabId)
      return window
    } catch (error) {
      console.debug("Error creating detached window:", error)
      throw error
    }
  }
  
  /**
   * Focuses the detached window if it exists
   * @returns {Promise<boolean>} True if window was focused successfully
   */
  export async function focusDetachedWindow() {
    try {
      const windowId = await getDetachedWindowId()
      console.log("Attempting to focus detached window ID:", windowId)
  
      if (windowId) {
        try {
          // Check if window still exists
          const window = await chrome.windows.get(windowId)
          if (window) {
            console.log("Window found, focusing...")
  
            // Bring window to front and focus it
            await chrome.windows.update(windowId, {
              focused: true,
              state: "normal", // Ensure it's not minimized
            })
  
            // Additional focus attempt for better visibility
            setTimeout(async () => {
              try {
                await chrome.windows.update(windowId, { focused: true })
              } catch (e) {
                console.debug("Secondary focus attempt failed:", e)
              }
            }, 100)
  
            console.log("Successfully focused detached window")
            return true
          }
        } catch (error) {
          console.log("Window doesn't exist, cleaning up:", error)
          // Window doesn't exist, clean up
          await handleDetachedWindowClosed()
          return false
        }
      }
  
      console.log("No detached window ID found")
      return false
    } catch (error) {
      console.debug("Error focusing detached window:", error)
      return false
    }
  }
  
  /**
   * Handles cleanup when detached window is closed
   */
  export async function handleDetachedWindowClosed() {
    console.log("Cleaning up detached window state")
    detachedWindow = null
    await setDetachedWindowId(null)
    await setWindowState(WINDOW_STATES.ATTACHED)
  }
  
  /**
   * Saves current window bounds before closing
   * @param {number} windowId - Window ID to save bounds for
   */
  export async function saveWindowBounds(windowId) {
    try {
      const window = await chrome.windows.get(windowId)
      const bounds = {
        left: window.left,
        top: window.top,
        width: window.width,
        height: window.height,
      }
      await setWindowBounds(bounds)
      console.log("Saved window bounds:", bounds)
    } catch (error) {
      console.debug("Error saving window bounds:", error)
    }
  }
  
  /**
   * Attaches the popup back to the extension icon
   */
  export async function attachPopup() {
    const windowId = await getDetachedWindowId()
    console.log("Attaching popup, current detached window ID:", windowId)
  
    if (windowId) {
      try {
        // Save bounds before closing
        await saveWindowBounds(windowId)
        await chrome.windows.remove(windowId)
        console.log("Closed detached window")
      } catch (error) {
        console.debug("Error closing detached window:", error)
      }
    }
  
    await handleDetachedWindowClosed()
  }
  
  /**
   * Gets the current window state
   * @returns {Promise<string>} Current window state
   */
  export async function getCurrentWindowState() {
    return await getWindowState()
  }
  
  /**
   * Checks if a window ID matches our detached window
   * @param {number} windowId - Window ID to check
   * @returns {Promise<boolean>} True if it's our detached window
   */
  export async function isDetachedWindow(windowId) {
    const detachedWindowId = await getDetachedWindowId()
    return detachedWindowId === windowId
  }
  