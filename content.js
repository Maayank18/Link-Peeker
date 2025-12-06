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














// ... [Keep your existing initShadowDOM, intentTimer, and Listeners] ...

// UPDATE THIS FUNCTION ONLY
function renderData(data) {
  if (!data) return;

  // 1. Color Coding Logic
  let bandColor = "#34C759"; // Default Green (Web)
  if (data.category === "file") bandColor = "#007AFF"; // Blue
  if (data.category === "safety") bandColor = "#FF9500"; // Orange
  if (data.category === "dev") bandColor = "#AF52DE"; // Purple
  if (data.category === "error") bandColor = "#FF3B30"; // Red

  // 2. Prepare Display Data
  const titleText = data.title;
  
  // Logic: If it's a file, Body is "Size • Date"
  // If it's a web, Body is "Description" + "Date footer"
  let bodyHTML = "";
  
  if (data.category === "file" || data.category === "safety") {
      bodyHTML = `
        <div style="font-weight: 500; font-size: 13px; color: #333;">
           ${data.description || 'Download'}
        </div>
        <div style="margin-top:4px; font-size: 12px; color: #666;">
           <span style="font-weight:700;">${data.size || 'Unknown Size'}</span> 
           ${data.date ? `&bull; ${data.date}` : ''}
        </div>
      `;
  } else {
      // Web
      bodyHTML = `
        <p style="margin: 0; font-size: 12px; color: #555; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(data.description)}
        </p>
        ${data.date ? `<div style="margin-top:6px; font-size: 11px; color: #888;">Updated: ${data.date}</div>` : ''}
      `;
  }

  // 3. Domain + Redirect Logic
  // If redirected, show "↪ destination.com"
  const redirectIcon = data.isRedirected ? '<span style="color:#666; font-size:12px;">↪</span> ' : '';
  const domainText = data.domain || data.url;

  cardContainer.innerHTML = `
    <div class="lp-band" style="background: ${bandColor}"></div>
    <div class="lp-content" style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
       
       <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; line-height: 1.3; color: #222;">
         ${escapeHtml(titleText)}
       </h3>

       ${bodyHTML}

       <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
         ${redirectIcon} ${escapeHtml(domainText)}
       </div>
    </div>
  `;
}

// [Keep the rest of your showCardAction and mouse listeners]
// Make sure showCardAction still sends { type: "PEEK_REQUEST", url: ..., fallbackTitle: ... }