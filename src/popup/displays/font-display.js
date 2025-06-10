/**
 * Module for handling font display in the popup
 */

/**
 * Updates the font display with analysis results
 * @param {Array} fonts - Array of font data
 */
export function updateFontDisplay(fonts) {
    const fontInfo = document.getElementById("fontInfo")
    const fontCountEl = document.getElementById("fontCount")
    const fontList = document.getElementById("fontList")
  
    // Add margin if no button is present
    if (fontInfo) fontInfo.style.marginTop = "0px"
  
    const totalFonts = fonts.length
    fontCountEl.textContent = `Found ${totalFonts} font${totalFonts !== 1 ? "s" : ""} loaded`
    fontList.innerHTML = ""
  
    if (totalFonts === 0) {
      fontInfo.style.display = "block"
      const p = document.createElement("p")
      p.textContent = "No fonts detected loading on this page."
      p.className = "empty-state-message"
      fontList.appendChild(p)
      return
    }
  
    fonts.forEach((font, index) => {
      const li = createFontListItem(font, index)
      fontList.appendChild(li)
    })
  
    fontInfo.style.display = "block"
  }
  
  /**
   * Creates a list item for a font
   * @param {Object} font - Font data object
   * @param {number} index - Font index
   * @returns {HTMLElement} The created list item
   */
  function createFontListItem(font, index) {
    const li = document.createElement("li")
    li.className = "card-style font-list-item"
  
    const numberBadge = document.createElement("div")
    numberBadge.className = "font-list-item-badge"
    numberBadge.textContent = index + 1
  
    const contentContainer = createFontContentContainer(font)
  
    li.appendChild(numberBadge)
    li.appendChild(contentContainer)
  
    return li
  }
  
  /**
   * Creates the content container for a font
   * @param {Object} font - Font data object
   * @returns {HTMLElement} The content container
   */
  function createFontContentContainer(font) {
    const contentContainer = document.createElement("div")
    contentContainer.className = "font-list-item-content"
  
    const urlContainer = createFontUrlContainer(font)
    contentContainer.appendChild(urlContainer)
  
    const details = getFontDetails(font)
    if (details.length > 0) {
      const detailsContainer = createFontDetailsContainer(details)
      contentContainer.appendChild(detailsContainer)
    }
  
    const statusContainer = createFontStatusContainer(font)
    contentContainer.appendChild(statusContainer)
  
    return contentContainer
  }
  
  /**
   * Creates the URL container with copy button
   * @param {Object} font - Font data object
   * @returns {HTMLElement} The URL container
   */
  function createFontUrlContainer(font) {
    const urlContainer = document.createElement("div")
    urlContainer.className = "url-container"
  
    const urlSpan = document.createElement("span")
    urlSpan.className = "font-url"
    urlSpan.textContent = font.url
    urlSpan.title = font.url
  
    const copyButton = createCopyButton(font.url)
  
    urlContainer.appendChild(urlSpan)
    urlContainer.appendChild(copyButton)
  
    return urlContainer
  }
  
  /**
   * Creates a copy button for a URL
   * @param {string} url - The URL to copy
   * @returns {HTMLElement} The copy button
   */
  function createCopyButton(url) {
    const copyButton = document.createElement("button")
    copyButton.className = "copy-button icon-button-sm"
    copyButton.title = "Copy URL"
  
    const originalCopyIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
    const copiedIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
  
    copyButton.innerHTML = originalCopyIcon
  
    copyButton.onclick = (e) => {
      e.stopPropagation()
      navigator.clipboard.writeText(url).then(() => {
        copyButton.innerHTML = copiedIcon
        copyButton.classList.add("copied-feedback")
        setTimeout(() => {
          copyButton.innerHTML = originalCopyIcon
          copyButton.classList.remove("copied-feedback")
        }, 1200)
      })
    }
  
    return copyButton
  }
  
  /**
   * Gets font details array
   * @param {Object} font - Font data object
   * @returns {Array} Array of detail strings
   */
  function getFontDetails(font) {
    const details = []
    if (font.type) details.push(`Type: ${font.type}`)
    if (font.fileSizeFormatted) details.push(`Size: ${font.fileSizeFormatted}`)
    if (font.loadTime > 0) details.push(`Load: ${font.loadTime}ms`)
    if (font.crossorigin) details.push(`CORS: ${font.crossorigin}`)
    return details
  }
  
  /**
   * Creates the details container for a font
   * @param {Array} details - Array of detail strings
   * @returns {HTMLElement} The details container
   */
  function createFontDetailsContainer(details) {
    const detailsContainer = document.createElement("div")
    detailsContainer.className = "font-details"
  
    const detailsSpan = document.createElement("span")
    detailsSpan.className = "font-details-text"
    detailsSpan.textContent = details.join(" | ")
    detailsContainer.appendChild(detailsSpan)
  
    return detailsContainer
  }
  
  /**
   * Creates the status container with status indicators
   * @param {Object} font - Font data object
   * @returns {HTMLElement} The status container
   */
  function createFontStatusContainer(font) {
    const statusContainer = document.createElement("div")
    statusContainer.className = "status-container"
  
    // Font type sticker
    if (font.type) {
      const typeSticker = document.createElement("span")
      typeSticker.textContent = font.type
      typeSticker.className = `status-sticker font-type font-type-${font.type.toLowerCase()}`
      statusContainer.appendChild(typeSticker)
    }
  
    // Preload status sticker
    const preloadedSticker = document.createElement("span")
    preloadedSticker.textContent = font.preloaded ? "PRELOADED" : "NOT PRELOADED"
    preloadedSticker.className = font.preloaded ? "status-sticker preloaded" : "status-sticker not-preloaded"
    statusContainer.appendChild(preloadedSticker)
  
    // Priority sticker
    if (font.fetchpriority) {
      const prioritySticker = document.createElement("span")
      prioritySticker.textContent = `PRIORITY: ${font.fetchpriority.toUpperCase()}`
      prioritySticker.className = `status-sticker priority priority-${font.fetchpriority.toLowerCase()}`
      statusContainer.appendChild(prioritySticker)
    } else {
      // Show "NO PRIORITY SET" when no fetchpriority is specified
      const prioritySticker = document.createElement("span")
      prioritySticker.textContent = "NO PRIORITY SET"
      prioritySticker.className = "status-sticker priority priority-none"
      statusContainer.appendChild(prioritySticker)
    }
  
    return statusContainer
  }
  