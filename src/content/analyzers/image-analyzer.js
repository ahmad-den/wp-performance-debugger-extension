import {
    getImageDimensions,
    isImageAboveFold,
    isCriticalPathImage,
    getImageFormat,
    analyzeImageOptimization,
  } from "../../utils/dom-helpers.js"
  
  /**
   * Gets all preloaded images on the page
   * @returns {Promise<Array>} Array of preloaded image data
   */
  export function getPreloadedImages() {
    const uniqueImages = new Map()
  
    document.querySelectorAll('link[rel="preload"][as="image"]').forEach((el) => {
      uniqueImages.set(el.href, {
        url: el.href,
        fetchpriority: el.getAttribute("fetchpriority") || null,
        type: "preload",
      })
    })
  
    document.querySelectorAll("img[data-perfmatters-preload]").forEach((el) => {
      if (!uniqueImages.has(el.src)) {
        uniqueImages.set(el.src, {
          url: el.src,
          fetchpriority: el.getAttribute("fetchpriority") || null,
          type: "perfmatters",
        })
      }
    })
  
    document.querySelectorAll('img[loading="eager"]').forEach((el) => {
      if (!uniqueImages.has(el.src)) {
        uniqueImages.set(el.src, {
          url: el.src,
          fetchpriority: el.getAttribute("fetchpriority") || null,
          type: "eager",
        })
      }
    })
  
    return Promise.resolve(
      Array.from(uniqueImages.values()).map((resource) => {
        const imgElement = document.querySelector(`img[src="${resource.url}"]`)
  
        if (imgElement) {
          const dimensions = getImageDimensions(imgElement)
          const aboveFold = isImageAboveFold(imgElement)
          const isCritical = isCriticalPathImage(imgElement, dimensions)
          const format = getImageFormat(resource.url)
          const issues = analyzeImageOptimization(imgElement, dimensions)
  
          return {
            ...resource,
            dimensions,
            aboveFold,
            isCritical,
            format,
            issues,
            loading: imgElement.getAttribute("loading") || "auto",
            decoding: imgElement.getAttribute("decoding") || "auto",
            fetchpriority: imgElement.getAttribute("fetchpriority") || null,
          }
        }
  
        return {
          ...resource,
          aboveFold: false,
          isCritical: false,
          format: getImageFormat(resource.url),
          issues: [{ type: "missing", severity: "low", message: "Image not found in DOM" }],
        }
      }),
    )
  }
  
  /**
   * Highlights an image on the page
   * @param {string} imageUrl - The URL of the image to highlight
   * @returns {boolean} True if image was found and highlighted
   */
  export function highlightImageOnPage(imageUrl) {
    removeImageHighlights()
  
    const images = document.querySelectorAll("img")
    let targetImage = null
  
    for (const img of images) {
      if (img.src === imageUrl || img.currentSrc === imageUrl) {
        targetImage = img
        break
      }
    }
  
    if (!targetImage) {
      const allElements = document.querySelectorAll("*")
      for (const element of allElements) {
        const computedStyle = window.getComputedStyle(element)
        const backgroundImage = computedStyle.backgroundImage
        if (backgroundImage && backgroundImage.includes(imageUrl)) {
          targetImage = element
          break
        }
      }
    }
  
    if (targetImage) {
      const highlight = document.createElement("div")
      highlight.id = "bigscoots-image-highlight"
      highlight.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 999999;
        border: 3px solid #ff4444;
        background: rgba(255, 68, 68, 0.1);
        box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.3), 0 0 20px rgba(255, 68, 68, 0.5);
        animation: bigscoots-pulse 2s infinite;
        border-radius: 4px;
      `
  
      if (!document.getElementById("bigscoots-highlight-styles")) {
        const style = document.createElement("style")
        style.id = "bigscoots-highlight-styles"
        style.textContent = `
          @keyframes bigscoots-pulse {
            0% { box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.3), 0 0 20px rgba(255, 68, 68, 0.5); }
            50% { box-shadow: 0 0 0 6px rgba(255, 68, 68, 0.5), 0 0 30px rgba(255, 68, 68, 0.8); }
            100% { box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.3), 0 0 20px rgba(255, 68, 68, 0.5); }
          }
        `
        document.head.appendChild(style)
      }
  
      const rect = targetImage.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
  
      highlight.style.top = rect.top + scrollTop - 3 + "px"
      highlight.style.left = rect.left + scrollLeft - 3 + "px"
      highlight.style.width = rect.width + 6 + "px"
      highlight.style.height = rect.height + 6 + "px"
  
      document.body.appendChild(highlight)
  
      targetImage.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      })
  
      setTimeout(() => {
        removeImageHighlights()
      }, 5000)
  
      return true
    }
  
    return false
  }
  
  /**
   * Removes image highlights from the page
   */
  function removeImageHighlights() {
    const existingHighlight = document.getElementById("bigscoots-image-highlight")
    if (existingHighlight) {
      existingHighlight.remove()
    }
  }
  