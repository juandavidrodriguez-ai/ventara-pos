(() => {
  'use strict';

  const hideFacturarButtons = () => {
    const pos = document.getElementById('pos');
    if (!pos) return;

    const candidates = pos.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"]'
    );

    candidates.forEach((element) => {
      const text = (element.textContent || element.value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      if (
        text === '+ nuevo artículo' ||
        text === 'nuevo artículo' ||
        text === 'categorías' ||
        text === '📂 categorías'
      ) {
        element.style.setProperty('display', 'none', 'important');
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideFacturarButtons, { once: true });
  } else {
    hideFacturarButtons();
  }

  const observer = new MutationObserver(() => hideFacturarButtons());
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
