/* VENTARA POS - Filtro y buscador quirúrgico del módulo Ventas.
   SOLO modifica la representación visual de #sales.
   No reconstruye filas ni botones y no modifica index.html, db.sales ni el flujo de facturación. */
(()=>{
  'use strict';
  const MARK='data-ventara-sales-filter';
  let rootObserver=null;
  let bodyObserver=null;
  let applying=false;
  const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const dateValue=v=>String(v??'').slice(0,10);
  function sales(){
    try{
      if(typeof window.scopedSales==='function'){
        const list=window.scopedSales();
        if(Array.isArray(list)) return list;
      }
    }catch(e){ console.warn('[VENTARA] filtro ventas: scopedSales',e); }
    return Array.isArray(window.db?.sales) ? window.db.sales : [];
  }
  function clients(){ return Array.isArray(window.db?.clients) ? window.db.clients : []; }
  function clientFor(s){
    const id=String(s?.clientId??s?.customerId??s?.client_id??s?.customer_id??'');
    if(id){ const found=clients().find(c=>String(c?.id??'')===id); if(found)return found; }
    const wanted=normalize(s?.clientName??s?.customerName??'');
    if(wanted)return clients().find(c=>normalize(c?.name??c?.fullName??c?.nombre??'')===wanted)||null;
    return null;
  }
  function clientData(s){
    const c=clientFor(s)||{};
    return {name:c.name??c.fullName??c.nombre??s?.clientName??s?.customerName??'',doc:c.doc??c.identification??c.nit??c.document??c.documento??s?.clientDoc??s?.customerDoc??s?.identification??s?.nit??''};
  }
  function saleDate(s){ return dateValue(s?.date??s?.createdAt??s?.created_at??s?.timestamp??''); }
  function saleMatches(s,term,from,to){
    const c=clientData(s), q=normalize(term), d=saleDate(s);
    const textOk=!q||[s?.number,s?.invoiceNumber,s?.invoice,s?.id,c.name,c.doc,s?.clientId,s?.customerId].some(v=>normalize(v).includes(q));
    return textOk&&(!from||(d&&d>=from))&&(!to||(d&&d<=to));
  }
  function findSalesRoot(){ return document.getElementById('sales'); }
  function ensureBar(root){
    if(!root||root.querySelector(`[${MARK}]`))return;
    const table=root.querySelector('table');
    if(!table||!table.parentNode)return;
    const bar=document.createElement('div');
    bar.setAttribute(MARK,'1');
    bar.style.cssText='margin:0 0 16px;padding:14px 16px;border:1px solid var(--border,#dbe3ea);border-radius:10px;background:#f8fafc';
    bar.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px"><div><b>🔎 Buscar ventas</b><div class="muted" style="margin-top:3px">Factura, cédula/NIT o nombre del cliente</div></div><span id="ventaraSalesCount" class="muted"></span></div><div style="display:grid;grid-template-columns:minmax(240px,2fr) minmax(150px,1fr) minmax(150px,1fr) auto;gap:10px;align-items:end"><div class="field" style="margin:0"><label>BUSCAR</label><input id="ventaraSalesSearch" type="search" autocomplete="off" placeholder="Ej. V-000068, 123456789, Juan Pérez"></div><div class="field" style="margin:0"><label>DESDE</label><input id="ventaraSalesFrom" type="date"></div><div class="field" style="margin:0"><label>HASTA</label><input id="ventaraSalesTo" type="date"></div><button id="ventaraSalesClear" class="btn" type="button">Limpiar</button></div>`;
    table.parentNode.insertBefore(bar,table);
    const handler=()=>applyFilter();
    document.getElementById('ventaraSalesSearch')?.addEventListener('input',handler);
    document.getElementById('ventaraSalesFrom')?.addEventListener('change',handler);
    document.getElementById('ventaraSalesTo')?.addEventListener('change',handler);
    document.getElementById('ventaraSalesClear')?.addEventListener('click',()=>{
      document.getElementById('ventaraSalesSearch').value='';
      document.getElementById('ventaraSalesFrom').value='';
      document.getElementById('ventaraSalesTo').value='';
      applyFilter();
    });
  }
  function applyFilter(){
    if(applying)return;
    const root=findSalesRoot(), table=root?.querySelector('table'), body=table?.querySelector('tbody');
    if(!root||!table||!body)return;
    ensureBar(root);
    const term=document.getElementById('ventaraSalesSearch')?.value?.trim()||'';
    const from=document.getElementById('ventaraSalesFrom')?.value||'';
    const to=document.getElementById('ventaraSalesTo')?.value||'';
    const list=sales(), rows=Array.from(body.querySelectorAll('tr'));
    let visible=0;
    applying=true;
    try{
      rows.forEach((tr,i)=>{ const sale=list[i]; const show=!!sale&&saleMatches(sale,term,from,to); tr.style.display=show?'':'none'; if(show)visible++; });
      let empty=body.querySelector('[data-ventara-sales-empty]');
      if(!visible&&list.length){
        if(!empty){ empty=document.createElement('tr'); empty.setAttribute('data-ventara-sales-empty','1'); empty.innerHTML='<td colspan="7" class="empty">No hay ventas que coincidan con los filtros.</td>'; body.appendChild(empty); }
        empty.style.display='';
      }else if(empty)empty.style.display='none';
      const count=document.getElementById('ventaraSalesCount');
      if(count)count.textContent=`${visible} venta${visible===1?'':'s'} encontrada${visible===1?'':'s'}`;
    }finally{ applying=false; }
  }
  function attach(){
    const root=findSalesRoot();
    if(!root)return;
    if(rootObserver)rootObserver.disconnect();
    rootObserver=new MutationObserver(()=>{
      if(applying)return;
      if(!root.querySelector(`[${MARK}]`)){ if(root.querySelector('table'))ensureBar(root); }
      applyFilter();
    });
    rootObserver.observe(root,{childList:true,subtree:true});
    applyFilter();
  }
  function boot(){
    attach();
    if(bodyObserver)bodyObserver.disconnect();
    bodyObserver=new MutationObserver(()=>{ const root=findSalesRoot(); if(root&&!rootObserver)attach(); else if(root&&!root.querySelector(`[${MARK}]`))applyFilter(); });
    if(document.body)bodyObserver.observe(document.body,{childList:true,subtree:true});
    [300,1000,2000,5000].forEach(ms=>setTimeout(attach,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
