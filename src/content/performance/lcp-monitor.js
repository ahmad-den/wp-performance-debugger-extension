import { safeSendMessage } from "../../utils/messaging.js"

// LCP monitoring variables
let lcpValue = 0
let lcpElement = null
let lcpElementInfo = null

/**
 * Initializes LCP (Largest Contentful Paint) monitoring
 */
export function initializeLCPMonitoring() {
  if (!window.PerformanceObserver) return

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]

      if (lastEntry) {
        lcpValue = lastEntry.startTime
        lcpElement = lastEntry.element

        if (lcpElement) {
          lcpElementInfo = {
            tagName: lcpElement.tagName.toLowerCase(),
            id: lcpElement.id || null,
            className: lcpElement.className || null,
            src: lcpElement.src || null,
            alt: lcpElement.alt || null,
            textContent: lcpElement.textContent ? lcpElement.textContent.substring(0, 100) : null,
            dimensions: {
              width: lcpElement.offsetWidth,
              height: lcpElement.offsetHeight,
            },
            position: {
              top: lcpElement.offsetTop,
              left: lcpElement.offsetLeft,
            },
          }
        }

        safeSendMessage({
          action: "updateLCP",
          value: lcpValue,
          element: lcpElementInfo,
          rating: lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor",
        })
      }
    })

    observer.observe({ type: "largest-contentful-paint", buffered: true })

    setTimeout(() => {
      safeSendMessage({
        action: "updateLCP",
        value: lcpValue,
        element: lcpElementInfo,
        rating: lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor",
      })
    }, 2000)
  } catch (error) {
    // Silent error handling
  }
}

/**
 * Gets the current LCP data
 * @returns {Object} Current LCP data
 */
export function getCurrentLCPData() {
  return {
    value: lcpValue,
    element: lcpElementInfo,
    rating: lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor",
  }
}
