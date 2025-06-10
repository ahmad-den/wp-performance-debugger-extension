/**
 * Module for managing popup tabs
 */

/**
 * Sets up tab switching functionality
 * @param {Array} tabs - Array of tab configuration objects
 */
export function setupTabSwitching(tabs) {
    function switchTab(activeTabId) {
      tabs.forEach((tabInfo) => {
        const tabEl = document.getElementById(tabInfo.id)
        const contentEl = document.getElementById(tabInfo.contentId)
        if (tabEl && contentEl) {
          if (tabInfo.id === activeTabId) {
            tabEl.classList.add("active")
            contentEl.classList.add("active")
          } else {
            tabEl.classList.remove("active")
            contentEl.classList.remove("active")
          }
        }
      })
      localStorage.setItem("activeExtensionTab", activeTabId)
    }
  
    // Add click listeners to tabs
    tabs.forEach((tabInfo) => {
      const tabEl = document.getElementById(tabInfo.id)
      if (tabEl) {
        tabEl.addEventListener("click", () => switchTab(tabInfo.id))
      }
    })
  
    // Restore last active tab or default to first tab
    const lastActiveTab = localStorage.getItem("activeExtensionTab")
    if (lastActiveTab && tabs.find((t) => t.id === lastActiveTab)) {
      switchTab(lastActiveTab)
    } else if (tabs.length > 0) {
      switchTab(tabs[0].id)
    }
  }
  