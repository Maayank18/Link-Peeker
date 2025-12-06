// // content.js
// // Handles UI Injection and Mouse Events (runs in page context)

// let shadowHost = null;
// let shadowRoot = null;
// let cardContainer = null;
// let currentLink = null;

// // Create shadow DOM and UI skeleton
// function initShadowDOM() {
//   // Host element
//   shadowHost = document.createElement('div');
//   shadowHost.id = 'link-peeker-host';
//   Object.assign(shadowHost.style, {
//     position: 'fixed',
//     zIndex: '2147483647',
//     top: '0',
//     left: '0',
//     pointerEvents: 'none'
//   });

//   shadowRoot = shadowHost.attachShadow({ mode: 'open' });

//   const styleLink = document.createElement('link');
//   styleLink.rel = 'stylesheet';
//   styleLink.href = chrome.runtime.getURL('styles.css');
//   shadowRoot.appendChild(styleLink);

//   cardContainer = document.createElement('div');
//   cardContainer.className = 'lp-card lp-hidden';
//   // skeleton innerHTML
//   cardContainer.innerHTML = `
//     <div class="lp-band"></div>
//     <div class="lp-body">
//       <div class="lp-skeleton-icon"></div>
//       <div class="lp-skeleton-lines">
//         <div class="lp-line lp-line-title"></div>
//         <div class="lp-line lp-line-meta"></div>
//       </div>
//     </div>
//   `;

//   shadowRoot.appendChild(cardContainer);
//   document.body.appendChild(shadowHost);
// }

// // Render skeleton
// function renderSkeleton() {
//   cardContainer.innerHTML = `
//     <div class="lp-band"></div>
//     <div class="lp-body">
//       <div class="lp-skeleton-icon"></div>
//       <div class="lp-skeleton-lines">
//         <div class="lp-line lp-line-title"></div>
//         <div class="lp-line lp-line-meta"></div>
//       </div>
//     </div>`;
// }

// // Escape text to avoid HTML injection
// function escapeHtml(str = '') {
//   return String(str)
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;');
// }

// // Render the data returned from background
// function renderData(data) {
//   if (!data) return;
//   // Category -> color band
//   let color = "#e0e0e0";
//   if (data.category === "file") color = "#007AFF"; // Blue
//   if (data.category === "web") color = "#34C759"; // Green
//   if (data.category === "error") color = "#FF3B30"; // Red

//   // Nice fallback text
//   const titleText = data.title || data.fileType || data.domain || data.url || 'No title';
//   const bodyText = (data.category === 'file')
//     ? `Size: ${data.size || 'Unknown'}`
//     : (data.description || `No description available for ${data.domain || ''}`);

//   cardContainer.innerHTML = `
//     <div class="lp-band" style="background: ${color}"></div>
//     <div class="lp-content" style="padding: 16px; font-family: sans-serif; color: #333;">
//        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; line-height: 1.4;">
//          ${escapeHtml(titleText)}
//        </h3>
//        <p style="margin: 0; font-size: 12px; color: #666; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
//          ${escapeHtml(bodyText)}
//        </p>
//        <div style="margin-top: 8px; font-size: 10px; color: #999; font-weight: 700; text-transform: uppercase;">
//          ${escapeHtml(data.category === 'file' ? 'DOWNLOAD' : (data.domain || ''))}
//        </div>
//     </div>
//   `;
// }

// // Action to show the card after intent timer
// const showCardAction = () => {
//   if (!currentLink) return;

//   const rect = currentLink.getBoundingClientRect();
//   const cardWidth = 320;
//   const cardHeight = 150;

//   let top = rect.bottom + 10;
//   let left = rect.left;

//   if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
//   if (top + cardHeight > window.innerHeight) top = rect.top - cardHeight - 10;
//   if (top < 10) top = 10;

//   cardContainer.style.top = `${top}px`;
//   cardContainer.style.left = `${left}px`;
//   cardContainer.classList.remove('lp-hidden');

