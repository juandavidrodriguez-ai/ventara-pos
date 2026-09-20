(() => {
  'use strict';

  const rates = [0,1,2,4,5,8,10,12,15,16,18,19,20,21,22,25,30,35];

  const productModal = () => {
    const price = document.getElementById('f_price');
    const name = document.getElementById('f_name');
    return price && name ? price.closest('.modal, .modal-content, [role="dialog"]') || document.querySelector('.modal, .modal-content, [role="dialog"]') : null;
  };

  const parseMoney = (v) => {
    const fn = window.ventaraParseLocalizedNumber;
    if (typeof fn === 'function') {
      const n = fn(v);
      if (Number.isFinite(n)) return n;
    }
    const raw = String(v ?? '').trim().replace(/\s/g,'');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) return Number(raw.replace(/\./g,'').replace(',','.'));
    if (/^-?\d+(,\d+)?$/.test(raw)) return Number(raw.replace(',','.'));
    return Number(raw);
  };

  const moneyNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };

  const getRate = () => {
    const sel = document.getElementById('ventaraProductIva');
    if (!sel) return 0;
    return sel.value === 'custom'
      ? parseMoney(document.getElementById('ventaraCustomIva')?.value || 0)
      : Number(sel.value || 0);
  };

  const syncValues = (source) => {
    const base = document.getElementById('ventaraPriceBase');
    const total = document.getElementById('f_price');
    if (!base || !total) return;
    const rate = getRate();
    if (source === 'base') {
      const b = parseMoney(base.value || 0);
      total.value = b ? String(moneyNumber(b * (1 + rate / 100))) : '';
    } else {
      const t = parseMoney(total.value || 0);
      base.value = t ? String(moneyNumber(t / (1 + rate / 100))) : '';
    }
  };

  const readRate = () => getRate();

  let lastEdited = 'total';

  function ensureIvaField(modal) {
    let field = document.getElementById('ventaraProductIva')?.closest('.field');
    if (field) return field;

    const price = document.getElementById('f_price');
    if (!price) return null;

    field = document.createElement('div');
    field.className = 'field';
    field.style.cssText = 'margin-top:0';
    field.innerHTML = '<label>IVA (%)</label><select id="ventaraProductIva">' +
      rates.map(r => '<option value="' + r + '">' + r + '%</option>').join('') +
      '<option value="custom">Personalizado</option>' +
      '</select><div id="ventaraCustomIvaWrap" style="display:none;margin-top:6px"><input id="ventaraCustomIva" type="text" inputmode="decimal" placeholder="% IVA personalizado"></div>';

    const host = price.closest('.field')?.parentElement || modal.querySelector('.form') || modal;
    host.appendChild(field);

    const sel = field.querySelector('#ventaraProductIva');
    const custom = field.querySelector('#ventaraCustomIva');
    const customWrap = field.querySelector('#ventaraCustomIvaWrap');

    const refresh = () => {
      customWrap.style.display = sel.value === 'custom' ? 'block' : 'none';
      syncValues(lastEdited);
    };
    sel.addEventListener('change', refresh);
    custom.addEventListener('input', () => syncValues(lastEdited));

    refresh();
    return field;
  }

  function existingProduct() {
    try {
      const raw = localStorage.getItem('ventara_pos_v1');
      const state = raw ? JSON.parse(raw) : null;
      const name = document.getElementById('f_name')?.value || '';
      const code = document.getElementById('f_code')?.value || '';
      return state?.products?.find(x => (code && x.code === code) || (name && x.name === name)) || null;
    } catch (_) {
      return null;
    }
  }

  function buildPriceRow() {
    const price = document.getElementById('f_price');
    const modal = productModal();
    if (!price || !modal) return;
    const priceField = price.closest('.field');
    if (!priceField || priceField.dataset.ventaraPriceRow === '1') return;

    const ivaField = ensureIvaField(modal);
    if (!ivaField) return;

    priceField.dataset.ventaraPriceRow = '1';
    ivaField.dataset.ventaraPriceIva = '1';

    const baseField = document.createElement('div');
    baseField.className = 'field';
    baseField.innerHTML = '<label>Precio</label><input id="ventaraPriceBase" type="text" inputmode="decimal" placeholder="Precio">';

    const base = baseField.querySelector('#ventaraPriceBase');
    const label = priceField.querySelector('label');
    if (label) label.textContent = 'Total';
    price.placeholder = 'Total';
    price.style.width = '100%';

    const row = document.createElement('div');
    row.className = 'ventara-price-iva-row';
    row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) auto minmax(125px,160px) auto minmax(0,1fr);gap:8px;align-items:end;width:100%;margin-top:4px';

    const plus = document.createElement('div');
    plus.textContent = '+';
    plus.style.cssText = 'font-weight:900;font-size:18px;padding-bottom:9px;text-align:center';

    const equals = document.createElement('div');
    equals.textContent = '=';
    equals.style.cssText = 'font-weight:900;font-size:18px;padding-bottom:9px;text-align:center';

    const parent = priceField.parentElement;
    parent.insertBefore(row, priceField);
    row.append(baseField, plus, ivaField, equals, priceField);

    const product = existingProduct();
    const rate = Number(product?.iva ?? 0);
    const sel = document.getElementById('ventaraProductIva');
    const custom = document.getElementById('ventaraCustomIva');
    const customWrap = document.getElementById('ventaraCustomIvaWrap');

    if (sel) {
      const option = [...sel.options].find(o => Number(o.value) === rate);
      if (option) {
        sel.value = String(rate);
        customWrap.style.display = 'none';
      } else if (rate) {
        sel.value = 'custom';
        custom.value = String(rate);
        customWrap.style.display = 'block';
      }
    }

    const totalValue = parseMoney(price.value || 0);
    base.value = totalValue ? String(moneyNumber(totalValue / (1 + rate / 100))) : '';

    base.addEventListener('input', () => {
      lastEdited = 'base';
      syncValues('base');
    });
    price.addEventListener('input', () => {
      lastEdited = 'total';
      syncValues('total');
    });
  }

  window.ventaraIvaRates = rates;
  window.ventaraPriceWithIva = (price, iva) => moneyNumber(parseMoney(price) * (1 + Number(iva || 0) / 100));
  window.ventaraIvaAmount = (price, iva) => moneyNumber(parseMoney(price) * Number(iva || 0) / 100);
  window.__ventaraCurrentIva = readRate;

  function boot() {
    buildPriceRow();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  new MutationObserver(buildPriceRow).observe(document.documentElement, {subtree:true, childList:true});
  setInterval(buildPriceRow, 700);
})();