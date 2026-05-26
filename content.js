// content.js - Professional Edition

let shadowHost = null;
let shadowRoot = null;
let cardContainer = null;
let currentLink = null;
let intentTimer = null;

// --- 1. SETUP & UI CREATION ---
function initShadowDOM() {
  if (document.getElementById('link-peeker-host')) return;

  shadowHost = document.createElement('div');
  shadowHost.id = 'link-peeker-host';
  Object.assign(shadowHost.style, {
    position: 'fixed',
    zIndex: '2147483647',
    top: '0',
    left: '0',
    pointerEvents: 'none'
  });

  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  cardContainer = document.createElement('div');
  cardContainer.className = 'lp-card lp-hidden';
  shadowRoot.appendChild(cardContainer);

  document.body.appendChild(shadowHost);
}

// --- 2. RENDERING LOGIC ---
function renderSkeleton() {
  cardContainer.innerHTML = `
    <div class="lp-band" style="background: #e0e0e0"></div>
    <div class="lp-body-skeleton">
      <div class="lp-skeleton-icon"></div>
      <div class="lp-skeleton-lines">
        <div class="lp-line lp-line-title"></div>
        <div class="lp-line lp-line-meta"></div>
      </div>
    </div>`;
}

function renderData(data) {
  if (!data) return;

  // Color Coding (Use theme color if available, otherwise fallback)
  let bandColor = "#34C759"; // Web
  if (data.category === "file") bandColor = "#007AFF"; // Blue
  if (data.category === "safety") bandColor = "#FF9500"; // Orange
  if (data.category === "dev") bandColor = "#AF52DE"; // Purple
  if (data.category === "error") bandColor = "#FF3B30"; // Red
  if (data.themeColor && /^#[0-9A-F]{3,6}$/i.test(data.themeColor)) {
      bandColor = data.themeColor;
  }

  // Hero Image
  const imageHTML = data.image ? `<img src="${escapeHtml(data.image)}" class="lp-hero-image has-image" onerror="this.style.display='none'" />` : '';

  // Smart Platform Data
  let smartHTML = '';
  if (data.platformData) {
      if (data.platformData.platform === "github") {
          smartHTML = `<div class="lp-smart-data">
              ${data.platformData.stars ? `<div class="lp-smart-item">⭐ ${escapeHtml(data.platformData.stars)}</div>` : ''}
              ${data.platformData.forks ? `<div class="lp-smart-item">🍴 ${escapeHtml(data.platformData.forks)}</div>` : ''}
          </div>`;
      } else if (data.platformData.platform === "youtube") {
          smartHTML = `<div class="lp-smart-data">
              ${data.platformData.duration ? `<div class="lp-smart-item">⏱️ ${escapeHtml(data.platformData.duration)}</div>` : ''}
              ${data.platformData.channel ? `<div class="lp-smart-item">📺 ${escapeHtml(data.platformData.channel)}</div>` : ''}
          </div>`;
      }
  }

  // Body Content
  let bodyHTML = "";
  if (data.category === "file" || data.category === "safety") {
      bodyHTML = `
        <div style="font-weight: 500; font-size: 13px; margin-bottom: 4px;">
           ${escapeHtml(data.description || 'Download')}
        </div>
        <div class="lp-date">
           <span style="font-weight:700; color: #555;">${escapeHtml(data.size || 'Unknown Size')}</span> 
           ${data.date ? `&bull; ${escapeHtml(data.date)}` : ''}
        </div>
      `;
  } else {
      bodyHTML = `
        ${smartHTML}
        <p class="lp-desc">
          ${escapeHtml(data.description)}
        </p>
        ${data.date ? `<div class="lp-date">Updated: ${escapeHtml(data.date)}</div>` : ''}
      `;
  }

  // Cleanup old verdict classes
  cardContainer.classList.remove('verdict-green', 'verdict-yellow', 'verdict-red');
  if (data.safetyVerdict) {
      cardContainer.classList.add(`verdict-${data.safetyVerdict}`);
  }

  // Footer
  const redirectIcon = data.isRedirected ? '<span style="color:#666; font-size:12px; margin-right:4px;">↪</span>' : '';
  let originalDomain = "Unknown";
  try { originalDomain = new URL(data.url).hostname; } catch(e){}
  
  const domainText = originalDomain;
  const redirectWarn = data.isRedirected && data.domain ? `<span class="lp-redirect-warn">➔ ${escapeHtml(data.domain)}</span>` : '';
  const faviconHTML = data.favicon ? `<img src="${escapeHtml(data.favicon)}" class="lp-favicon" onerror="this.style.display='none'" />` : '';

  cardContainer.innerHTML = `
    <div class="lp-band" style="background: ${bandColor}"></div>
    <button class="lp-copy-btn" id="lp-copy-btn">Copy</button>
    ${imageHTML}
    <div class="lp-content">
       <h3 class="lp-title">
         ${escapeHtml(data.title)}
       </h3>
       ${bodyHTML}
       <div class="lp-footer">
         ${faviconHTML}${redirectIcon}<span class="lp-domain-text">${escapeHtml(domainText)}${redirectWarn}</span>
       </div>
    </div>
  `;

  // Attach Copy Event
  const copyBtn = shadowRoot.getElementById('lp-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent closing
      const textToCopy = `Title: ${data.title}\nURL: ${data.url}\nDescription: ${data.description || 'N/A'}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.innerText = "Copied!";
        setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
      });
    });
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- 3. INTERACTION & POSITIONING LOGIC ---
const showCardAction = () => {
  if (!currentLink) return;

  const rect = currentLink.getBoundingClientRect();
  const cardWidth = 320;
  // Estimate minimum height
  const minCardHeight = 160; 

  let top = rect.bottom + 10;
  let left = rect.left;

  // Boundary Checks
  if (left + cardWidth > window.innerWidth) {
    left = window.innerWidth - cardWidth - 20;
  }
  if (left < 10) left = 10;

  // If clipping bottom, flip to top
  if (top + minCardHeight > window.innerHeight) {
    top = rect.top - minCardHeight - 10; 
  }
  if (top < 10) top = 10;

  cardContainer.style.top = `${top}px`;
  cardContainer.style.left = `${left}px`;
  cardContainer.classList.remove('lp-hidden');

  renderSkeleton();

  const linkText = (currentLink.innerText || currentLink.textContent || "").trim();

  chrome.runtime.sendMessage({ 
    type: "PEEK_REQUEST", 
    url: currentLink.href,
    fallbackTitle: linkText 
  }, (data) => {
    if (chrome.runtime.lastError) {
        console.error("Link Peeker Error:", chrome.runtime.lastError);
        hideCard();
        return;
    }
    
    if (!data) {
        hideCard();
        return;
    }

    // Check if we are still hovering the exact same link
    if (!currentLink || currentLink.href !== data.url) return;
    
    renderData(data);
    
    // Adjust position in case image made card taller and it clips the bottom
    setTimeout(() => {
        if (!cardContainer) return;
        const newRect = cardContainer.getBoundingClientRect();
        if (newRect.bottom > window.innerHeight) {
            let adjustedTop = window.innerHeight - newRect.height - 10;
            if (adjustedTop < 10) adjustedTop = 10;
            cardContainer.style.top = `${adjustedTop}px`;
        }
    }, 50);
  });
};

function hideCard() {
  if (currentLink && currentLink.href) {
    chrome.runtime.sendMessage({ type: "ABORT_PEEK", url: currentLink.href });
  }
  if (cardContainer) cardContainer.classList.add('lp-hidden');
}

// --- 4. EVENT LISTENERS ---
intentTimer = window.Utils.createIntentTimer(showCardAction, 600);

document.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a');
  
  if (!link) {
    if (currentLink) {
        intentTimer.cancel();
        hideCard();
        currentLink = null;
    }
    return;
  }

  // Ignore javascript links or anchor links on the same page
  if (!link.href || link.href.startsWith('javascript') || link.getAttribute('href').startsWith('#')) return;

  if (link !== currentLink) {
    if (currentLink) { hideCard(); }
    currentLink = link;
    intentTimer.start();
  }
});

document.addEventListener('mouseout', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  const related = e.relatedTarget;
  if (related && link.contains(related)) return;

  intentTimer.cancel();
  hideCard();
  currentLink = null;
});

// Boot
initShadowDOM();