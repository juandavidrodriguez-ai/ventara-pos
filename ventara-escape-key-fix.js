/* VENTARA POS - Cierre quirúrgico de modal activo con la tecla Escape.
   No modifica index.html ni altera guardado, facturación o cobros.
   Solo actúa cuando existe un modal/emergente visible. */
(() => {
  'use strict';

  const isVisible = (element) => {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0;
  };

  const getVisibleModals = () => {
    const selectors = [
      '#modal',
      '.modal.show',
      '[role="dialog"]',
      '.modalbox'
    ];

    const seen = new Set();
    const result = [];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (seen.has(element) || !isVisible(element)) return;
        seen.add(element);
        result.push(element);
      });
    });

    return result;
  };

  const closeModal = (modal) => {
    if (!modal) return false;

    const closeButton = modal.querySelector(
      '.btn-close, button[data-bs-dismiss="modal"], [data-dismiss="modal"], [aria-label="Close"], [aria-label="Cerrar"]'
    );

    if (closeButton) {
      closeButton.click();
      return true;
    }

    if (modal.id === 'modal' && typeof window.closeModal === 'function') {
      window.closeModal();
      return true;
    }

    if (modal.classList.contains('show')) {
      modal.classList.remove('show');
      return true;
    }

    const modalBox = modal.closest('#modal');
    if (modalBox && typeof window.closeModal === 'function') {
      window.closeModal();
      return true;
    }

    return false;
  };

  window.addEventListener('keydown', (event) => {
    if (!(event.key === 'Escape' || event.keyCode === 27)) return;

    const modals = getVisibleModals();
    if (!modals.length) return;

    // El último modal visible encontrado se considera el que está al frente.
    const activeModal = modals[modals.length - 1];

    if (closeModal(activeModal)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
