/* VENTARA POS - Filtro integral y quirúrgico del módulo Ventas.
   SOLO modifica la representación visual de #sales.
   No modifica index.html, db.sales, clientes ni el flujo de facturación. */
(()=>{
  'use strict';
  const MARK='data-ventara-sales-filter';
  const EMPTY='data-ventara-sales-empty';
  let wrapped=null;
  let observer=null;
  let busy=false;

  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const date=v=>String(v??'').slice(0,10);

  function getSales(){
    try{
      if(typeof window.scopedSales==='function'){
        const a=window.scopedSales();
        if(Array.isArray(a)) return a;
      }
    }catch(e){console.warn('[VENTARA] filtro ventas - scopedSales',e)}
    return Array.isArray(window.db?.sales)?window.db.sales:[];
  }
  function getClients(){return Array.isArray(window.db?.clients)?window.db.clients:[]}

  function getClient(s){
    const id=String(s?.clientId??s?.customerId??s?.client_id??s?.customer_id??'');
    if(id){const c=getClients().find(x=>String(x?.id??'')===id);if(c)return c}
    const n=norm(s?.clientName??s?.customerName??'');
    return n?getClients().find(c=>norm(c?.name??c?.fullName??c?.nombre??'')===n)||null:null;
  }
  function clientInfo(s){
    const c=getClient(s)||{};
    return {
      name:c.name??c.fullName??c.nombre??s?.clientName??s?.customerName??'',
      doc:c.doc??c.identification??c.nit??c.document??c.documento??s?.clientDoc??s?.customerDoc??s?.identification??s?.nit??''
    };
  }
  function saleDate(s){return date(s?.date??s?.createdAt??s?.created_at??s?.timestamp??'')}
  function saleStatus(s){return String(s?.status??s?.estado??'').trim().toLowerCase()}

  function matches(s,q,from,to,status){
    const c=clientInfo(s), term=norm(q), d=saleDate(s), st=saleStatus(s);
    const textOk=!term||[
      s?.number,s?.invoiceNumber,s?.invoice,s?.id,
      s?.clientId,s?.customerId,c.name,c.doc
    ].some(v=>norm(v).includes(term));
    const dateOk=(!from||d>=from)&&(!to||d<=to);
    const statusOk=!status||st===status.toLowerCase();
    return textOk&&dateOk&&statusOk;
  }

  function root(){return document.getElementById('sales')}

  function inject(rootEl){
    if(!rootEl)return null;
    const table=rootEl.querySelector('table');
    if(!table||!table.parentNode)return null;
    let bar=rootEl.querySelector(`[${MARK}]`);
    if(bar)return bar;
    bar=document.createElement('div');
    bar.setAttribute(MARK,'1');
    bar.style.cssText='margin:0 0 16px;padding:14px 16px;border:1px solid var(--border,#dbe3ea);border-radius:10px;background:#f8fafc';
    bar.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px"><div><b>🔎 Buscar ventas</b><div class="muted" style="margin-top:3px">Factura, cédula/NIT o nombre del cliente</div></div><span id="ventaraSalesCount" class="muted"></span></div><div style="display:grid;grid-template-columns:minmax(240px,2fr) minmax(140px,1fr) minmax(140px,1fr) minmax(140px,1fr) auto;gap:10px;align-items:end"><div class="field" style="margin:0"><label>BUSCAR</label><input id="ventaraSalesSearch" type="search" autocomplete="off" placeholder="Ej. V-000068, 123456789, Juan Pérez"></div><div class="field" style="margin:0"><label>DESDE</label><input id="ventaraSalesFrom" type="date"></div><div class="field" style="margin:0"><label>HASTA</label><input id="ventaraSalesTo" type="date"></div><div class="field" style="margin:0"><label>ESTADO</label><select id="ventaraSalesStatus"><option value="">Todos</option><option value="Pagada">Pagada</option><option value="Crédito">Crédito</option><option value="Devuelta">Devuelta</option></select></div><button id="ventaraSalesClear" class="btn" type="button">Limpiar Filtros</button></div>`;
    table.parentNode.insertBefore(bar,table);

    bar.querySelector('#ventaraSalesSearch')?.addEventListener('input',apply);
    bar.querySelector('#ventaraSalesFrom')?.addEventListener('change',apply);
    bar.querySelector('#ventaraSalesTo')?.addEventListener('change',apply);
    bar.querySelector('#ventaraSalesStatus')?.addEventListener('change',apply);
    bar.querySelector('#ventaraSalesClear')?.addEventListener('click',()=>{
      bar.querySelector('#ventaraSalesSearch').value='';
      bar.querySelector('#ventaraSalesFrom').value='';
      bar.querySelector('#ventaraSalesTo').value='';
      bar.querySelector('#ventaraSalesStatus').value='';
      apply();
    });
    return bar;
  }

  function apply(){
    if(busy)return;
    const r=root();
    if(!r)return;
    const table=r.querySelector('table'), body=table?.querySelector('tbody');
    if(!table||!body)return;
    const bar=inject(r);
    if(!bar)return;
    const q=bar.querySelector('#ventaraSalesSearch')?.value?.trim()||'';
    const from=bar.querySelector('#ventaraSalesFrom')?.value||'';
    const to=bar.querySelector('#ventaraSalesTo')?.value||'';
    const status=bar.querySelector('#ventaraSalesStatus')?.value||'';
    const list=getSales();
    const rows=Array.from(body.querySelectorAll('tr')).filter(tr=>!tr.hasAttribute(EMPTY));
    let visible=0;
    busy=true;
    try{
      rows.forEach((tr,i)=>{
        const show=!!list[i]&&matches(list[i],q,from,to,status);
        tr.style.display=show?'':'none';
        if(show)visible++;
      });
      let empty=body.querySelector(`[${EMPTY}]`);
      if(!visible){
        if(!empty){
          empty=document.createElement('tr');
          empty.setAttribute(EMPTY,'1');
          empty.innerHTML='<td colspan="7" class="empty">No se encontraron facturas con esos criterios</td>';
          body.appendChild(empty);
        }
        empty.style.display='';
      }else if(empty)empty.style.display='none';
      const count=bar.querySelector('#ventaraSalesCount');
      if(count)count.textContent=`${visible} factura${visible===1?'':'s'} encontrada${visible===1?'':'s'}`;
    }finally{busy=false}
  }

  function install(){
    const fn=window.renderSales;
    if(typeof fn!=='function'||fn===wrapped)return;
    const original=fn;
    const wrappedFn=function(){
      const result=original.apply(this,arguments);
      setTimeout(apply,0);
      setTimeout(apply,100);
      return result;
    };
    wrappedFn.__ventaraSalesFilter=true;
    wrapped=wrappedFn;
    window.renderSales=wrappedFn;
    setTimeout(apply,0);
  }

  function boot(){
    install();
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{
      if(busy)return;
      if(window.renderSales!==wrapped)install();
      const r=root();
      if(r?.querySelector('table'))setTimeout(apply,0);
    });
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    [250,750,1500,3000,5000].forEach(ms=>setTimeout(install,ms));
    setInterval(install,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
