(() => {
  'use strict';

  const STYLE_ID = 'ventara-modal-selection-fix';

  /*
   * Ajuste transversal y no destructivo para los formularios emergentes.
   * No modifica funciones globales ni el contenido de los formularios.
   * Se aplica únicamente mientras existe un .modal.show.
   */
  const applyFix = () => {
    const modals = document.querySelectorAll('.modal.show');
    if (!modals.length) return;

    modals.forEach((modal) => {
      const box = modal.querySelector('.modalbox');
      if (!box) return;

      modal.dataset.ventaraModalSelectionFix = 'true';
      box.dataset.ventaraModalSelectionFix = 'true';
    });

    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* El desplazamiento queda contenido dentro de la ventana emergente. */
      .modal[data-ventara-modal-selection-fix="true"] {
        overscroll-behavior: contain !important;
        overflow: hidden !important;
      }

      .modal[data-ventara-modal-selection-fix="true"] .modalbox {
        overscroll-behavior: contain !important;
        overflow-anchor: none !important;
        scroll-behavior: auto !important;
        -webkit-overflow-scrolling: touch;
      }

      /* Mantiene disponible la selección normal de texto para copiar/borrar. */
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
      applyFix();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  /*
   * Observa únicamente cambios del DOM para detectar la apertura/reconstrucción
   * de los modales. No intercepta clics, teclas ni funciones de negocio.
   */
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