//   renderSkeleton();

//   // Request preview data from background
//   chrome.runtime.sendMessage({ type: "PEEK_REQUEST", url: currentLink.href }, (data) => {
//     if (!data) return;
//     // If url is set in response, ensure it's same link before rendering
//     if (data.url && currentLink && currentLink.href === data.url) {
//       renderData(data);
//     } else {
//       // Still render whatever we have (fallback)
//       renderData(data);
//     }
//   });
// };

// // Intent timer (simple)
// const intentTimer = Utils.createIntentTimer(showCardAction, 600);

// // Improved mouse handling:
// // - only start timer when hovering a link
// // - avoid cancelling when moving between children inside the same link
// document.addEventListener('mouseover', (e) => {
//   const link = e.target.closest('a');

//   if (!link || !link.href || link.href.startsWith('javascript')) {
//     // if moved off any link -> cancel/hide
//     // But only if we were previously on a link and moved outside it
//     if (currentLink) {
//       intentTimer.cancel();
//       hideCard();
//       currentLink = null;
//     }
//     return;
//   }

//   // If hovering a different link, set it as current and start timer
//   if (!currentLink || currentLink !== link) {
//     currentLink = link;
//     intentTimer.start();
//   }
// });

// document.addEventListener('mouseout', (e) => {
//   const link = e.target.closest('a');
//   if (!link) return;

//   // If the pointer moved to an element still inside the same link, don't cancel
//   const related = e.relatedTarget;
//   if (related && link.contains(related)) return;

//   // Otherwise cancel and hide
//   intentTimer.cancel();
//   hideCard();
//   currentLink = null;
// });

// function hideCard() {
//   if (cardContainer) cardContainer.classList.add('lp-hidden');
// }

// // Boot
// initShadowDOM();














// content.js
// COMPLETE FILE - COPY & PASTE EVERYTHING

let shadowHost = null;
let shadowRoot = null;
let cardContainer = null;
let currentLink = null;
let intentTimer = null; // Defined below

// --- 1. SETUP & UI CREATION ---

function initShadowDOM() {
  // Prevent duplicate creation
  if (document.getElementById('link-peeker-host')) return;

  // Host element
  shadowHost = document.createElement('div');
  shadowHost.id = 'link-peeker-host';
  Object.assign(shadowHost.style, {
    position: 'fixed',
    zIndex: '2147483647', // Max Z-Index
    top: '0',
    left: '0',
    pointerEvents: 'none'
  });

  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // Add Styles
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  // Card Container (Hidden by default)
  cardContainer = document.createElement('div');
  cardContainer.className = 'lp-card lp-hidden';
  shadowRoot.appendChild(cardContainer);

  document.body.appendChild(shadowHost);
}

// --- 2. RENDERING LOGIC ---

function renderSkeleton() {
  // Matches the CSS classes for the pulsing animation
  cardContainer.innerHTML = `
    <div class="lp-band" style="background: #e0e0e0"></div>
    <div class="lp-body">
      <div class="lp-skeleton-icon"></div>
      <div class="lp-skeleton-lines">
        <div class="lp-line lp-line-title"></div>
        <div class="lp-line lp-line-meta"></div>
      </div>
    </div>`;
}

