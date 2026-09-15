/* VENTARA POS - Filtro visual quirúrgico de Clientes. No modifica db.clients ni acciones. */
(()=>{
  'use strict';
  const ROOT_ID='clients', SEARCH_ATTR='data-vcp-search', COUNT_ATTR='data-vcp-count';
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const text=v=>norm(v);
  const db=()=>window.db&&typeof window.db==='object'?window.db:null;
  const clients=()=>Array.isArray(db()?.clients)?db().clients:[];
  const fields=c=>[c?.name,c?.fullName,c?.nombre,c?.businessName,c?.razonSocial,c?.razon_social,c?.commercialName,c?.legalName,c?.doc,c?.identification,c?.identificacion,c?.nit,c?.taxId,c?.taxNumber,c?.document,c?.documento,c?.phone,c?.telephone,c?.telefono,c?.mobile,c?.celular,c?.phoneNumber,c?.email,c?.correo,c?.correoElectronico,c?.emailAddress].map(text).filter(Boolean).join(' ');
  const findClient=row=>{
    const all=clients(); const rt=norm(row?.innerText||'');
    return all.find(c=>{
      const ids=[c?.id,c?.doc,c?.identification,c?.identificacion,c?.nit,c?.taxId,c?.taxNumber,c?.document,c?.documento].map(text).filter(Boolean);
      const name=[c?.name,c?.fullName,c?.nombre,c?.businessName,c?.razonSocial,c?.razon_social,c?.commercialName,c?.legalName].map(text).filter(Boolean);
      return ids.some(x=>x&&rt.includes(x))||name.some(x=>x&&rt.includes(x));
    });
  };
  function install(){
    const root=document.getElementById(ROOT_ID); if(!root)return false;
    if(!root.querySelector(`[${SEARCH_ATTR}]`)){
      const bar=document.createElement('div'); bar.setAttribute('data-ventara-client-filter','');
      bar.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px';
      bar.innerHTML='<input type="search" '+SEARCH_ATTR+' placeholder="Buscar cliente, cédula/NIT, teléfono o correo…" autocomplete="off" style="flex:1;min-width:260px;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px"><span '+COUNT_ATTR+' style="font-size:13px;color:#64748b"></span>';
      root.insertBefore(bar,root.firstChild);
      bar.querySelector(`[${SEARCH_ATTR}]`).addEventListener('input',apply);
    }
    apply(); return true;
  }
  function apply(){
    const root=document.getElementById(ROOT_ID); if(!root)return;
    const input=root.querySelector(`[${SEARCH_ATTR}]`); if(!input)return;
    const q=text(input.value); const rows=[...root.querySelectorAll('table tbody tr')]; let visible=0;
    const all=clients();
    rows.forEach((row,i)=>{
      if(row.querySelector('td[colspan]'))return;
      const c=all[i]||findClient(row); const hay=c?fields(c):text(row.innerText||'');
      const ok=!q||hay.includes(q); row.style.display=ok?'':'none'; if(ok)visible++;
    });
    const count=root.querySelector(`[${COUNT_ATTR}]`); if(count)count.textContent=`${visible} resultado${visible===1?'':'s'}`;
  }
  let wrapped=false;
  function boot(){
    install();
    if(!wrapped&&typeof window.renderClients==='function'){
      const original=window.renderClients;
      window.renderClients=function(){const r=original.apply(this,arguments);setTimeout(install,0);setTimeout(apply,80);return r}; wrapped=true;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  new MutationObserver(()=>{if(document.getElementById(ROOT_ID))boot()}).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(document.getElementById(ROOT_ID))boot()},1000);
})();
