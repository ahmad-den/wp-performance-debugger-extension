// Import performance monitoring modules
import { initializeCLSMonitoring, getCurrentCLSData } from "./performance/cls-monitor.js"
import { initializeLCPMonitoring, getCurrentLCPData } from "./performance/lcp-monitor.js"
import { initializeINPMonitoring, getCurrentINPData } from "./performance/inp-monitor.js"
import { initializeAdditionalMetrics, getCurrentAdditionalMetrics } from "./performance/additional-metrics.js"

// Import analyzer modules
import { getPreloadedImages, highlightImageOnPage } from "./analyzers/image-analyzer.js"
import { getLoadedAndPreloadedFonts } from "./analyzers/font-analyzer.js"

// Import utilities
import { safeSendMessage } from "../utils/messaging.js"

// Declare chrome variable to avoid undeclared variable error
const chrome = window.chrome

/**
 * Checks if the extension should run on the current domain
 * @returns {boolean} True if the extension should run
 */
function shouldRunOnDomain() {
  const excludedDomains = ["portal.bigscoots.com", "wpo-admin.bigscoots.com", "wpo.bigscoots.com"]

  // Check exact domain matches
  if (excludedDomains.some((domain) => window.location.hostname === domain)) {
    return false
  }

  // Check if domain ends with bigscoots-wpo.com
  if (window.location.hostname.endsWith("bigscoots-wpo.com")) {
    return false
  }

  return true
}

/**
 * Gets headers from the current page
 * @returns {Promise<Object>} Headers object
 */
function getHeaders() {
  return fetch(window.location.href, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  }).then((response) => {
    const headers = {}
    ;[
      "x-bigscoots-cache-status",
      "cf-cache-status",
      "x-hosted-by",
      "x-bigscoots-cache-plan",
      "content-encoding",
      "x-bigscoots-cache-mode",
      "x-ezoic-cdn",
      "x-np-cfe",
    ].forEach((header) => {
      headers[header] = response.headers.get(header) || "N/A"
    })

    headers["x-bigscoots-cache-mode (O2O)"] = headers["x-bigscoots-cache-mode"] !== "N/A" ? "Enabled" : "Disabled"
    headers["x-np-cfe"] = headers["x-np-cfe"] !== "N/A" ? "Nerdpress active" : headers["x-np-cfe"]

    return headers
  })
}

/**
 * Analyzes the page source code for various optimizations
 * @returns {Object} Source code analysis results
 */
function analyzeSourceCode() {
  const html = document.documentElement.outerHTML
  const perfmattersRUCSS = html.includes("data-pmdelayedstyle") ? "enabled" : "disabled"
  const perfmattersDelayJS = html.includes("pmdelayedscript") ? "enabled" : "disabled"

  const patterns = {
    gtm: /GTM-\w+/g,
    ua: /UA-\d+-\d+/g,
    ga4: /G-[A-Z0-9]{9,}/g,
    ga: /GA-[A-Z0-9]+/g,
  }

  const matches = Object.fromEntries(
    Object.entries(patterns).map(([key, pattern]) => [key, [...new Set(html.match(pattern) || [])]]),
  )

  return {
    perfmattersRUCSS,
    perfmattersDelayJS,
    gtm: matches.gtm.join(", "),
    ua: matches.ua.join(", "),
    ga4: matches.ga4.join(", "),
    ga: matches.ga.join(", "),
    adProvider: detectAdProvider(),
  }
}

/**
 * Detects ad providers on the page
 * @returns {string} Detected ad provider or "None detected"
 */
function detectAdProvider() {
  const html = document.documentElement.outerHTML
  const scripts = Array.from(document.scripts).map((script) => script.src)

  const adProviders = {
    Mediavine: {
      domains: ["scripts.mediavine.com", "ads.mediavine.com"],
      patterns: ["window.mediavineDomain", "__mediavineMachine"],
      enabled: false,
    },
    "AdThrive/Raptive": {
      domains: ["ads.adthrive.com", "cdn.adthrive.com"],
      patterns: ["window.adthrive", "adthrive.config"],
      enabled: false,
    },
    Ezoic: {
      domains: ["www.ezojs.com", "ezoic.com", "ezoic.net"],
      patterns: ["ezstandalone", "ez_ad_units"],
      enabled: false,
    },
    "Google AdSense": {
      domains: ["pagead2.googlesyndication.com", "adsbygoogle"],
      patterns: ["adsbygoogle.push", "(adsbygoogle"],
      enabled: false,
    },
  }

  Object.keys(adProviders).forEach((provider) => {
    const hasDomain = adProviders[provider].domains.some((domain) => scripts.some((src) => src && src.includes(domain)))
    const hasPattern = adProviders[provider].patterns.some((pattern) => html.includes(pattern))
    if (hasDomain || hasPattern) {
      adProviders[provider].enabled = true
    }
  })

  const detectedProviders = Object.keys(adProviders).filter((provider) => adProviders[provider].enabled)
  return detectedProviders.join(", ") || "None detected"
}

/**
 * Detects WordPress plugins on the page
 * @returns {Object} Detected plugins object
 */
