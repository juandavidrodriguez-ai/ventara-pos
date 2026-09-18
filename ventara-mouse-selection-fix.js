/* VENTARA POS - Protección quirúrgica de selección de texto en modales.
   El modal cierra cuando su backdrop recibe un click. Al arrastrar texto,
   el mouseup puede terminar fuera del INPUT/TEXTAREA y generar ese click.
   Este parche conserva los clicks normales y bloquea solo ese click posterior
   a una selección iniciada dentro de un campo editable. */
(() => {
  'use strict';

  let selectionStartedInField = false;

  const isEditableField = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    return !!el?.closest?.('input, textarea');
  };

  const isModalBackdrop = (target) => {
    const el = target && target.nodeType === 1 ? target : target?.parentElement;
    return !!el?.closest?.('#modal') && el?.closest?.('#modal') === el;
  };

  window.addEventListener('mousedown', (event) => {
    selectionStartedInField = isEditableField(event.target);
  }, true);

  window.addEventListener('pointerdown', (event) => {
    selectionStartedInField = isEditableField(event.target);
  }, true);

  // No bloquear movimientos: solo impedir que handlers globales reciban el evento
  // mientras el puntero permanece dentro del campo.
  window.addEventListener('mousemove', (event) => {
    if (isEditableField(event.target)) event.stopPropagation();
  }, true);

  window.addEventListener('pointermove', (event) => {
    if (isEditableField(event.target)) event.stopPropagation();
  }, true);

  window.addEventListener('dragstart', (event) => {
    if (isEditableField(event.target)) event.stopPropagation();
  }, true);

  // Esta es la protección clave: index.html cierra #modal cuando el click
  // termina directamente sobre el backdrop. No debe hacerlo tras seleccionar texto.
  window.addEventListener('click', (event) => {
    if (selectionStartedInField && isModalBackdrop(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectionStartedInField = false;
    }
  }, true);

  window.addEventListener('mouseup', (event) => {
    if (selectionStartedInField && isModalBackdrop(event.target)) {
      event.stopPropagation();
    }
    setTimeout(() => { selectionStartedInField = false; }, 0);
  }, true);

  window.addEventListener('pointerup', (event) => {
    if (selectionStartedInField && isModalBackdrop(event.target)) {
      event.stopPropagation();
    }
    setTimeout(() => { selectionStartedInField = false; }, 0);
  }, true);
})();
