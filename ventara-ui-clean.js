(() => {
  'use strict';

  const hideButton = (button) => {
    if (!button) return;
    button.style.setProperty('display', 'none', 'important');
  };

  const cleanVentaraUI = () => {
    const candidates = document.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"]'
    );

    candidates.forEach((element) => {
      const text = (element.textContent || element.value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      const id = (element.id || '').toLowerCase();
      const className = (
        typeof element.className === 'string'
          ? element.className
          : ''
      ).toLowerCase();

      if (
        text === '+ nuevo artículo' ||
        text === 'nuevo artículo' ||
        text === 'categorías' ||
        id.includes('nuevo-articulo') ||
        id.includes('nuevoarticulo') ||
        id.includes('categor') ||
        className.includes('nuevo-articulo') ||
        className.includes('nuevoarticulo') ||
        className.includes('categor')
      ) {
        hideButton(element);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanVentaraUI, { once: true });
  } else {
    cleanVentaraUI();
  }
})();
