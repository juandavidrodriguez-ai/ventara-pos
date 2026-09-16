/* VENTARA POS — Desbloqueo final del botón Nuevo pedido. No altera estilos ni módulos nativos. */
(()=>{
  'use strict';
  if(window.__VENTARA_ORDERS_BUTTON_FIX__) return;
  window.__VENTARA_ORDERS_BUTTON_FIX__=true;
  const W=window;
  const isNewOrderButton=(el)=>{
    const b=el?.closest?.('button,a,[role="button"]');
    if(!b) return false;
    const text=(b.innerText||b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    const id=String(b.id||'').toLowerCase();
    const cls=String(b.className||'').toLowerCase();
    return text.includes('nuevo pedido') || text.includes('nuevo')&&text.includes('pedido') || text.includes('+ pedido') || id==='btnneworder' || id==='neworder' || id==='addorder' || id==='orderadd' || cls.includes('btn-new-order');
  };
  const invoke=()=>{
    const fn=W.openNewOrderModal;
    if(typeof fn==='function'){
      try{fn();return true}catch(err){console.error('[VENTARA] openNewOrderModal error',err);}
    }
    return false;
  };
  document.addEventListener('click',(e)=>{
    if(!isNewOrderButton(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
    if(invoke()) return;
    let tries=0;
    const timer=setInterval(()=>{if(invoke()||++tries>=20)clearInterval(timer)},150);
  },true);
  const expose=()=>{
    if(typeof W.openNewOrderModal==='function'){
      W.openOrderModal=W.openNewOrderModal;
      return true;
    }
    return false;
  };
  let tries=0;
  const timer=setInterval(()=>{if(expose()||++tries>=40)clearInterval(timer)},250);
  if(document.readyState!=='loading') expose();
  else document.addEventListener('DOMContentLoaded',expose,{once:true});
})();
