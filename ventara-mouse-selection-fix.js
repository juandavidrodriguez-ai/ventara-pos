/* VENTARA POS - Selección nativa de texto con mouse en campos editables.
   Parche aislado: protege INPUT/TEXTAREA frente a handlers globales de mouse/pointer
   que puedan cerrar/cambiar la ventana durante una selección por arrastre. */
(() => {
  'use strict';

  let selectingText = false;

  const isEditableField = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    return !!el?.closest?.('input, textarea');
  };

  const beginSelection = (event) => {
    if (isEditableField(event.target)) selectingText = true;
  };

  const protectSelection = (event) => {
    if (!isEditableField(event.target)) return;
    event.stopPropagation();
    if (event.type === 'click' && !selectingText) return;
  };

  const endSelection = (event) => {
    if (isEditableField(event.target)) {
      event.stopPropagation();
      if (event.type === 'mouseup' || event.type === 'pointerup') {
        setTimeout(() => { selectingText = false; }, 0);
      }
    }
  };

  // No bloqueamos mousedown/pointerdown: así se conserva el foco y la selección nativa.
  window.addEventListener('mousedown', beginSelection, true);
  window.addEventListener('pointerdown', beginSelection, true);

  // Aislar el movimiento/arrastre dentro de campos editables.
  window.addEventListener('mousemove', protectSelection, true);
  window.addEventListener('pointermove', protectSelection, true);
  window.addEventListener('dragstart', protectSelection, true);

  // Evitar que el cierre/navegación global interprete el final de una selección como una acción.
  window.addEventListener('mouseup', endSelection, true);
  window.addEventListener('pointerup', endSelection, true);

  // Si el navegador genera click tras el arrastre, aislarlo únicamente cuando proviene del campo.
  window.addEventListener('click', (event) => {
    if (selectingText && isEditableField(event.target)) event.stopPropagation();
  }, true);
})();
