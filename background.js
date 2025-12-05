chrome.runtime.onInstalled.addListener(() => {
  console.log("Link Peeker: Installed & Ready (Phase 1 Skeleton)");
});

// Placeholder for future message passing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PEEK_REQUEST") {
    // Phase 2 logic will go here
    sendResponse({ status: "pending" });
  }
});