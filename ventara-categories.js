/* VENTARA POS - Gestión de categorías de artículos */
(()=>{
  window.log=window.log||function(action,detail=''){
    try{
      if(!window.db)return;
      db.activityLog=Array.isArray(db.activityLog)?db.activityLog:[];
      db.activityLog.unshift({id:typeof uid==='function'?uid('a'):'a_'+Date.now(),date:new Date().toISOString(),action:String(action||''),detail:String(detail||''),user:window.currentUser?.name||'Administrador'});
      if(db.activityLog.length>500)db.activityLog.length=500;
    }catch(e){console.warn('No se pudo registrar actividad',e)}
  };
  function ensureCategories(){
    if(!window.db)return;
    db.categories=Array.isArray(db.categories)?db.categories:[];
    const existing=new Set(db.categories.map(x=>String(x).trim()).filter(Boolean));
    (db.products||[]).forEach(p=>{const c=String(p.category||'').trim();if(c)existing.add(c)});
    if(!existing.size)existing.add('General');
    db.categories=[...existing];
  }
  window.openCategoriesModal=function(){ensureCategories();renderCategoriesModal()};
  function renderCategoriesModal(message=''){
    ensureCategories();
    if(!window.db)return;
    const rows=db.categories.map((c,i)=>{const count=(db.products||[]).filter(p=>String(p.category||'').trim()===c).length;return `<tr><td><b>${escapeHtml(c)}</b></td><td>${count}</td><td><button class="btn sm danger" onclick="deleteCategory(${i})" ${count?'disabled title="Hay artículos usando esta categoría"':''}>Eliminar</button></td></tr>`}).join('');
    openModal(`<h2>📂 Categorías</h2><p class="muted">Crea y administra las categorías que aparecerán al crear o editar un artículo.</p><div class="form" style="margin-bottom:15px"><div class="field"><label>Nueva categoría</label><input id="newCategoryName" placeholder="Ej. Abarrotes" onkeydown="if(event.key==='Enter')createCategory()"></div><div class="field" style="align-self:end"><button class="btn primary" onclick="createCategory()">+ Crear categoría</button></div></div>${message?`<div class="badge green" style="margin-bottom:12px">${escapeHtml(message)}</div>`:''}<div class="card" style="box-shadow:none;background:#f8fafc">${table(['Categoría','Artículos','Acción'],rows,'Aún no hay categorías')}</div><div class="actions" style="margin-top:15px"><button class="btn" onclick="closeModal()">Cerrar</button></div>`);
  }
  window.createCategory=function(){ensureCategories();const name=(document.getElementById('newCategoryName')?.value||'').trim().replace(/\s+/g,' ');if(!window.db)return;if(!name)return toast('Escribe el nombre de la categoría');if(name.length>60)return toast('La categoría no puede superar 60 caracteres');if(db.categories.some(c=>c.toLowerCase()===name.toLowerCase()))return toast('Esa categoría ya existe');db.categories.push(name);save();renderCategoriesModal('Categoría creada correctamente')};
  window.deleteCategory=function(index){ensureCategories();if(!window.db)return;const name=db.categories[index];if(!name)return;const used=(db.products||[]).some(p=>String(p.category||'').trim()===name);if(used)return toast('No puedes eliminar una categoría que tiene artículos asignados');if(!confirm(`¿Eliminar la categoría "${name}"?`))return;db.categories.splice(index,1);if(!db.categories.length)db.categories.push('General');save();renderCategoriesModal('Categoría eliminada')};
  function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
  function patchProductModal(){const field=document.getElementById('f_cat');if(!field||field.tagName==='SELECT'||!window.db)return;ensureCategories();const current=field.value;const select=document.createElement('select');select.id='f_cat';select.innerHTML=db.categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');field.replaceWith(select);if(db.categories.includes(current))select.value=current}
  function initCategories(){if(!window.db)return;ensureCategories();try{save()}catch(e){console.warn('No se pudieron guardar las categorías iniciales',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCategories,{once:true});else setTimeout(initCategories,0);
  new MutationObserver(()=>patchProductModal()).observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>patchProductModal(),500);
})();
/* category-module-ready-8 */

/* VENTARA POS - Ticket POS único: vista previa + impresión automática */
(()=>{
  let pendingWindow=null;
  let pendingSalesCount=0;
  let pendingStartedAt=0;
  let pendingTimer=null;

  function getDb(){try{return db}catch(e){return window.db||null}}
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
  function moneySafe(v){try{return typeof money==='function'?money(v):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}}

  function ticketHtml(s){
    const d=getDb();
    if(!d||!s)return '<html><body><h3>Ticket no disponible</h3></body></html>';
    const st=d.settings||{};
    const logo=st.logo||window.VENTARA_LOGO||'';
    const client=typeof clientName==='function'?clientName(s.clientId):((d.clients||[]).find(c=>c.id===s.clientId)?.name||'Consumidor final');
    const items=(s.items||[]).map(i=>`<div class="row"><span>${esc(i.qty)} x ${esc(i.name)}</span><span>${moneySafe(i.qty*i.price)}</span></div>`).join('');
    const discount=Number(s.discount||0);
    const subtotal=(s.items||[]).reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0);
    const cashier=s.cashier||d.users?.find(u=>u.id===s.userId)?.name||'';
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.number||'Ticket POS')}</title><style>
@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{width:80mm;font-family:"Courier New",monospace;font-size:12px;line-height:1.25}.toolbar{position:sticky;top:0;z-index:5;background:#eef2f7;padding:9px;display:flex;gap:7px;justify-content:center;font-family:Arial,sans-serif}.toolbar button{border:0;border-radius:6px;padding:8px 12px;font-weight:700;cursor:pointer}.toolbar .primary{background:#009fe3;color:#fff}.ticket{width:80mm;padding:3.5mm;margin:0 auto}.center{text-align:center}.logo{display:block;max-width:48mm;max-height:22mm;margin:0 auto 3mm;object-fit:contain}.business{font-size:16px;font-weight:900;margin:1mm 0}.legal{font-size:11px}.sep{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between;gap:5px;margin:2px 0}.row span:first-child{max-width:54mm;word-break:break-word}.total{font-size:15px;font-weight:900}.small{font-size:10px}@media print{.toolbar{display:none!important}body{width:80mm}.ticket{margin:0;padding:3mm}}
</style></head><body>
<div class="toolbar"><button class="primary" onclick="window.focus();window.print()">🖨 Imprimir ticket</button><button onclick="window.close()">Cerrar</button></div>
<div class="ticket"><div class="center">${logo?`<img class="logo" src="${esc(logo)}" alt="Logo">`:''}<div class="business">${esc(st.business||'VENTARA POS')}</div>${st.legal?`<div class="legal">${esc(st.legal)}</div>`:''}${st.nit?`<div>NIT / ID: ${esc(st.nit)}</div>`:''}${st.type?`<div>${esc(st.type)}</div>`:''}${st.tax?`<div>${esc(st.tax)}</div>`:''}${st.city?`<div>${esc(st.city)}</div>`:''}${st.phone?`<div>Tel: ${esc(st.phone)}</div>`:''}${st.email?`<div>${esc(st.email)}</div>`:''}</div>
<div class="sep"></div><div><b>FACTURA POS ${esc(s.number||'')}</b><br>Fecha: ${esc(s.date||'')} ${esc(s.time||'')}<br>Cliente: ${esc(client)}${s.clientDoc?`<br>Documento: ${esc(s.clientDoc)}`:''}${cashier?`<br>Cajero: ${esc(cashier)}`:''}</div>
<div class="sep"></div>${items||'<div>Sin productos</div>'}<div class="sep"></div><div class="row"><span>Subtotal</span><span>${moneySafe(subtotal)}</span></div>${discount>0?`<div class="row"><span>Descuento</span><span>${moneySafe(discount)}</span></div>`:''}<div class="row total"><span>TOTAL</span><span>${moneySafe(s.total)}</span></div><div class="row"><span>Medio de pago</span><span>${esc(s.method||'')}</span></div>${s.method==='Crédito'?`<div class="row"><span>Plazo</span><span>${esc((d.clients||[]).find(c=>c.id===s.clientId)?.creditDays||0)} días</span></div>`:''}<div class="sep"></div><div class="center">Gracias por su compra<br><b>${esc(st.business||'VENTARA POS')}</b><br><span class="small">Documento generado por VENTARA POS</span></div></div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print()}catch(e){}},350)});</script></body></html>`;
  }

  function writeTicket(w,s,autoPrint=true){
    if(!w||w.closed||!s)return false;
    try{
      w.document.open();w.document.write(ticketHtml(s));w.document.close();
      if(autoPrint)setTimeout(()=>{try{if(!w.closed){w.focus();w.print()}}catch(e){}},700);
      return true;
    }catch(e){console.warn('VENTARA ticket:',e);return false}
  }
  function showPreparing(w){try{w.document.open();w.document.write('<!doctype html><html><head><title>VENTARA POS</title></head><body style="font-family:Arial,sans-serif;padding:35px;text-align:center"><h2>Preparando ticket...</h2><p>La venta se está registrando.</p></body></html>');w.document.close()}catch(e){}}
  function clearPending(){if(pendingTimer)clearInterval(pendingTimer);pendingTimer=null;pendingStartedAt=0}
  function getLatestSale(){const d=getDb();const sales=d?.sales;if(!Array.isArray(sales)||!sales.length)return null;return sales[0]}
  function finishPending(){
    if(!pendingWindow||pendingWindow.closed)return false;
    const d=getDb();if(!d||!Array.isArray(d.sales)||!d.sales.length)return false;
    const sale=d.sales[0];if(d.sales.length<=pendingSalesCount&&Date.now()-pendingStartedAt<2500)return false;
    const w=pendingWindow;pendingWindow=null;clearPending();writeTicket(w,sale,true);return true;
  }
  function beginPending(){
    if(pendingWindow&&!pendingWindow.closed)return;
    const d=getDb();pendingSalesCount=Array.isArray(d?.sales)?d.sales.length:0;pendingStartedAt=Date.now();
    try{pendingWindow=window.open('about:blank','_blank','width=460,height=850')}catch(e){pendingWindow=null}
    if(!pendingWindow){toast('El navegador bloqueó el ticket. Permite ventanas emergentes para VENTARA POS.');return}
    showPreparing(pendingWindow);
    pendingTimer=setInterval(()=>{if(!pendingWindow||pendingWindow.closed){clearPending();pendingWindow=null;return}if(finishPending())return;if(Date.now()-pendingStartedAt>20000){clearPending();try{pendingWindow.close()}catch(e){}pendingWindow=null}},120);
  }
  function isConfirmButton(b){if(!b||b.tagName!=='BUTTON')return false;const t=(b.innerText||b.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();return t.includes('CONFIRMAR')&&t.includes('REGISTRAR')&&t.includes('VENTA')}
  document.addEventListener('click',function(e){const b=e.target?.closest?.('button');if(isConfirmButton(b))beginPending()},true);

  window.printTicket=function(id,autoPrint=true){
    const d=getDb();if(!d)return;
    const s=(d.sales||[]).find(x=>x.id===id);if(!s)return toast('No se encontró la venta');
    if(pendingWindow&&!pendingWindow.closed){const w=pendingWindow;pendingWindow=null;clearPending();if(writeTicket(w,s,true))return}
    const w=window.open('about:blank','_blank','width=460,height=850');
    if(!w)return toast('El navegador bloqueó la ventana del ticket. Permite ventanas emergentes para VENTARA POS.');
    writeTicket(w,s,autoPrint);
  };
  window.offerTicket=function(id){const d=getDb();if(!d)return;const s=(d.sales||[]).find(x=>x.id===id);if(!s)return;window.printTicket(id,true)};
  document.addEventListener('keydown',function(e){if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();const last=getLatestSale();if(last)window.printTicket(last.id,true);else toast('No hay una venta reciente para imprimir')}});
})();
/* ticket-flow-final-2 */
