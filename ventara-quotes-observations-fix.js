/* VENTARA POS - Valor predeterminado editable para Observaciones en Nueva cotización.
   Cambio aislado: no toca index.html, Supabase, guardado ni generación de comprobantes.
   Trigger de sincronización Vercel: 2026-09-18. */
(() => {
  'use strict';

  const DEFAULT_OBSERVATION = 'Precios sujetos a disponibilidad. Tiempo de entrega 1 a 2 días.';
  const MARK = 'data-ventara-quotes-observation-default';

  function isNewQuoteModal(modal) {
    const text = String(modal?.innerText || '').toLowerCase();
    return text.includes('nueva cotización') || text.includes('nueva cotizacion');
  }

  function findObservationField(modal) {
    const textareas = Array.from(modal?.querySelectorAll?.('textarea') || []);
    return textareas.find((textarea) => {
      const field = textarea.closest('.field');
      const label = field?.querySelector('label');
      const context = [
        label?.textContent,
        textarea.getAttribute('aria-label'),
        textarea.getAttribute('name'),
        textarea.getAttribute('id'),
        textarea.getAttribute('placeholder')
      ].filter(Boolean).join(' ').toLowerCase();

      return context.includes('observaciones para el cliente');
    }) || textareas.find((textarea) => {
      const field = textarea.closest('.field');
      const context = String(field?.innerText || '').toLowerCase();
      return context.includes('observaciones para el cliente');
    });
  }

  function applyDefault(modal) {
    if (!modal || !isNewQuoteModal(modal)) return;
    const textarea = findObservationField(modal);
    if (!textarea || textarea.hasAttribute(MARK)) return;

    textarea.setAttribute(MARK, '1');

    if (String(textarea.value || '').trim() === '') {
      textarea.value = DEFAULT_OBSERVATION;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function scan() {
    try {
      document.querySelectorAll('.modalbox, .modal, [role="dialog"]').forEach(applyDefault);
    } catch (error) {
      console.error('[VENTARA] quotes observation default', error);
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
