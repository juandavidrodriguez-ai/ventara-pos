/* VENTARA POS - Enter para agregar productos desde el buscador de Facturar.
   Complementa la opción actual: no reemplaza clicks ni modifica addToCart. */
(() => {
  'use strict';

  const isVisible = (el) => {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };

  const getSearch = () => document.getElementById('posSearch');

  const getFirstVisibleProduct = () => {
    const pos = document.getElementById('pos');
    if (!pos) return null;

    const candidates = Array.from(
      pos.querySelectorAll('.productgrid .pitem, .productgrid button, .productgrid [role="button"]')
    ).filter(isVisible);

    return candidates[0] || null;
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.keyCode !== 13) return;

    const search = getSearch();
    if (!search || event.target !== search) return;

    const product = getFirstVisibleProduct();
    if (!product) return;

    event.preventDefault();
    event.stopPropagation();
    product.click();

    // Mantiene el flujo de venta listo para el siguiente producto.
    setTimeout(() => {
      const currentSearch = getSearch();
      if (currentSearch) currentSearch.focus();
    }, 0);
  }, true);
})();
