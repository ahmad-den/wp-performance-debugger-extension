import { safeSendMessage } from "../../utils/messaging.js"

// Make INP monitoring variables globally accessible
window.maxINP = 0
window.interactions = new Map()
window.inpEntries = []

/**
 * Initializes INP (Interaction to Next Paint) monitoring
 */
export function initializeINPMonitoring() {
  if (!window.PerformanceObserver) return

  if (!PerformanceObserver.supportedEntryTypes || !PerformanceObserver.supportedEntryTypes.includes("event")) {
    initializeManualINPTracking()
    return
  }

  try {
    function processEntry(entry) {
      if (!entry.interactionId) return

      const interactionId = entry.interactionId
      const duration = entry.duration

      const existing = window.interactions.get(interactionId)
      if (!existing || duration > existing) {
        window.interactions.set(interactionId, duration)

        const entryDetails = {
          interactionId,
          duration: Math.round(duration),
          startTime: entry.startTime,
          name: entry.name,
          target: entry.target ? entry.target.tagName : "unknown",
          timestamp: Date.now(),
        }

        if (duration > window.maxINP) {
          window.maxINP = duration
          window.inpEntries.unshift(entryDetails)
          if (window.inpEntries.length > 10) {
            window.inpEntries.pop()
          }

          const rating = duration < 200 ? "good" : duration < 500 ? "needs-improvement" : "poor"

          safeSendMessage({
            action: "updateINP",
            value: Math.round(duration),
            entries: window.inpEntries,
            rating: rating,
            status: "measured",
          })
        }
      }
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        processEntry(entry)
      }
    })

    observer.observe({
      type: "event",
      buffered: true,
      durationThreshold: 0,
    })

    setTimeout(() => {
      if (window.maxINP === 0) {
        safeSendMessage({
          action: "updateINP",
          value: null,
          entries: [],
          rating: "good",
          status: "waiting",
        })
      }
    }, 1000)
  } catch (error) {
    initializeManualINPTracking()
  }
}

/**
 * Initializes manual INP tracking as fallback
 */
function initializeManualINPTracking() {
  const interactionEvents = ["pointerdown", "click", "keydown"]

  interactionEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      (event) => {
        const startTime = performance.now()

        requestAnimationFrame(() => {
          const duration = performance.now() - startTime

          if (duration > window.maxINP) {
            window.maxINP = duration

            const entryDetails = {
              duration: Math.round(duration),
              startTime,
              name: eventType,
              target: event.target ? event.target.tagName : "unknown",
              method: "manual",
              timestamp: Date.now(),
            }

            window.inpEntries.unshift(entryDetails)
            if (window.inpEntries.length > 10) {
              window.inpEntries.pop()
            }

            const rating = duration < 200 ? "good" : duration < 500 ? "needs-improvement" : "poor"

            safeSendMessage({
              action: "updateINP",
              value: Math.round(duration),
              entries: window.inpEntries,
              rating: rating,
              status: "measured",
            })
          }
        })
      },
      { passive: true, capture: true },
    )
  })

  setTimeout(() => {
    safeSendMessage({
      action: "updateINP",
      value: null,
      entries: [],
      rating: "good",
      status: "waiting",
    })
  }, 1000)
}

/**
 * Gets the current INP data
 * @returns {Object} Current INP data
 */
export function getCurrentINPData() {
  return {
    value: window.maxINP > 0 ? Math.round(window.maxINP) : null,
    entries: window.inpEntries || [],
    rating: window.maxINP < 200 ? "good" : window.maxINP < 500 ? "needs-improvement" : "poor",
    status: window.maxINP > 0 ? "measured" : "waiting",
  }
}
