(() => {
  'use strict';

  const STYLE_ID = 'ventara-modal-selection-fix';
  const BODY_CLASS = 'ventara-modal-selection-active';

  const getOpenModals = () => document.querySelectorAll('.modal.show');

  const applyModalState = () => {
    const modals = getOpenModals();

    modals.forEach((modal) => {
      const box = modal.querySelector('.modalbox');
      if (!box) return;
      modal.dataset.ventaraModalSelectionFix = 'true';
      box.dataset.ventaraModalSelectionFix = 'true';
    });

    document.documentElement.classList.toggle(BODY_CLASS, modals.length > 0);
  };

  const restoreDocumentPosition = () => {
    if (!document.documentElement.classList.contains(BODY_CLASS)) return;
    const y = Number(document.documentElement.dataset.ventaraScrollY || 0);
    if (window.scrollY !== y) window.scrollTo(0, y);
  };

  const captureDocumentPosition = () => {
    if (getOpenModals().length) {
      document.documentElement.dataset.ventaraScrollY = String(window.scrollY);
    }
  };

  const installStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      'html.ventara-modal-selection-active, body.ventara-modal-selection-active {' +
      'overflow: hidden !important; overscroll-behavior: contain !important;}' +
      '.modal[data-ventara-modal-selection-fix="true"] {' +
      'overscroll-behavior: contain !important;}' +
      '.modal[data-ventara-modal-selection-fix="true"] .modalbox {' +
      'overscroll-behavior: contain !important; overflow-anchor: none !important; ' +
      'scroll-behavior: auto !important; -webkit-overflow-scrolling: touch;}' +
      '.modal[data-ventara-modal-selection-fix="true"] input,' +
      '.modal[data-ventara-modal-selection-fix="true"] textarea,' +
      '.modal[data-ventara-modal-selection-fix="true"] select {' +
      'user-select: text !important; -webkit-user-select: text !important;}';

    document.head.appendChild(style);
  };

  const isSelectableField = (target, box) => {
    if (!(target instanceof Element) || !box || !box.contains(target)) return false;
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  };

  const installSelectionIsolation = (box) => {
    if (box.dataset.ventaraSelectionEventsInstalled === 'true') return;

    box.addEventListener('selectstart', (event) => {
      if (isSelectableField(event.target, box)) event.stopPropagation();
    });

    box.addEventListener('mousemove', (event) => {
      if (isSelectableField(event.target, box)) event.stopPropagation();
    });

    box.dataset.ventaraSelectionEventsInstalled = 'true';
  };

  const applySelectionIsolation = () => {
    getOpenModals().forEach((modal) => {
      const box = modal.querySelector('.modalbox');
      if (box) installSelectionIsolation(box);
    });
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
      applySelectionIsolation();
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
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });

  document.addEventListener('selectionchange', restoreDocumentPosition, true);
  document.addEventListener('touchstart', captureDocumentPosition, true);
  document.addEventListener('pointerdown', captureDocumentPosition, true);
})();