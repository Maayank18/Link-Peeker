// const previewCache = new Map();

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.type === "PEEK_REQUEST") {
//     handlePeek(request.url).then(sendResponse).catch(err => {
//       console.error('handlePeek error', err);
//       sendResponse({ category: "error", title: "Preview Unavailable", url: request.url });
//     });
//     return true; // Keep channel open for async response
//   }
// });

// async function handlePeek(url) {
//   // Cache check
//   if (previewCache.has(url)) return previewCache.get(url);

//   try {
//     // 1. Try HEAD first to check for files (lightweight)
//     let type = "";
//     let size = null;

//     try {
//       const headResp = await fetch(url, { method: "HEAD" });
//       type = headResp.headers.get("content-type") || "";
//       size = headResp.headers.get("content-length");
//     } catch (headErr) {
//       console.warn("HEAD failed, fallback to GET", headErr);
//     }

//     // Check if it is a file based on HEAD response
//     if (isFile(type, url)) {
//       const data = {
//         category: "file",
//         fileType: getFileType(url),
//         size: formatBytes(size ? Number(size) : null),
//         url: url
//       };
//       previewCache.set(url, data);
//       return data;
//     }

//     // 2. Fetch full HTML
//     // We fetch the data. If the URL was a redirect (like a Bing/Google link),
//     // 'resp.url' will give us the FINAL destination URL.
//     const resp = await fetch(url);
//     const finalUrl = resp.url; // Capture the final URL after redirects
//     const html = await resp.text();
    
//     // Parse using Regex because DOMParser doesn't exist in Service Workers
//     const meta = parseMetaRegex(html, finalUrl);

//     const data = {
//       category: "web",
//       title: meta.title || "No Title Found",
//       description: meta.desc || "No description available",
//       image: meta.image || "",
//       domain: new URL(finalUrl).hostname, // Use finalUrl for correct domain display
//       url: finalUrl 
//     };

//     previewCache.set(url, data); // Cache the original requested URL
//     return data;

//   } catch (err) {
//     console.error("fetch/parse error for", url, err);
//     return { category: "error", title: "Preview Unavailable", url };
//   }
// }

// // --- Helper functions ---

// function isFile(mime, url) {
//   const extMatch = url.match(/\.(pdf|zip|docx|exe|dmg|pptx|xlsx|tar|gz|rar)$/i);
//   return (mime && (mime.includes("pdf") || mime.includes("zip") || mime.includes("octet-stream"))) || !!extMatch;
// }

// function getFileType(url) {
//   if (url.match(/\.pdf$/i)) return "PDF Document";
//   if (url.match(/\.zip$/i)) return "ZIP Archive";
//   if (url.match(/\.docx?$/i)) return "Word Document";
//   if (url.match(/\.pptx?$/i)) return "PowerPoint";
//   return "Downloadable File";
// }

// function formatBytes(bytes) {
//   if (!bytes && bytes !== 0) return "Unknown Size";
//   const b = Number(bytes);
//   if (isNaN(b)) return "Unknown Size";
//   if (b === 0) return "0 B";
//   const i = Math.floor(Math.log(b) / Math.log(1024));
//   const sizes = ['B','KB','MB','GB','TB'];
//   return (b / Math.pow(1024, i)).toFixed(2) + ' ' + (sizes[i] || 'B');
// }

// /**
//  * parseMetaRegex: Parses HTML strings using Regex (Service Worker Safe)
//  */
// function parseMetaRegex(html, url) {
//   // Helper to extract content from meta tags
//   const getMeta = (propName) => {
//     // Matches <meta property="og:title" content="..."> or <meta name="..." content="...">
//     // Handles single or double quotes
//     const regex = new RegExp(
//       `<meta[^>]+(?:name|property)=["']${propName}["'][^>]+content=["']([^"']+)["']`,
//       "i"
//     );
//     const match = html.match(regex);
//     return match ? decodeHtmlEntities(match[1]) : null;
//   };

//   // 1. Get Title
//   let title = getMeta("og:title") || getMeta("twitter:title");
//   if (!title) {
//     const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
//     title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "";
//   }

//   // 2. Get Description
//   const desc = 
//     getMeta("og:description") || 
//     getMeta("twitter:description") || 
//     getMeta("description");

//   // 3. Get Image
//   const image = getMeta("og:image") || getMeta("twitter:image");

//   return {
//     title: title ? title.trim() : null,
//     desc: desc ? desc.trim() : null,
//     image: image || null,
//     url
//   };
// }

// // Helper to decode basic HTML entities often found in meta tags
// function decodeHtmlEntities(text) {
//   if (!text) return "";
//   return text
//     .replace(/&amp;/g, "&")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">")
//     .replace(/&quot;/g, '"')
//     .replace(/&#39;/g, "'");
// }













// background.js

const previewCache = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PEEK_REQUEST") {
    // Execute the Intelligent Interception
    performIntelligentFetch(request.url, request.fallbackTitle)
      .then(data => sendResponse(data))
      .catch(err => {
        console.error("Peek failed:", err);
        sendResponse({ 
          category: "error", 
          title: request.fallbackTitle || "Preview Unavailable", 
          description: "Connection failed.", 
          url: request.url 
        });
      });
    return true; // Keep channel open for async response
  }
});

