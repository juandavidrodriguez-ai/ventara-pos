(() => {
  'use strict';

  const CATALOG_ID = 'productGrid';
  const BUTTON_ID = 'ventara-toggle-catalog-btn';
  const POS_ID = 'pos';

  // Estado independiente del DOM para que renderPOS/filterPOS no puedan
  // volver a ocultar el catálogo después de que el usuario lo muestre.
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
      catalog.style.setProperty(
        'display',
        visible ? '' : 'none',
        'important'
      );
      catalog.dataset.ventaraCatalogHidden = String(!visible);
    }

    if (button) {
      button.textContent = visible ? 'Ocultar catálogo' : 'Mostrar catálogo';
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

      // Delegación por botón: siempre trabaja con el #productGrid actual.
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

    const value = String(input.value || '').trim();

    // Cuando el cajero busca por nombre, SKU o código de barras,
    // mostramos únicamente los resultados filtrados por el sistema original.
    if (value) {
      setCatalogVisible(true);
    }
  };

  const sync = () => {
    ensureToggleButton();

    // IMPORTANTE: solo sincronizamos el estado que eligió el usuario.
    // No usamos las mutaciones internas del productGrid para volver a ocultarlo.
    const catalog = getCatalog();
    if (catalog) {
      catalog.style.setProperty(
        'display',
        window.__ventaraCatalogVisible ? '' : 'none',
        'important'
      );
      catalog.dataset.ventaraCatalogHidden =
        String(!window.__ventaraCatalogVisible);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }

  // Compatible con el buscador y con lectores USB/HID que escriben como teclado.
  document.addEventListener('input', revealCatalogForSearch, true);
  document.addEventListener('change', revealCatalogForSearch, true);

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();