/* VENTARA — filtro visual de Ventas. No modifica db.sales. */
(()=>{
'use strict';
const MARK='data-ventara-sales-filter',EMPTY='data-ventara-sales-empty';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const root=()=>document.getElementById('sales');
const getSales=()=>{try{if(typeof window.scopedSales==='function')return window.scopedSales()||[]}catch(e){}try{return Array.isArray(window.db?.sales)?window.db.sales:[]}catch(e){return[]}};
const getClients=()=>Array.isArray(window.db?.clients)?window.db.clients:[];
const getClient=s=>{const id=s?.clientId??s?.customerId??s?.clienteId;if(id!=null){const c=getClients().find(x=>String(x?.id)===String(id));if(c)return c}const n=norm(s?.clientName??s?.client??s?.cliente);return getClients().find(c=>n&&[c?.name,c?.fullName,c?.nombre,c?.businessName,c?.razonSocial,c?.razon_social].some(v=>norm(v)===n))||{}};
const text=s=>{const c=getClient(s);return [s?.number,s?.invoiceNumber,s?.factura,s?.id,s?.clientId,s?.customerId,s?.clientName,s?.client,s?.cliente,c?.name,c?.fullName,c?.nombre,c?.businessName,c?.razonSocial,c?.razon_social,c?.doc,c?.identification,c?.nit,c?.document,c?.documento,c?.taxId].map(norm).join(' ')};
const date=s=>norm(s?.date??s?.fecha??s?.createdAt??s?.created_at).slice(0,10);
const status=s=>norm(s?.status??s?.estado);
function matches(s,q,d,st){return(!q||text(s).includes(norm(q)))&&(!d||date(s)===d)&&(!st||st==='todos'||status(s)===st)}
function install(r){
  let b=r.querySelector(`[${MARK}]`);
  if(!b){
    b=document.createElement('div');b.setAttribute(MARK,'1');
    b.style.cssText='display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:0 0 12px;padding:12px;border:1px solid #ddd;border-radius:8px';
    b.innerHTML='<label style="flex:1;min-width:220px"><span>Buscar</span><input type="search" data-vsf-q placeholder="Factura, cédula, NIT o cliente" style="display:block;width:100%;box-sizing:border-box"></label><label><span>Fecha</span><input type="date" data-vsf-date style="display:block"></label><label><span>Estado</span><select data-vsf-status style="display:block"><option value="todos">Todos</option><option value="pagada">Pagada</option><option value="credito">Crédito</option><option value="devuelta">Devuelta</option></select></label><button type="button" data-vsf-clear class="btn sm">Limpiar Filtros</button>';
    const table=r.querySelector('table');
    if(table&&table.parentNode)table.parentNode.insertBefore(b,table);else r.insertBefore(b,r.firstChild);
    const f=()=>filter(r);
    b.querySelector('[data-vsf-q]').oninput=f;b.querySelector('[data-vsf-date]').oninput=f;b.querySelector('[data-vsf-status]').onchange=f;
    b.querySelector('[data-vsf-clear]').onclick=()=>{b.querySelector('[data-vsf-q]').value='';b.querySelector('[data-vsf-date]').value='';b.querySelector('[data-vsf-status]').value='todos';f()};
  }
  filter(r);
}
function filter(r){
  const b=r.querySelector(`[${MARK}]`),t=r.querySelector('table'),body=t?.querySelector('tbody');if(!b||!t||!body)return;
  const q=b.querySelector('[data-vsf-q]')?.value||'',d=b.querySelector('[data-vsf-date]')?.value||'',st=b.querySelector('[data-vsf-status]')?.value||'todos';
  const all=getSales();let shown=0;
  const rows=[...body.querySelectorAll('tr')].filter(x=>!x.hasAttribute(EMPTY));
  rows.forEach((tr,i)=>{
    const cells=norm(tr.innerText||'');
    const s=all[i]||all.find(x=>{const key=norm(x?.number??x?.invoiceNumber??x?.factura??x?.id);return key&&cells.includes(key)});
    const ok=s?matches(s,q,d,st):(!q&&!d&&st==='todos');
    tr.style.display=ok?'':'none';if(ok)shown++;
  });
  let e=body.querySelector(`[${EMPTY}]`);
  if(!e){e=document.createElement('tr');e.setAttribute(EMPTY,'1');e.innerHTML='<td colspan="20" style="text-align:center;padding:14px">No hay ventas que coincidan con los filtros.</td>';body.appendChild(e)}
  e.style.display=shown?'none':'';
}
let wrapped=null;
function boot(){
  const r=root();if(!r)return;
  if(typeof window.renderSales==='function'&&window.renderSales!==wrapped){
    const fn=window.renderSales;
    const w=function(){const out=fn.apply(this,arguments);setTimeout(()=>{const x=root();if(x)install(x)},0);setTimeout(()=>{const x=root();if(x)install(x)},100);return out};
    w.__ventaraSalesFilter=true;wrapped=w;window.renderSales=w;
  }
  install(r);
}
new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
setInterval(boot,500);boot();
})();
