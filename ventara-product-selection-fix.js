(() => {
  'use strict';

  const STYLE_ID = 'ventara-product-selection-fix';

  const isProductModal = (modal) => {
    if (!modal) return false;
    const text = (modal.innerText || '').toLowerCase();
    return (
      text.includes('nuevo artículo') ||
      text.includes('nuevo articulo') ||
      text.includes('crear producto') ||
      text.includes('editar producto') ||
      text.includes('precio de venta') ||
      text.includes('precio de costo')
    );
  };

  const applyFix = () => {
    const modal = document.querySelector('.modal.show');
    if (!isProductModal(modal)) return;

    const box = modal.querySelector('.modalbox');
    if (!box) return;

    modal.dataset.ventaraProductSelectionFix = 'true';
    box.dataset.ventaraProductSelectionFix = 'true';

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .modal[data-ventara-product-selection-fix="true"] {
          overscroll-behavior: contain !important;
        }

        .modal[data-ventara-product-selection-fix="true"] .modalbox {
          overscroll-behavior: contain !important;
          overflow-anchor: none !important;
          scroll-behavior: auto !important;
        }

        .modal[data-ventara-product-selection-fix="true"] input,
        .modal[data-ventara-product-selection-fix="true"] textarea {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  let scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyFix();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
