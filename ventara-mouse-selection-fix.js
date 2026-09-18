/* VENTARA POS - Protección quirúrgica de selección de texto en modales.
   Evita que el click generado al terminar un arrastre de texto sobre el backdrop
   cierre el modal. No modifica index.html ni bloquea los clicks normales. */
(() => {
  'use strict';

  let selectionStartedInField = false;

  const isEditableField = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    return !!el?.closest?.('input, textarea');
  };

  const isModalBackdrop = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    return el?.id === 'modal';
  };

  window.addEventListener('mousedown', (event) => {
    selectionStartedInField = isEditableField(event.target);
  }, true);

  window.addEventListener('pointerdown', (event) => {
    selectionStartedInField = isEditableField(event.target);
  }, true);

  window.addEventListener('mousemove', (event) => {
    if (isEditableField(event.target)) event.stopPropagation();
  }, true);

  window.addEventListener('pointermove', (event) => {
    if (isEditableField(event.target)) event.stopPropagation();
  }, true);

  window.addEventListener('dragstart', (event) => {
    if (isEditableField(event.target)) event.stopPropagation();
  }, true);

  // Mantener la marca hasta el CLICK. El problema ocurre porque mouseup/pointerup
  // sucede antes del click y la versión anterior borraba la marca demasiado pronto.
  window.addEventListener('click', (event) => {
    if (selectionStartedInField && isModalBackdrop(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    selectionStartedInField = false;
  }, true);

  // No borrar aquí: el click posterior es el evento que debe ser protegido.
  window.addEventListener('mouseup', (event) => {
    if (selectionStartedInField && isModalBackdrop(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('pointerup', (event) => {
    if (selectionStartedInField && isModalBackdrop(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();