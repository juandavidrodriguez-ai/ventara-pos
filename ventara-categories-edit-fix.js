/* VENTARA POS - Edición quirúrgica de categorías.
   No modifica index.html ni reemplaza Crear/Eliminar.
   Las categorías se almacenan como texto en db.products[].category;
   save() conserva el mecanismo existente de persistencia local/Supabase.
*/
(()=> {
  'use strict';

  const getDb = () => {
    try { return typeof db !== 'undefined' ? db : (window.db || null); }
    catch (_) { return window.db || null; }
  };

  const notify = (message) => {
    try {
      if (typeof window.toast === 'function') window.toast(message);
      else alert(String(message));
    } catch (_) {}
  };

  const esc = (value) => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');

  const isCategoriesModal = (root) => {
    const text = String(root?.innerText || '').toLowerCase();
    return !!root &&
      text.includes('categorías') &&
      !!root.querySelector('#ventaraCategoryForm');
  };

  const normalizeName = (value) => String(value ?? '').trim().replace(/\s+/g,' ');

  function editCategory(oldName) {
    const d = getDb();
    if (!d) return notify('Los datos todavía no están listos.');

    const current = normalizeName(oldName);
    if (!current) return notify('No se encontró la categoría.');

    const nextRaw = window.prompt('Nuevo nombre de la categoría:', current);
    if (nextRaw === null) return;

    const next = normalizeName(nextRaw);
    if (!next) return notify('Escribe el nombre de la categoría.');
    if (next.length > 60) return notify('La categoría no puede superar 60 caracteres.');
    if (next === current) return;

    if (!Array.isArray(d.categories)) d.categories = [];

    const duplicate = d.categories.some((name) =>
      normalizeName(name).toLowerCase() === next.toLowerCase() &&
      normalizeName(name).toLowerCase() !== current.toLowerCase()
    );
    if (duplicate) return notify('Esa categoría ya existe.');

    const categoryIndex = d.categories.findIndex((name) =>
      normalizeName(name) === current
    );
    if (categoryIndex < 0) return notify('No se encontró la categoría.');

    const products = Array.isArray(d.products) ? d.products : [];
    const affectedProducts = products.filter((product) =>
      normalizeName(product?.category) === current
    );

    const oldCategoryValue = d.categories[categoryIndex];

    try {
      // Actualización atómica sobre el estado local en memoria.
      // Si los artículos guardan el nombre textual, se actualizan únicamente
      // los registros que apuntan a la categoría renombrada.
      d.categories[categoryIndex] = next;
      affectedProducts.forEach((product) => { product.category = next; });

      // Usa exclusivamente el mecanismo de persistencia ya existente.
      if (typeof window.save !== 'function') {
        throw new Error('No está disponible el mecanismo de guardado de VENTARA.');
      }
      window.save();

      // Una sola actualización visual del modal, sin recargar la aplicación.
      if (typeof window.openCategoriesModal === 'function') {
        window.openCategoriesModal();
      }

      if (typeof window.log === 'function') {
        window.log('Categoría editada', oldCategoryValue + ' → ' + next);
      }

      notify(
        affectedProducts.length
          ? 'Categoría actualizada y artículos sincronizados.'
          : 'Categoría actualizada correctamente.'
      );
    } catch (error) {
      // Reversión completa si el mecanismo de persistencia falla.
      d.categories[categoryIndex] = oldCategoryValue;
      affectedProducts.forEach((product) => { product.category = current; });
      console.error('[VENTARA] edición de categoría', error);
      notify(error?.message || 'No se pudo actualizar la categoría.');
    }
  }

  window.editVentaraCategory = editCategory;

  function decorateCategoriesModal() {
    const modal = document.getElementById('modal');
    const box = modal?.querySelector('.modalbox');
    if (!isCategoriesModal(box)) return;

    const table = box.querySelector('table');
    const tbody = table?.tBodies?.[0];
    if (!tbody) return;

    Array.from(tbody.rows).forEach((row) => {
      const cells = row.cells;
      if (!cells || cells.length < 3) return;

      const categoryName = normalizeName(cells[0].textContent);
      if (!categoryName) return;

      const actionCell = cells[cells.length - 1];
      if (!actionCell || actionCell.querySelector('[data-ventara-edit-category]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn sm';
      button.setAttribute('data-ventara-edit-category','1');
      button.setAttribute('title','Editar categoría');
      button.style.cssText = 'margin-left:6px;background:#e8eef5;color:#17324d';
      button.textContent = 'Editar';
      button.addEventListener('click', () => editCategory(categoryName));

      actionCell.appendChild(button);
    });
  }

  function boot() {
    decorateCategoriesModal();
    new MutationObserver(() => {
      setTimeout(decorateCategoriesModal, 0);
    }).observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();