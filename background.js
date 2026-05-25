// background.js - Professional Edition

// --- LRU Cache Implementation ---
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh position to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first item in Map)
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }
}

const previewCache = new LRUCache(100);

// --- Offscreen Document Management ---
let creating; // Promise to track creation
async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });
    if (contexts.length > 0) return;
  } catch (e) {
    // getContexts might not be supported in slightly older Chrome versions
  }
  
  if (creating) {
    await creating;
    return;
  }
  
  creating = chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ['DOM_PARSER'],
    justification: 'Parse HTML for link previews securely'
  }).catch((err) => {
    if (!err.message.startsWith('Only a single offscreen document may be created.')) {
      throw err;
    }
  });
  
  await creating;
  creating = null;
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PEEK_REQUEST") {
    performIntelligentFetch(request.url, request.fallbackTitle)
      .then(data => sendResponse(data))
      .catch(err => {
        console.error("Peek failed:", err);
        sendResponse({ 
          category: "error", 
          title: request.fallbackTitle || "Preview Unavailable", 
          description: "Connection failed or took too long.", 
          url: request.url 
        });
      });
    return true; // Keep channel open for async response
  }
});

// --- Intelligent Interceptor Fetch ---
async function performIntelligentFetch(originalUrl, fallbackTitle) {
  // 0. Cache Check
  const cached = previewCache.get(originalUrl);
  if (cached) return cached;

  // 1. The "X-Ray" Fetch
  const controller = new AbortController();
  // Abort if fetch takes longer than 5 seconds to prevent hanging
  const timeoutId = setTimeout(() => controller.abort(), 5000); 

  try {
    const response = await fetch(originalUrl, { 
      method: "GET", 
      signal: controller.signal,
      headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });
    clearTimeout(timeoutId);

    const finalUrl = response.url; 
    const isRedirected = (new URL(originalUrl).hostname !== new URL(finalUrl).hostname);

    const type = response.headers.get("content-type") || "";
    const sizeHeader = response.headers.get("content-length");
    const lastModifiedHeader = response.headers.get("last-modified");

    // --- PATH A: IT IS A FILE (PDF, ZIP, EXE) ---
    if (isFile(type, finalUrl)) {
      controller.abort(); // DATA SAVER: Abort body download!
      
      const fileData = {
        category: getFileCategory(type, finalUrl),
        title: getFilenameFromUrl(finalUrl),
        description: `Type: ${type.split(';')[0]}`,
        size: formatBytes(sizeHeader),
        date: formatDate(lastModifiedHeader),
        isRedirected,
        finalUrl,
        url: originalUrl
      };
      
      previewCache.set(originalUrl, fileData);
      return fileData;
    }

    // --- PATH B: IT IS A WEBSITE (HTML) ---
    const html = await response.text();
    
    // Ensure offscreen document is ready
    await setupOffscreenDocument();
    
    // Parse using Offscreen DOMParser
    const meta = await chrome.runtime.sendMessage({
      type: "PARSE_HTML",
      html: html,
      url: finalUrl
    });

    const displayDate = meta.date ? formatDate(meta.date) : formatDate(lastModifiedHeader);

    const webData = {
      category: determineWebCategory(finalUrl),
      title: meta.title || fallbackTitle || "No Title Found",
      description: meta.desc || "No description available",
      image: meta.image,
      themeColor: meta.themeColor,
      favicon: meta.favicon,
      platformData: meta.platformData, // Smart card info
      domain: new URL(finalUrl).hostname,
      date: displayDate,
      isRedirected,
      finalUrl,
      url: originalUrl
    };

    previewCache.set(originalUrl, webData);
    return webData;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
       console.log("Fetch safely aborted.");
    }
    throw error;
  }
}

// --- INTELLIGENCE HELPERS ---

function isFile(mime, url) {
  if (mime.includes("text/html")) return false;
  const extMatch = url.match(/\.(pdf|zip|docx|exe|dmg|pptx|xlsx|tar|gz|rar|iso|csv|mp4|mp3|wav)$/i);
  return (mime && (mime.includes("application") || mime.includes("image") || mime.includes("video"))) || !!extMatch;
}

function getFileCategory(mime, url) {
    if (url.match(/\.(exe|dmg|iso|msi|bat)$/i)) return "safety"; // Orange warning
    return "file"; // Blue document
}

function determineWebCategory(url) {
    if (url.includes("github.com") || url.includes("stackoverflow.com") || url.includes("npmjs.com")) return "dev"; // Purple
    return "web"; // Green
}

function getFilenameFromUrl(url) {
    try {
      return new URL(url).pathname.split('/').pop() || "Downloadable File";
    } catch {
      return url.split('/').pop().split('#')[0].split('?')[0] || "Downloadable File";
    }
}

function formatBytes(bytes) {
  if (!bytes) return null;
  const b = Number(bytes);
  if (b === 0) return "0 B";
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + ['B','KB','MB','GB','TB'][i];
}

function formatDate(dateString) {
    if (!dateString) return null;
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return null;
        
        const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return d.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return null; }
}