function detectWordPressPlugins() {
  const scripts = Array.from(document.scripts)
    .map((script) => script.src)
    .filter((src) => src)

  const allResources = scripts.join(" ")
  const pageContent = document.documentElement.outerHTML.toLowerCase()

  const cachingPlugins = {
    Perfmatters: {
      paths: ["/perfmatters/", "/plugins/perfmatters/"],
      indicators: ["perfmatters", "data-pmdelayedstyle", "pmdelayedscript"],
      detected: false,
      category: "optimization",
    },
    "WP Rocket": {
      paths: ["/wp-rocket/", "/plugins/wp-rocket/"],
      indicators: ["wp-rocket", "wpr_", "rocket-loader"],
      detected: false,
      category: "caching",
    },
    "W3 Total Cache": {
      paths: ["/w3-total-cache/", "/plugins/w3-total-cache/"],
      indicators: ["w3tc", "w3-total-cache"],
      detected: false,
      category: "caching",
    },
    "LiteSpeed Cache": {
      paths: ["/litespeed-cache/", "/plugins/litespeed-cache/"],
      indicators: ["litespeed", "lscache", "data-lazyloaded"],
      detected: false,
      category: "caching",
    },
    Autoptimize: {
      paths: ["/autoptimize/", "/plugins/autoptimize/"],
      indicators: ["autoptimize", "ao_"],
      detected: false,
      category: "optimization",
    },
  }

  Object.keys(cachingPlugins).forEach((pluginName) => {
    const plugin = cachingPlugins[pluginName]
    const pathDetected = plugin.paths.some((path) => allResources.includes(path))
    const indicatorDetected = plugin.indicators.some((indicator) => pageContent.includes(indicator))
    plugin.detected = pathDetected || indicatorDetected
  })

  return cachingPlugins
}

/**
 * Generates plugin conflict recommendations
 * @param {Object} detectedPlugins - Detected plugins object
 * @returns {Array} Array of recommendations
 */
function generatePluginConflictRecommendations(detectedPlugins) {
  const recommendations = []
  const activePlugins = Object.entries(detectedPlugins).filter(([name, plugin]) => plugin.detected)
  const perfmattersActive = detectedPlugins["Perfmatters"]?.detected

  if (perfmattersActive && activePlugins.length > 1) {
    const cachingPlugins = activePlugins.filter(([name, plugin]) => plugin.category === "caching")

    if (cachingPlugins.length > 0) {
      recommendations.push({
        type: "critical",
        title: "Cache Plugin Conflict with Perfmatters",
        description: `Perfmatters is active alongside ${cachingPlugins.length} caching plugin${cachingPlugins.length > 1 ? "s" : ""}. This can cause conflicts and reduce performance on BigScoots hosting.`,
        action: `Disable caching plugins: ${cachingPlugins.map(([name]) => name).join(", ")}. BigScoots server-level caching + Perfmatters optimization is the recommended setup.`,
        impact: "High",
      })
    }
  }

  const cachingPlugins = activePlugins.filter(([name, plugin]) => plugin.category === "caching")
  if (!perfmattersActive && cachingPlugins.length > 1) {
    recommendations.push({
      type: "warning",
      title: "Multiple Cache Plugins",
      description: `${cachingPlugins.length} caching plugins detected: ${cachingPlugins.map(([name]) => name).join(", ")}. Multiple caching plugins can conflict.`,
      action: `Consider replacing with Perfmatters, which is optimized for BigScoots hosting.`,
      impact: "Medium",
    })
  }

  return recommendations
}

/**
 * Runs the main analysis of the page
 */
function runAnalysis() {
  if (!shouldRunOnDomain()) return

  // Initialize performance monitoring
  initializeCLSMonitoring()
  initializeLCPMonitoring()
  initializeINPMonitoring()
  initializeAdditionalMetrics()

  // Run analysis
  Promise.all([getPreloadedImages(), getLoadedAndPreloadedFonts(), getHeaders(), analyzeSourceCode()])
    .then(([images, fonts, headers, sourceCodeInfo]) => {
      const detectedPlugins = detectWordPressPlugins()
      const pluginRecommendations = generatePluginConflictRecommendations(detectedPlugins)

      const analysisData = {
        images,
        fonts,
        headers: { ...headers, ...sourceCodeInfo },
        plugins: detectedPlugins,
        cls: getCurrentCLSData(),
        lcp: getCurrentLCPData(),
        inp: getCurrentINPData(),
        additionalMetrics: getCurrentAdditionalMetrics(),
        pluginRecommendations,
      }

      safeSendMessage({
        action: "analysisResults",
        ...analysisData,
      })

      safeSendMessage({
        action: "updateBadge",
        hostedBy: headers["x-hosted-by"] || "N/A",
        cacheStatus: headers["x-bigscoots-cache-status"] || headers["cf-cache-status"] || "N/A",
      })
    })
    .catch((error) => {
      // Error during analysis
    })
}

// Initialize the extension
runAnalysis()

// Set up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentPerformanceData") {
    sendResponse({
      cls: getCurrentCLSData(),
      lcp: getCurrentLCPData(),
      inp: getCurrentINPData(),
      additionalMetrics: getCurrentAdditionalMetrics(),
    })
  } else if (request.action === "highlightImage") {
    const success = highlightImageOnPage(request.imageUrl)
    sendResponse({ success })
  }
  return true
})
