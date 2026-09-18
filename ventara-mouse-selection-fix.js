/* VENTARA POS - Selección nativa de texto con mouse en campos editables.
   Cambio aislado: evita que listeners globales de movimiento/arrastre reaccionen
   cuando el puntero está dentro de INPUT/TEXTAREA. No toca index.html. */
(() => {
  'use strict';

  const isEditableField = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    return !!el?.closest?.('input, textarea');
  };

  const isolateSelection = (event) => {
    if (!isEditableField(event.target)) return;
    event.stopPropagation();
  };

  // Captura únicamente estos eventos y únicamente dentro de campos editables.
  // El comportamiento nativo de selección/clic/foco permanece intacto.
  window.addEventListener('mousemove', isolateSelection, true);
  window.addEventListener('dragstart', isolateSelection, true);
})();
