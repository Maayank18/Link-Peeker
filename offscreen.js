chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PARSE_HTML") {
    const data = parseSmartHTML(request.html, request.url);
    sendResponse(data);
    return false; // Synchronous response
  }
});

function parseSmartHTML(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const getMeta = (prop) => {
    let el = doc.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
    return el ? el.getAttribute("content") : null;
  };

  // 1. Title
  let title = getMeta("og:title") || getMeta("twitter:title") || doc.title || "";
  
  // 2. Description
  let desc = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
  if (!desc) {
    const firstP = doc.querySelector("p");
    if (firstP && firstP.textContent.trim().length > 80) {
      desc = firstP.textContent.trim().substring(0, 150) + "...";
    }
  }

  // 3. Image
  const image = getMeta("og:image") || getMeta("twitter:image");

  // 4. Date
  const date = getMeta("article:published_time") || getMeta("date") || getMeta("last-modified");

  // 5. Theme Color
  const themeColor = getMeta("theme-color");

  // 6. Favicon
  let favicon = "";
  try {
    const iconLink = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    if (iconLink) {
      favicon = new URL(iconLink.getAttribute("href"), url).href;
    } else {
      favicon = new URL("/favicon.ico", url).href;
    }
  } catch (e) {
    console.error("Favicon URL parsing error", e);
  }
  
  // 7. Platform Specific Enhancements
  let platformData = null;
  
  if (url.includes("github.com")) {
      const starsMatch = doc.title.match(/Star ([\d,km]+)/i) || (desc && desc.match(/([\d,km]+) stars/i));
      const forksMatch = doc.title.match(/Fork ([\d,km]+)/i) || (desc && desc.match(/([\d,km]+) forks/i));
      platformData = {
          platform: "github",
          stars: starsMatch ? starsMatch[1] : null,
          forks: forksMatch ? forksMatch[1] : null
      };
  } else if (url.includes("wikipedia.org")) {
      // Find true lead paragraph
      const paragraphs = Array.from(doc.querySelectorAll("p"));
      const leadP = paragraphs.find(p => p.textContent.trim().length > 50 && !p.closest('table'));
      if (leadP) {
          desc = leadP.textContent.trim().replace(/\[\d+\]/g, ""); // Remove reference tags
      }
  } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // YouTube duration / channel
      const duration = getMeta("duration") || getMeta("og:video:duration");
      let channel = doc.querySelector('link[itemprop="name"]');
      channel = channel ? channel.getAttribute("content") : null;
      
      platformData = {
          platform: "youtube",
          duration: duration ? formatYTDuration(duration) : null,
          channel: channel
      };
  }

  return { 
    title: title.trim(), 
    desc: desc ? desc.trim() : null, 
    date, 
    image, 
    themeColor, 
    favicon, 
    platformData 
  };
}

function formatYTDuration(iso) {
    if (!iso) return null;
    if (!iso.startsWith("PT")) return iso; // Fallback
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return iso;
    const h = match[1] || 0;
    const m = match[2] || 0;
    const s = match[3] || 0;
    
    let res = "";
    if (h > 0) res += h + ":";
    res += (h > 0 ? String(m).padStart(2, '0') : m) + ":";
    res += String(s).padStart(2, '0');
    return res;
}
