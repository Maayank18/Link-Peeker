// utils.js
// Shared utilities used by content script

const Utils = {
  // Simple intent timer (start / cancel)
  createIntentTimer: (callback, ms) => {
    let timer = null;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(callback, ms);
    };
    const cancel = () => {
      clearTimeout(timer);
    };
    return { start, cancel };
  }
};
