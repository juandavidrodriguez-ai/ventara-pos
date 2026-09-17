(() => {
  'use strict';

  const CATALOG_ID = 'productGrid';
  const BUTTON_ID = 'ventara-toggle-catalog-btn';
  const POS_ID = 'pos';

  if (typeof window.__ventaraCatalogVisible !== 'boolean') {
    window.__ventaraCatalogVisible = false;
  }

  const getCatalog = () => document.getElementById(CATALOG_ID);
  const getButton = () => document.getElementById(BUTTON_ID);

  const setCatalogVisible = (visible) => {
    window.__ventaraCatalogVisible = !!visible;

    const catalog = getCatalog();
    const button = getButton();

    if (catalog) {
      const desiredDisplay = visible ? '' : 'none';
      if (catalog.style.display !== desiredDisplay) {
        catalog.style.setProperty('display', desiredDisplay, 'important');
      }
      const desiredHidden = String(!visible);
      if (catalog.dataset.ventaraCatalogHidden !== desiredHidden) {
        catalog.dataset.ventaraCatalogHidden = desiredHidden;
      }
    }

    if (button) {
      const text = visible ? 'Ocultar catálogo' : 'Mostrar catálogo';
      if (button.textContent !== text) button.textContent = text;
      button.setAttribute('aria-expanded', String(visible));
    }
  };

  const ensureToggleButton = () => {
    const catalog = getCatalog();
    if (!catalog) return;

    let button = getButton();

    if (!button) {
      const container = catalog.parentElement;
      if (!container) return;

      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.textContent = 'Mostrar catálogo';
      button.setAttribute('aria-expanded', 'false');
      button.style.cssText = [
        'margin: 10px 0',
        'padding: 8px 12px',
        'border: 1px solid #d1d5db',
        'border-radius: 8px',
        'background: #fff',
        'cursor: pointer',
        'font: inherit'
      ].join(';');

      button.addEventListener('click', () => {
        setCatalogVisible(!window.__ventaraCatalogVisible);
      });

      container.insertBefore(button, catalog);
    }

    setCatalogVisible(window.__ventaraCatalogVisible);
  };

  const revealCatalogForSearch = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!input.closest('#' + POS_ID)) return;

    if (String(input.value || '').trim()) {
      setCatalogVisible(true);
    }
  };

  let syncScheduled = false;

  const sync = () => {
    syncScheduled = false;
    ensureToggleButton();
  };

  const scheduleSync = () => {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(sync);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  } else {
    scheduleSync();
  }

  document.addEventListener('input', revealCatalogForSearch, true);
  document.addEventListener('change', revealCatalogForSearch, true);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
