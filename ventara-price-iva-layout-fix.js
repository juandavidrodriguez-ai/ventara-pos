(() => {
  'use strict';

  const rates = [0,1,2,4,5,8,10,12,15,16,18,19,20,21,22,25,30,35];

  const productModal = () => {
    const price = document.getElementById('f_price');
    const name = document.getElementById('f_name');
    return price && name ? price.closest('.modal, .modal-content, [role="dialog"]') || document.querySelector('.modal, .modal-content, [role="dialog"]') : null;
  };

  const moneyNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };

  const syncValues = (source) => {
    const base = document.getElementById('ventaraPriceBase');
    const total = document.getElementById('f_price');
    const iva = document.getElementById('ventaraProductIva');
    if (!base || !total || !iva) return;
    const rate = iva.value === 'custom' ? Number(document.getElementById('ventaraCustomIva')?.value || 0) : Number(iva.value || 0);
    if (source === 'base') {
      const b = Number(base.value || 0);
      total.value = b ? String(moneyNumber(b * (1 + rate / 100))) : '';
    } else {
      const t = Number(total.value || 0);
      base.value = t ? String(moneyNumber(t / (1 + rate / 100))) : '';
    }
  };

  const readRate = () => {
    const sel = document.getElementById('ventaraProductIva');
    if (!sel) return 0;
    if (sel.value === 'custom') return Number(document.getElementById('ventaraCustomIva')?.value || 0);
    return Number(sel.value || 0);
  };

  let lastEdited = 'total';

  function buildPriceRow() {
    const price = document.getElementById('f_price');
    const modal = productModal();
    if (!price || !modal) return;
    const priceField = price.closest('.field');
    if (!priceField || priceField.dataset.ventaraPriceRow === '1') return;

    let ivaSelect = document.getElementById('ventaraProductIva');
    if (!ivaSelect) return;

    const ivaField = ivaSelect.closest('.field');
    if (!ivaField) return;

    priceField.dataset.ventaraPriceRow = '1';
    ivaField.dataset.ventaraPriceIva = '1';

    const p = (() => {
      try { return db.products.find(x => x.id === priceField.dataset.ventaraProductId) || null; } catch (_) { return null; }
    })();

    const baseField = document.createElement('div');
    baseField.className = 'field';
    baseField.innerHTML = '<label>Precio</label><input id="ventaraPriceBase" type="number" step="0.01" placeholder="Precio">';

    const base = baseField.querySelector('#ventaraPriceBase');
    const label = priceField.querySelector('label');
    if (label) label.textContent = 'Total';
    price.placeholder = 'Total';
    price.removeAttribute('data-ventara-price-row');
    price.style.width = '100%';

    const preview = ivaField.querySelector('#ventaraIvaPreview');
    if (preview) preview.style.display = 'none';
    const small = ivaField.querySelector('small');
    if (small) small.style.display = 'none';
    ivaField.style.marginTop = '0';

    const row = document.createElement('div');
    row.className = 'ventara-price-iva-row';
    row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) auto minmax(125px,160px) auto minmax(0,1fr);gap:8px;align-items:end;width:100%;margin-top:4px';

    const plus = document.createElement('div');
    plus.textContent = '+';
    plus.style.cssText = 'font-weight:900;font-size:18px;padding-bottom:9px;text-align:center';

    const equals = document.createElement('div');
    equals.textContent = '=';
    equals.style.cssText = 'font-weight:900;font-size:18px;padding-bottom:9px;text-align:center';

    row.append(baseField, plus, ivaField, equals, priceField);

    const parent = priceField.parentElement;
    parent.insertBefore(row, priceField);

    const existingProduct = (() => {
      try {
        const name = document.getElementById('f_name')?.value || '';
        const code = document.getElementById('f_code')?.value || '';
        return db.products.find(x => (code && x.code === code) || (name && x.name === name)) || null;
      } catch (_) { return null; }
    })();

    const rate = Number(existingProduct?.iva ?? 0);
    const option = [...ivaSelect.options].find(o => Number(o.value) === rate);
    if (option) ivaSelect.value = String(rate);
    else if (rate) {
      ivaSelect.value = 'custom';
      let custom = document.getElementById('ventaraCustomIva');
      if (!custom) {
        const wrap = document.createElement('div');
        wrap.id = 'ventaraCustomIvaWrap';
        wrap.style.cssText = 'margin-top:6px';
        wrap.innerHTML = '<input id="ventaraCustomIva" type="number" min="0" max="100" step="0.01" placeholder="% IVA">';
        preview?.appendChild(wrap);
        custom = wrap.querySelector('#ventaraCustomIva');
      }
      if (custom) custom.value = String(rate);
    }

    const totalValue = Number(price.value || 0);
    base.value = totalValue ? String(moneyNumber(totalValue / (1 + rate / 100))) : '';

    base.addEventListener('input', () => { lastEdited = 'base'; syncValues('base'); });
    price.addEventListener('input', () => { lastEdited = 'total'; syncValues('total'); });
    ivaSelect.addEventListener('change', () => syncValues(lastEdited));

    const customHandler = () => syncValues(lastEdited);
    const customObserver = new MutationObserver(() => {
      const c = document.getElementById('ventaraCustomIva');
      if (c && !c.dataset.ventaraBound) {
        c.dataset.ventaraBound = '1';
        c.addEventListener('input', customHandler);
      }
    });
    customObserver.observe(ivaField, {childList:true, subtree:true});
  }

  let originalSaveProduct = null;
  let wrapping = false;

  function installSaveHook() {
    if (wrapping || typeof window.saveProduct !== 'function') return;
    originalSaveProduct = window.saveProduct;
    window.saveProduct = async function(id) {
      const iva = readRate();
      const name = String(document.getElementById('f_name')?.value || '').trim();
      const code = String(document.getElementById('f_code')?.value || '').trim();
      const result = await originalSaveProduct.apply(this, arguments);
      try {
        const products = db?.products || [];
        let p = id ? products.find(x => x.id === id) : null;
        if (!p && code) p = products.find(x => x.code === code);
        if (!p && name) p = products.find(x => x.name === name);
        if (p) {
          p.iva = moneyNumber(iva);
          if (typeof save === 'function') save();
          if (typeof cloudSave === 'function') await cloudSave();
        }
      } catch (e) {
        console.error('VENTARA Precio/IVA: no se pudo guardar el IVA', e);
      }
      return result;
    };
    wrapping = true;
  }

  function boot() {
    installSaveHook();
    buildPriceRow();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  new MutationObserver(() => {
    installSaveHook();
    buildPriceRow();
  }).observe(document.documentElement, {subtree:true, childList:true});

  setInterval(() => {
    installSaveHook();
    buildPriceRow();
  }, 700);
})();