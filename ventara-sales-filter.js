/* VENTARA POS - Filtro y buscador quirúrgico del módulo Ventas.
   Solo modifica la representación visual de #sales.
   No modifica index.html, db.sales ni el flujo de facturación. */
(()=>{
  'use strict';

  const MARK='data-ventara-sales-filter';
  let applying=false;
  let observer=null;
  let lastRenderedSignature='';

  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const dateValue=v=>String(v??'').slice(0,10);

  function sales(){
    try{
      if(typeof window.scopedSales==='function'){
        const list=window.scopedSales();
        return Array.isArray(list)?list:[];
      }
    }catch(e){console.warn('[VENTARA] filtro ventas: scopedSales',e)}
    return Array.isArray(window.db?.sales)?window.db.sales:[];
  }

  function clients(){
    return Array.isArray(window.db?.clients)?window.db.clients:[];
  }

  function clientFor(s){
    const id=String(s?.clientId??s?.customerId??s?.client_id??s?.customer_id??'');
    const list=clients();
    return list.find(c=>String(c?.id??'')===id)||null;
  }

  function clientData(s){
    const c=clientFor(s)||{};
    return {
      name:c.name??c.fullName??c.nombre??s?.clientName??s?.customerName??'',
      doc:c.doc??c.identification??c.nit??c.document??c.documento??s?.clientDoc??s?.customerDoc??s?.identification??s?.nit??''
    };
  }

  function matchesSearch(s,term){
    if(!term)return true;
    const c=clientData(s);
    const q=normalize(term);
    return [s?.number,s?.invoiceNumber,s?.invoice,s?.id,c.name,c.doc,s?.clientId,s?.customerId]
      .some(v=>normalize(v).includes(q));
  }

  function filteredSales(){
    const input=document.getElementById('ventaraSalesSearch');
    const from=document.getElementById('ventaraSalesFrom')?.value||'';
    const to=document.getElementById('ventaraSalesTo')?.value||'';
    const term=input?.value?.trim()||'';
    let list=sales();
    if(term)list=list.filter(s=>matchesSearch(s,term));
    if(from)list=list.filter(s=>dateValue(s?.date)>=from);
    if(to)list=list.filter(s=>dateValue(s?.date)<=to);
    return list;
  }

  function row(s){
    return `<tr><td>${esc(s?.number)}</td><td>${esc(s?.date)} ${esc(s?.time)}</td><td>${esc(clientData(s).name||'Consumidor final')}</td><td>${typeof window.money==='function'?window.money(s?.total):'$ '+Number(s?.total||0).toLocaleString('es-CO')}</td><td>${esc(s?.method)}</td><td><span class="badge ${s?.status==='Anulado'?'red':'green'}">${esc(s?.status)}</span></td><td><button class="btn sm" onclick="viewSale('${esc(s?.id)}')">Ver</button> <button class="btn sm" onclick="returnSale('${esc(s?.id)}')">Devolver</button></td></tr>`;
  }

  function tableBody(){
    const root=document.getElementById('sales');
    if(!root)return null;
    return root.querySelector('table tbody');
  }

  function applyRows(){
    if(applying)return;
    const body=tableBody();
    if(!body)return;
    const list=filteredSales();
    applying=true;
    try{
      body.innerHTML=list.map(row).join('')||'<tr><td colspan="7" class="empty">No hay ventas que coincidan con los filtros.</td></tr>';
      const count=document.getElementById('ventaraSalesCount');
      if(count)count.textContent=`${list.length} venta${list.length===1?'':'s'} encontrada${list.length===1?'':'s'}`;
    }finally{
      applying=false;
    }
  }

  function injectBar(){
    const root=document.getElementById('sales');
    if(!root||!root.querySelector('table'))return false;
    if(root.querySelector(`[${MARK}]`)){applyRows();return true;}

    const card=root.querySelector('.card');
    if(!card)return false;

    const bar=document.createElement('div');
    bar.setAttribute(MARK,'1');
    bar.style.cssText='margin-bottom:16px;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#f8fafc';
    bar.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div><b>🔎 Buscar ventas</b><div class="muted" style="margin-top:3px">Factura, cédula/NIT o nombre del cliente</div></div>
        <span id="ventaraSalesCount" class="muted"></span>
      </div>
      <div style="display:grid;grid-template-columns:minmax(240px,2fr) minmax(150px,1fr) minmax(150px,1fr) auto;gap:10px;align-items:end">
        <div class="field" style="margin:0"><label>BUSCAR</label><input id="ventaraSalesSearch" type="search" autocomplete="off" placeholder="Ej. V-000068, 123456789, Juan Pérez"></div>
        <div class="field" style="margin:0"><label>DESDE</label><input id="ventaraSalesFrom" type="date"></div>
        <div class="field" style="margin:0"><label>HASTA</label><input id="ventaraSalesTo" type="date"></div>
        <button id="ventaraSalesClear" class="btn" type="button">Limpiar</button>
      </div>`;

    root.insertBefore(bar,card);
    const handler=()=>applyRows();
    document.getElementById('ventaraSalesSearch')?.addEventListener('input',handler);
    document.getElementById('ventaraSalesFrom')?.addEventListener('change',handler);
    document.getElementById('ventaraSalesTo')?.addEventListener('change',handler);
    document.getElementById('ventaraSalesClear')?.addEventListener('click',()=>{
      const q=document.getElementById('ventaraSalesSearch');
      const from=document.getElementById('ventaraSalesFrom');
      const to=document.getElementById('ventaraSalesTo');
      if(q)q.value='';
      if(from)from.value='';
      if(to)to.value='';
      applyRows();
    });
    applyRows();
    return true;
  }

  function signature(){
    const root=document.getElementById('sales');
    if(!root)return '';
    return `${root.innerHTML.includes(MARK)}|${root.querySelector('table tbody')?.childElementCount||0}|${sales().length}`;
  }

  function watch(){
    const root=document.getElementById('sales');
    if(!root)return;
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{
      if(applying)return;
      const sig=signature();
      if(sig===lastRenderedSignature)return;
      if(injectBar())lastRenderedSignature=signature();
    });
    observer.observe(root,{childList:true,subtree:true});
    if(injectBar())lastRenderedSignature=signature();
  }

  function boot(){
    watch();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(injectBar())lastRenderedSignature=signature();
      if(tries>=30)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
