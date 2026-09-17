(() => {
  'use strict';

  const CATALOG_ID = 'productGrid';
  const BUTTON_ID = 'ventara-toggle-catalog-btn';

  const getCatalog = () => document.getElementById(CATALOG_ID);

  const applyCatalogState = () => {
    const catalog = getCatalog();
    if (!catalog) return;

    if (catalog.dataset.ventaraCatalogHidden !== 'true') {
      catalog.style.setProperty('display', 'none', 'important');
      catalog.dataset.ventaraCatalogHidden = 'true';
    }
  };

  const ensureToggleButton = () => {
    const catalog = getCatalog();
    if (!catalog || document.getElementById(BUTTON_ID)) return;

    const container = catalog.parentElement;
    if (!container) return;

    const button = document.createElement('button');
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
      const isHidden = catalog.style.display === 'none';
      catalog.style.setProperty('display', isHidden ? '' : 'none', 'important');
      button.textContent = isHidden ? 'Ocultar catálogo' : 'Mostrar catálogo';
      button.setAttribute('aria-expanded', String(isHidden));
      catalog.dataset.ventaraCatalogHidden = String(!isHidden);
    });

    container.insertBefore(button, catalog);
    applyCatalogState();
  };

  const sync = () => {
    ensureToggleButton();
    applyCatalogState();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
