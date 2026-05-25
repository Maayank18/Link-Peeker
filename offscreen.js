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
      // Attempt to find stars/forks if it's a repo page (these might be brittle, but OG tags often have them too)
      const starsMatch = doc.title.match(/Star ([\d,km]+)/i) || (desc && desc.match(/([\d,km]+) stars/i));
      const forksMatch = doc.title.match(/Fork ([\d,km]+)/i) || (desc && desc.match(/([\d,km]+) forks/i));
      platformData = {
          platform: "github",
          stars: starsMatch ? starsMatch[1] : null,
          forks: forksMatch ? forksMatch[1] : null
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
