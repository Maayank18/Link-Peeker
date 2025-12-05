// CONTENT: Handles UI Injection and Mouse Events

let shadowHost = null; // The outer shell
let shadowRoot = null; // The isolated world
let cardContainer = null; // The actual card
let currentLink = null;

// --- 1. INITIALIZATION: Build the Shadow DOM ---
function initShadowDOM() {
  // Create the host element
  shadowHost = document.createElement('div');
  shadowHost.id = 'link-peeker-host';
  // Position it absolutely, but hidden initially
  Object.assign(shadowHost.style, {
    position: 'fixed',
    zIndex: '2147483647', // Max Z-Index
    top: '0',
    left: '0',
    pointerEvents: 'none' // Let clicks pass through the host wrapper
  });

  // Attach Shadow DOM (Open mode allows us to inspect it)
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // Inject CSS inside the Shadow Root
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  // Create the Card UI structure
  cardContainer = document.createElement('div');
  cardContainer.className = 'lp-card lp-hidden'; 
  // Add the "Skeleton" structure (Loading State)
  cardContainer.innerHTML = `
    <div class="lp-band"></div>
    <div class="lp-body">
      <div class="lp-skeleton-icon"></div>
      <div class="lp-skeleton-lines">
        <div class="lp-line lp-line-title"></div>
        <div class="lp-line lp-line-meta"></div>
      </div>
    </div>
  `;

  shadowRoot.appendChild(cardContainer);
  document.body.appendChild(shadowHost);
}

// --- 2. INTERACTION LOGIC ---

// Define the "Action" that happens after the delay
const showCardAction = () => {
  if (!currentLink) return;
  
  // Basic Positioning Logic (Phase 1: Simple right-bottom offset)
  // We will make this "Corner Detection" smart in Phase 5
  const rect = currentLink.getBoundingClientRect();
  const cardWidth = 320; 
  const cardHeight = 120;
  
  let top = rect.bottom + 10;
  let left = rect.left;

  // Boundary Check (Simple)
  if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
  if (top + cardHeight > window.innerHeight) top = rect.top - cardHeight - 10;

  // Apply to the CARD inside the shadow DOM
  cardContainer.style.top = `${top}px`;
  cardContainer.style.left = `${left}px`;
  
  // Remove hidden class to trigger Fade In
  cardContainer.classList.remove('lp-hidden');
  
  // Detect Category for the Color Band (Visual Feedback)
  const category = Utils.detectCategory(currentLink.href);
  cardContainer.setAttribute('data-category', category);
  
  console.log(`Peeking: ${currentLink.href} [Category: ${category}]`);
};

// Create the timer using our Utils
const intentTimer = Utils.createIntentTimer(showCardAction, 600); // 600ms delay

// --- 3. EVENT LISTENERS ---

// We listen to the whole document (Delegation) for better performance
document.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a');
  
  // Filter out invalid links
  if (!link || !link.href || link.href.startsWith('javascript')) {
    // If we moved from a link to empty space, cancel everything
    if (currentLink) {
      intentTimer.cancel();
      hideCard();
      currentLink = null;
    }
    return;
  }

  // We are on a link!
  currentLink = link;
  intentTimer.start(); // Start the countdown
});

document.addEventListener('mouseout', (e) => {
  // If we leave the link, cancel immediately
  const link = e.target.closest('a');
  if (link) {
    intentTimer.cancel();
    hideCard();
    currentLink = null;
  }
});

function hideCard() {
  if (cardContainer) {
    cardContainer.classList.add('lp-hidden');
  }
}

// Boot up
initShadowDOM();