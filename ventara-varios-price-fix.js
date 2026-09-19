/* VENTARA POS - Precio manual para producto "Varios".
   Ajuste quirúrgico: permite definir el precio solo para la línea actual de Varios.
   No modifica el precio guardado del producto ni altera otros productos. */
(() => {
  'use strict';

  const isVarios = (product) =>
    String(product?.name || '').trim().toLowerCase() === 'varios';

  const parsePrice = (value) => {
    if (typeof window.ventaraParseLocalizedNumber === 'function') {
      return window.ventaraParseLocalizedNumber(value);
    }
    let s = String(value ?? '').trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (s.includes('.') && s.includes(',')) {
      s = s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
    } else if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/\./g, '');
      }
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const formatPrice = (value) => {
    if (typeof window.ventaraFormatNumber === 'function') {
      return window.ventaraFormatNumber(value);
    }
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
  };

  function finishEdit(input, item) {
    if (!input || input.dataset.ventaraFinished === '1') return;
    input.dataset.ventaraFinished = '1';

    const n = parsePrice(input.value);
    if (!Number.isFinite(n) || n < 0) {
      toast('Ingresa un precio válido para Varios');
      renderPOSCart();
      return;
    }

    item.price = n;
    renderPOSCart();
    document.getElementById('posSearch')?.focus();
  }

  function startEdit(row, item, priceElement) {
    if (!row || !item || !priceElement || row.dataset.ventaraVariosEditing === '1') return;

    row.dataset.ventaraVariosEditing = '1';

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.value = String(item.price ?? 0);
    input.setAttribute('aria-label', 'Precio de Varios');
    input.title = 'Precio de Varios para esta venta';
    input.style.cssText =
      'width:130px;padding:5px 7px;border:1px solid var(--blue);border-radius:6px;font-weight:800;';

    priceElement.replaceWith(input);
    input.focus();
    input.select();

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        finishEdit(input, item);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        input.dataset.ventaraFinished = '1';
        renderPOSCart();
      }
    });

    input.addEventListener('blur', () => finishEdit(input, item), { once: true });
  }

  function handleDoubleClick(event) {
    const row = event.target.closest('.cartrow');
    if (!row) return;

    const priceElement = event.target.closest('small.muted');
    if (!priceElement || !row.contains(priceElement)) return;

    const items = Array.isArray(window.cart) ? window.cart : null;
    if (!items) return;

    const productName = row.querySelector('div:first-child b')?.textContent?.trim() || '';
    if (productName.toLowerCase() !== 'varios') return;

    const item = items.find((entry) => {
      const product = (window.db?.products || []).find(p => p.id === entry.id);
      return product && isVarios(product);
    });

    if (!item) return;

    event.preventDefault();
    event.stopPropagation();
    startEdit(row, item, priceElement);
  }

  document.addEventListener('dblclick', handleDoubleClick, true);

  // Si el carrito se renderiza de nuevo, no se altera ningún precio guardado.
  // El producto Varios puede comenzar con precio 0 y definirse en cada venta.
})();