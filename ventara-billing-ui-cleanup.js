/* VENTARA POS — limpieza visual de Facturación. Solo oculta el acceso directo a Categorías. */
(()=>{
  'use strict';
  const MARK='data-ventara-billing-categories-hidden';
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLowerCase();
  function hide(){try{
    const pos=document.getElementById('pos');
    if(!pos)return false;
    const candidates=pos.querySelectorAll('button,a,.nav,[role="button"]');
    let found=false;
    candidates.forEach(el=>{try{
      if(el.hasAttribute(MARK))return;
      const t=norm(el.innerText||el.textContent||'');
      if(t!=='categorías'&&t!=='categorias'&&!t.startsWith('📂 categorías'))return;
      if(el.closest('#products'))return;
      el.setAttribute(MARK,'true');
      el.style.setProperty('display','none','important');
      found=true;
    }catch(e){console.warn('[VENTARA] ocultar Categorías',e)}});
    return found;
  }catch(e){console.warn('[VENTARA] billing UI cleanup',e);return false}}
  function boot(){try{hide();const pos=document.getElementById('pos');if(!pos||pos._ventaraBillingCleanup)return;if(typeof MutationObserver==='function'){const mo=new MutationObserver(()=>{try{hide()}catch(e){console.warn('[VENTARA] billing observer',e)}});mo.observe(pos,{childList:true,subtree:true});pos._ventaraBillingCleanup=mo}}catch(e){console.warn('[VENTARA] billing cleanup boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
  [800,1600,3000,5000].forEach(ms=>setTimeout(()=>{try{hide();boot()}catch(e){console.warn('[VENTARA] billing cleanup deferred',e)}},ms));
})();