function renderData(data) {
  if (!data) return;

  // 1. Color Coding
  let bandColor = "#34C759"; // Default Green (Web)
  if (data.category === "file") bandColor = "#007AFF"; // Blue
  if (data.category === "safety") bandColor = "#FF9500"; // Orange
  if (data.category === "dev") bandColor = "#AF52DE"; // Purple
  if (data.category === "error") bandColor = "#FF3B30"; // Red

  // 2. Body Content Logic (File vs Web)
  let bodyHTML = "";
  
  if (data.category === "file" || data.category === "safety") {
      // FILE LAYOUT: Focus on Size and Date
      bodyHTML = `
        <div style="font-weight: 500; font-size: 13px; color: #333; margin-bottom: 4px;">
           ${escapeHtml(data.description || 'Download')}
        </div>
        <div style="font-size: 12px; color: #666;">
           <span style="font-weight:700;">${escapeHtml(data.size || 'Unknown Size')}</span> 
           ${data.date ? `&bull; ${escapeHtml(data.date)}` : ''}
        </div>
      `;
  } else {
      // WEB LAYOUT: Focus on Description and Date Footer
      bodyHTML = `
        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #555; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(data.description)}
        </p>
        ${data.date ? `<div style="margin-top:8px; font-size: 11px; color: #888;">Updated: ${escapeHtml(data.date)}</div>` : ''}
      `;
  }

  // 3. Footer (Domain + Redirect Indicator)
  const redirectIcon = data.isRedirected ? '<span style="color:#666; font-size:12px; margin-right:4px;">↪</span>' : '';
  const domainText = data.domain || data.url;

  // 4. Inject HTML into Shadow DOM
  cardContainer.innerHTML = `
    <div class="lp-band" style="background: ${bandColor}"></div>
    <div class="lp-content">
       <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; line-height: 1.3; color: #222;">
         ${escapeHtml(data.title)}
       </h3>
       ${bodyHTML}
       <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
         ${redirectIcon}${escapeHtml(domainText)}
       </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- 3. INTERACTION LOGIC ---

const showCardAction = () => {
  if (!currentLink) return;

  // 1. Position the card (Smart Positioning)
  const rect = currentLink.getBoundingClientRect();
  const cardWidth = 300;
  const cardHeight = 160; // Approximate height

  let top = rect.bottom + 10;
  let left = rect.left;

  // Boundary checks (flip if near edges)
  if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
  if (top + cardHeight > window.innerHeight) top = rect.top - cardHeight - 10; // Flip up
  if (top < 10) top = 10;

  cardContainer.style.top = `${top}px`;
  cardContainer.style.left = `${left}px`;
  cardContainer.classList.remove('lp-hidden');

  // 2. Show Skeleton immediately
  renderSkeleton();

  // 3. Capture Fallback Text (Link Text)
  const linkText = currentLink.innerText.trim();

  // 4. Send Request to Background
  chrome.runtime.sendMessage({ 
    type: "PEEK_REQUEST", 
    url: currentLink.href,
    fallbackTitle: linkText 
  }, (data) => {
    // Safety check: ensure we are still hovering the same link
    if (!currentLink || (data.url && currentLink.href !== data.url)) return;
    renderData(data);
  });
};

function hideCard() {
  if (cardContainer) cardContainer.classList.add('lp-hidden');
}

// --- 4. EVENT LISTENERS ---

// Inline Timer Logic (Self-contained)
const createTimer = (callback, ms) => {
    let timer = null;
    return {
        start: () => { clearTimeout(timer); timer = setTimeout(callback, ms); },
        cancel: () => { clearTimeout(timer); }
    };
};

intentTimer = createTimer(showCardAction, 600);

document.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a');
  
  // If we moved off a link entirely
  if (!link) {
    if (currentLink) {
        intentTimer.cancel();
        hideCard();
        currentLink = null;
    }
    return;
  }

  // Ignore javascript: calls or anchors with no href
  if (!link.href || link.href.startsWith('javascript') || link.href.startsWith('#')) return;

  // If hovering a NEW link
  if (link !== currentLink) {
    if (currentLink) { hideCard(); } // Hide previous immediately
    currentLink = link;
    intentTimer.start();
  }
});

document.addEventListener('mouseout', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  // Logic: Did the mouse move to a child element inside the same link?
  // If yes, do NOT cancel.
  const related = e.relatedTarget;
  if (related && link.contains(related)) return;

  // Otherwise, we genuinely left the link.
  intentTimer.cancel();
  hideCard();
  currentLink = null;
});

// Boot
initShadowDOM();