// UTILS: Helper functions for logic and timing

const Utils = {
  // 1. Debounce: Prevents the function from firing too often
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 2. Intent Check: We will expand this in Phase 2 for Velocity tracking
  // For now, it returns true if the user hovers for 'ms' milliseconds
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
  },

  // 3. Category Detection (Regex for file types)
  detectCategory: (url) => {
    if (/\.(pdf|docx|pptx|csv|txt)$/i.test(url)) return 'file';
    if (/\.(zip|rar|exe|dmg|iso)$/i.test(url)) return 'safety';
    if (url.includes('github.com') || url.includes('npmjs.com')) return 'dev';
    if (url.includes('youtube.com') || url.includes('vimeo.com')) return 'media';
    return 'content'; // Default
  }
};