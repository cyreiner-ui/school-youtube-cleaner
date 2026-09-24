(() => {
  'use strict';

  const HIDE_SELECTORS = [
    // Watch-page recommended / related videos
    'ytd-watch-next-secondary-results-renderer',
    '#related',

    // End-screen / overlay recommendations and cards
    '.ytp-endscreen-content',
    '.ytp-ce-element',
    '.ytp-ce-covering-overlay',
    '.ytp-cards-teaser',
    '.ytp-cards-button',
    '.ytp-pause-overlay',
    '.ytp-suggestion-set',
    '.ytp-suggestion-link',

    // Shopping / promotional UI
    'ytd-merch-shelf-renderer',
    'ytd-product-list-renderer',
    'ytd-offer-module-renderer',
    'ytd-brand-video-shelf-renderer',
    'ytd-statement-banner-renderer'
  ];

  const HIDE_NAV_TITLES = new Set(['Explore', 'Trending']);

  function hideElement(el) {
    if (!el || el.nodeType !== 1) return;
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('data-school-youtube-cleaner-hidden', 'true');
  }

  function cleanKnownElements(root = document) {
    for (const selector of HIDE_SELECTORS) {
      try {
        root.querySelectorAll(selector).forEach(hideElement);
      } catch (_) {
        // Ignore a selector if YouTube temporarily changes its DOM.
      }
    }

    root.querySelectorAll('a[title]').forEach((link) => {
      if (HIDE_NAV_TITLES.has(link.getAttribute('title'))) {
        const container = link.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer') || link;
        hideElement(container);
      }
    });
  }

  function disableAutoplay() {
    const toggle = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
    if (toggle && !toggle.dataset.schoolYoutubeCleanerClicked) {
      toggle.dataset.schoolYoutubeCleanerClicked = 'true';
      toggle.click();
    }
  }

  function clean() {
    cleanKnownElements(document);
    disableAutoplay();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) cleanKnownElements(node);
      }
    }
    disableAutoplay();
  });

  function start() {
    clean();
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // YouTube is a single-page app, so rerun after in-page navigation.
    window.addEventListener('yt-navigate-finish', clean, true);
    window.addEventListener('popstate', clean, true);
    setInterval(clean, 3000);
  }

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