async function performIntelligentFetch(originalUrl, fallbackTitle) {
  // 0. Cache Check
  if (previewCache.has(originalUrl)) return previewCache.get(originalUrl);

  // 1. The "X-Ray" Fetch
  // We use an AbortController to kill the download if it's a huge file (Data Saver)
  const controller = new AbortController();
  const signal = controller.signal;

  try {
    const response = await fetch(originalUrl, { 
      method: "GET", 
      signal: signal,
      // We accept everything, but prefer HTML
      headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });

    // 2. The Redirect Follower check
    // If original URL (Bing) != Final URL (Wikipedia), we mark it.
    const finalUrl = response.url; 
    const isRedirected = (new URL(originalUrl).hostname !== new URL(finalUrl).hostname);

    // 3. The Decision Tree
    const type = response.headers.get("content-type") || "";
    const sizeHeader = response.headers.get("content-length");
    const lastModifiedHeader = response.headers.get("last-modified");

    // --- PATH A: IT IS A FILE (PDF, ZIP, EXE) ---
    if (isFile(type, finalUrl)) {
      // DATA SAVER MOVE: Abort the download immediately! Do not consume the body.
      controller.abort(); 

      const fileData = {
        category: getFileCategory(type, finalUrl), // Blue (doc) or Orange (safety)
        title: getFilenameFromUrl(finalUrl),
        description: `Type: ${type.split(';')[0]}`,
        size: formatBytes(sizeHeader), // 145 MB
        date: formatDate(lastModifiedHeader), // "Dec 5, 2024"
        isRedirected,
        finalUrl,
        url: originalUrl // Keep original for key
      };
      
      previewCache.set(originalUrl, fileData);
      return fileData;
    }

    // --- PATH B: IT IS A WEBSITE (HTML) ---
    // Download the text (only if it's not a huge file)
    const html = await response.text();
    
    // 4. The Super Parser (Regex based for Service Worker)
    const meta = parseHtmlSmart(html);

    // The Date Detective Logic
    // If HTML metadata has a date, use it. Otherwise use HTTP Last-Modified.
    const displayDate = meta.date ? formatDate(meta.date) : formatDate(lastModifiedHeader);

    const webData = {
      category: determineWebCategory(finalUrl), // Green (Web) or Purple (Dev)
      title: meta.title || fallbackTitle || "No Title Found",
      description: meta.desc || "No description available",
      image: meta.image,
      domain: new URL(finalUrl).hostname,
      date: displayDate, // "Updated: 2 days ago"
      isRedirected,
      finalUrl,
      url: originalUrl
    };

    previewCache.set(originalUrl, webData);
    return webData;

  } catch (error) {
    if (error.name === 'AbortError') {
       // Only happens if we manually aborted (should be handled in Path A)
       console.log("Fetch aborted for data saving.");
    }
    throw error;
  }
}

// --- INTELLIGENCE HELPERS ---

// Detects "Path A" (Files) vs "Path B" (Web)
function isFile(mime, url) {
  if (mime.includes("text/html")) return false;
  const extMatch = url.match(/\.(pdf|zip|docx|exe|dmg|pptx|xlsx|tar|gz|rar|iso|csv)$/i);
  return (mime && (mime.includes("application") || mime.includes("image"))) || !!extMatch;
}

function getFileCategory(mime, url) {
    // Orange for Executables (Safety Warning)
    if (url.match(/\.(exe|dmg|iso|msi|bat)$/i)) return "safety";
    // Blue for Documents
    return "file";
}

function determineWebCategory(url) {
    // Purple for Dev Tools
    if (url.includes("github.com") || url.includes("stackoverflow.com") || url.includes("npmjs.com")) return "dev";
    // Green for everything else
    return "web";
}

function getFilenameFromUrl(url) {
    return url.split('/').pop().split('#')[0].split('?')[0] || "Downloadable File";
}

// The Date Detective & Summary Synthesizer
function parseHtmlSmart(html) {
    const getMeta = (prop) => {
        const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
        const match = html.match(regex);
        return match ? decodeHtmlEntities(match[1]) : null;
    };

    // 1. Title
    let title = getMeta("og:title") || getMeta("twitter:title");
    if (!title) {
        const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = tMatch ? decodeHtmlEntities(tMatch[1]) : null;
    }

    // 2. Summary Synthesizer (Priority: OG Desc -> Long Paragraph)
    let desc = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
    if (!desc) {
        // Fallback: Find first <p> tag > 80 chars
        const pMatch = html.match(/<p[^>]*>([^<]{80,}?)<\/p>/i);
        if (pMatch) {
            desc = decodeHtmlEntities(pMatch[1]).replace(/<[^>]+>/g, '').substring(0, 150) + "...";
        }
    }

    // 3. Date Detective
    // Looks for published_time, last-modified, or date
    const date = getMeta("article:published_time") || getMeta("date") || getMeta("last-modified");

    // 4. Image
    const image = getMeta("og:image") || getMeta("twitter:image");

    return { title, desc, date, image };
}

// Utilities
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
        // If invalid date
        if (isNaN(d.getTime())) return null;
        
        // Return relative time if recent, or date string
        const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return d.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return null; }
}

function decodeHtmlEntities(text) {
  return text ? text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : "";
}