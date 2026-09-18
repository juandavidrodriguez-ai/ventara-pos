(() => {
  'use strict';

  const STYLE_ID = 'ventara-modal-selection-fix';
  const BODY_CLASS = 'ventara-modal-selection-active';

  /*
   * Ajuste transversal para los formularios emergentes.
   * No modifica funciones globales ni el contenido de los formularios.
   * La corrección ataca el salto de la página durante la selección:
   * el modal es el único que puede desplazarse mientras está abierto.
   */

  const getOpenModals = () => document.querySelectorAll('.modal.show');

  const applyModalState = () => {
    const modals = getOpenModals();

    modals.forEach((modal) => {
      const box = modal.querySelector('.modalbox');
      if (!box) return;

      modal.dataset.ventaraModalSelectionFix = 'true';
      box.dataset.ventaraModalSelectionFix = 'true';
    });

    const active = modals.length > 0;
    document.documentElement.classList.toggle(BODY_CLASS, active);
  };

  const restoreDocumentPosition = () => {
    if (!document.documentElement.classList.contains(BODY_CLASS)) return;

    /*
     * Un formulario emergente usa position:fixed. Si el navegador intenta
     * desplazar el documento al mantener pulsado/seleccionar texto, volvemos
     * inmediatamente a la posición anterior sin interferir con la selección.
     */
    const y = Number(document.documentElement.dataset.ventaraScrollY || 0);
    if (window.scrollY !== y) window.scrollTo(0, y);
  };

  const captureDocumentPosition = () => {
    if (!getOpenModals().length) return;
    document.documentElement.dataset.ventaraScrollY = String(window.scrollY);
  };

  const installStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /*
       * Bloquea únicamente el scroll de fondo cuando hay un modal abierto.
       * El .modalbox conserva su scroll interno normal.
       */
      html.ventara-modal-selection-active,
      body.ventara-modal-selection-active {
        overflow: hidden !important;
        overscroll-behavior: none !important;
      }

      .modal[data-ventara-modal-selection-fix="true"] {
        overscroll-behavior: contain !important;
      }

      .modal[data-ventara-modal-selection-fix="true"] .modalbox {
        overscroll-behavior: contain !important;
        overflow-anchor: none !important;
        scroll-behavior: auto !important;
        -webkit-overflow-scrolling: touch;
      }

      .modal[data-ventara-modal-selection-fix="true"] input,
      .modal[data-ventara-modal-selection-fix="true"] textarea,
      .modal[data-ventara-modal-selection-fix="true"] select {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
    `;

    document.head.appendChild(style);
  };

  let scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      installStyle();
      captureDocumentPosition();
      applyModalState();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  /*
   * No interceptamos clics ni teclas. Solo detectamos apertura/reconstrucción
   * de un modal y evitamos que el documento de fondo se mueva.
   */
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });

  /*
   * El navegador puede intentar mover la página durante una selección táctil.
   * Restauramos únicamente el scroll del documento; el scroll interno del
   * formulario sigue disponible.
   */
  document.addEventListener('selectionchange', restoreDocumentPosition, true);
  document.addEventListener('touchstart', captureDocumentPosition, true);
  document.addEventListener('pointerdown', captureDocumentPosition, true);
})();
