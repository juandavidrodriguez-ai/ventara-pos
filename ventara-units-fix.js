/* VENTARA POS - Unidades de venta adicionales (@ y 1/2 @).
   Cambio aislado: agrega opciones dinámicamente sin tocar index.html ni la lógica de guardado. */
(() => {
  'use strict';

  const OPTIONS = [
    { value: '@', text: '@' },
    { value: '1/2 @', text: '1/2 @' }
  ];
  const MARK = 'data-ventara-units-fix';

  function isArticleModal(modal) {
    const text = String(modal?.innerText || '').toLowerCase();
    return text.includes('nuevo artículo') ||
      text.includes('nuevo articulo') ||
      text.includes('editar artículo') ||
      text.includes('editar articulo');
  }

  function findUnitSelect(modal) {
    const selects = Array.from(modal?.querySelectorAll?.('select') || []);
    return selects.find((select) => {
      const field = select.closest('.field');
      const label = field?.querySelector('label');
      const context = [
        label?.textContent,
        select.getAttribute('aria-label'),
        select.getAttribute('name'),
        select.getAttribute('id'),
        select.getAttribute('placeholder'),
        field?.innerText
      ].filter(Boolean).join(' ').toLowerCase();

      return context.includes('unidad de venta');
    });
  }

  function ensureOptions(modal) {
    if (!modal || !isArticleModal(modal)) return;
    const select = findUnitSelect(modal);
    if (!select || select.hasAttribute(MARK)) return;

    OPTIONS.forEach(({ value, text }) => {
      if (Array.from(select.options).some(option => option.value === value)) return;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });

    select.setAttribute(MARK, '1');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function scan() {
    try {
      document.querySelectorAll('.modalbox, .modal, [role="dialog"]').forEach(ensureOptions);
    } catch (error) {
      console.error('[VENTARA] unidades de venta', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  new MutationObserver(scan).observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
