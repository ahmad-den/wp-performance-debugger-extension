import { safeSendMessage } from "../../utils/messaging.js"

// CLS monitoring variables
let clsValue = 0
const clsEntries = []

/**
 * Initializes CLS (Cumulative Layout Shift) monitoring
 */
export function initializeCLSMonitoring() {
  if (!window.PerformanceObserver) return

  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          clsEntries.push({
            value: entry.value,
            startTime: entry.startTime,
            sources: entry.sources
              ? entry.sources.map((source) => ({
                  node: source.node ? source.node.tagName : "unknown",
                  currentRect: source.currentRect,
                  previousRect: source.previousRect,
                }))
              : [],
          })

          safeSendMessage({
            action: "updateCLS",
            value: clsValue,
            entries: clsEntries,
            rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
          })
        }
      }
    })

    observer.observe({ type: "layout-shift", buffered: true })

    setTimeout(() => {
      safeSendMessage({
        action: "updateCLS",
        value: clsValue,
        entries: clsEntries,
        rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
      })
    }, 1000)
  } catch (error) {
    // Silent error handling
  }
}

/**
 * Gets the current CLS data
 * @returns {Object} Current CLS data
 */
export function getCurrentCLSData() {
  return {
    value: clsValue,
    entries: clsEntries,
    rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
  }
}
