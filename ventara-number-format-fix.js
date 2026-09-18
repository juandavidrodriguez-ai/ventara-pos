/* VENTARA POS — Formato numérico y monetario localizado.
   Ajuste quirúrgico: los campos monetarios aceptan separadores de miles
   sin convertir 8.000 en 8. Los valores internos siguen siendo numéricos.
*/
(()=> {
  'use strict';

  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION']);
  const nf0 = new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
  const nf2 = new Intl.NumberFormat('es-CO',{maximumFractionDigits:2});

  const MONEY_IDS = new Set(['f_price','f_cost','b_cost','pay_value','e_value']);
  const MONEY_LABEL_RE = /precio|costo(?: unitario)?|\bvalor\b|importe|monto/i;

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return value;
    const n = typeof value === 'number' ? value : parseLocalizedNumber(value);
    if (!Number.isFinite(n)) return value;
    return Number.isInteger(n) ? nf0.format(n) : nf2.format(n);
  }

  function parseLocalizedNumber(value) {
    let s = String(value ?? '').trim().replace(/\s/g,'');
    if (!s) return NaN;

    const hasDot = s.includes('.');
    const hasComma = s.includes(',');

    if (hasDot && hasComma) {
      // Colombia: 8.000,50 -> 8000.50
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g,'').replace(',', '.');
      } else {
        // También toleramos 8,000.50 -> 8000.50
        s = s.replace(/,/g,'');
      }
    } else if (hasComma) {
      // Una sola coma se interpreta como decimal: 8000,50 -> 8000.50.
      s = s.replace(',', '.');
    } else if (hasDot) {
      const parts = s.split('.');
      // 8.000 / 12.500.000 se interpretan como miles.
      // 8.50 se conserva como decimal.
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && /^-?\d+$/.test(parts[0]))) {
        s = s.replace(/\./g,'');
      }
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function normalizeInputValue(value) {
    const n = parseLocalizedNumber(value);
    return Number.isFinite(n) ? String(n) : String(value ?? '');
  }

  function isMoneyInput(input) {
    if (!input || input.tagName !== 'INPUT') return false;
    if (MONEY_IDS.has(input.id)) return true;
    if (input.dataset.money === 'true') return true;

    const field = input.closest('.field');
    const label = field?.querySelector('label')?.textContent || '';
    return MONEY_LABEL_RE.test(label);
  }

  function formatText(text) {
    return String(text).replace(/(^|[^\d])(-?\d{4,}(?:\.\d+)?)(?=$|[^\d])/g, function(_, prefix, raw) {
      const normalized = raw.replace(/\./g,'');
      const n = Number(normalized);
      if (!Number.isFinite(n)) return _;
      return prefix + formatNumber(n);
    });
  }

  function formatNode(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes=[];
    let node;
    while ((node=walker.nextNode())) {
      const parent=node.parentElement;
      if (!parent || SKIP.has(parent.tagName) || parent.closest('[data-no-number-format]')) continue;
      if (/\d{4,}/.test(node.nodeValue||'')) nodes.push(node);
    }
    nodes.forEach(n => {
      const formatted=formatText(n.nodeValue);
      if (formatted !== n.nodeValue) n.nodeValue=formatted;
    });
  }

  function bindNumericInputs(root=document) {
    root.querySelectorAll?.('input[type="number"], input[data-number], input[data-money], input[data-quantity]').forEach(input => {
      if (input.dataset.ventaraNumberBound) return;
      input.dataset.ventaraNumberBound='1';

      if (isMoneyInput(input)) {
        // type=number no puede representar visualmente 8.000 como ocho mil:
        // el punto se interpreta como decimal. Para dinero usamos texto
        // + teclado decimal y hacemos la conversión al guardar.
        input.type='text';
        input.inputMode='decimal';
        input.autocomplete='off';
        input.dataset.money='true';
        input.placeholder='Ej. 8.000 o 8.000,50';
        if (input.value) input.value=formatNumber(parseLocalizedNumber(input.value));

        input.addEventListener('focus', () => {
          const raw=normalizeInputValue(input.value);
          if (raw !== input.value) input.value=raw;
        });

        input.addEventListener('blur', () => {
          const n=parseLocalizedNumber(input.value);
          if (Number.isFinite(n)) input.value=formatNumber(n);
        });

        return;
      }

      // Cantidades y demás números no monetarios conservan su comportamiento.
      input.addEventListener('focus', () => {
        const raw=normalizeInputValue(input.value);
        if (raw !== input.value) input.value=raw;
      });

      input.addEventListener('blur', () => {
        const raw=normalizeInputValue(input.value);
        const n=Number(raw);
        if (Number.isFinite(n)) input.value=String(n);
      });

      input.addEventListener('change', () => {
        const raw=normalizeInputValue(input.value);
        if (raw !== input.value) input.value=raw;
      });
    });
  }

  function normalizeMoneyInputsBeforeSave() {
    document.querySelectorAll('input[data-money="true"]').forEach(input => {
      const n=parseLocalizedNumber(input.value);
      if (Number.isFinite(n)) input.value=String(n);
    });
  }

  // El listener en captura corre antes de los onclick internos de Guardar/Crear.
  document.addEventListener('click', event => {
    const button=event.target.closest?.('button');
    if (!button) return;
    const text=button.textContent?.trim().toLowerCase() || '';
    if (/guardar|actualizar|crear|registrar|aplicar|abonar/.test(text)) {
      normalizeMoneyInputsBeforeSave();
    }
  }, true);

  window.ventaraFormatNumber = formatNumber;
  window.ventaraNormalizeNumberInput = normalizeInputValue;
  window.ventaraParseLocalizedNumber = parseLocalizedNumber;

  function apply() {
    if (!document.body) return;
    formatNode(document.body);
    bindNumericInputs(document);
  }

  let scheduled=false;
  const schedule=()=>{
    if (scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{ scheduled=false; apply(); });
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply, {once:true});
  else apply();

  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();