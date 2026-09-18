/* VENTARA POS — Formato visual numérico aislado.
   No transforma db, Supabase ni valores usados en cálculos.
*/
(()=> {
  'use strict';

  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION']);
  const nf0 = new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
  const nf2 = new Intl.NumberFormat('es-CO',{maximumFractionDigits:2});

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return value;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/\./g,'').replace(',','.'));
    if (!Number.isFinite(n)) return value;
    return Number.isInteger(n) ? nf0.format(n) : nf2.format(n);
  }

  function normalizeInputValue(value) {
    return String(value ?? '').replace(/\./g,'').replace(/,/g,'.');
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

      input.addEventListener('focus', () => {
        const raw=normalizeInputValue(input.value);
        if (raw !== input.value) input.value=raw;
      });

      input.addEventListener('blur', () => {
        const raw=normalizeInputValue(input.value);
        const n=Number(raw);
        if (Number.isFinite(n)) input.value=formatNumber(n);
      });

      input.addEventListener('change', () => {
        const raw=normalizeInputValue(input.value);
        if (raw !== input.value) input.value=raw;
      });
    });
  }

  window.ventaraFormatNumber = formatNumber;
  window.ventaraNormalizeNumberInput = normalizeInputValue;

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