/* VENTARA POS - Gestión de categorías de artículos */
(()=>{
  function getDb(){try{return window.db||db||null}catch(e){return window.db||null}}
  function safeSave(){try{if(typeof window.save==='function')window.save();else if(typeof save==='function')save();return true}catch(e){console.warn('VENTARA categorías: no se pudo guardar',e);return false}}
  function safeToast(msg){try{if(typeof window.toast==='function')window.toast(msg);else if(typeof toast==='function')toast(msg)}catch(e){console.warn(msg)}}
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')}
  function ensureCategories(){
    const d=getDb();if(!d)return false;
    d.categories=Array.isArray(d.categories)?d.categories:[];
    const existing=new Set(d.categories.map(x=>String(x).trim()).filter(Boolean));
    (d.products||[]).forEach(p=>{const c=String(p.category||'').trim();if(c)existing.add(c)});
    if(!existing.size)existing.add('General');
    d.categories=[...existing];return true;
  }
  function renderCategoriesModal(message=''){
    const d=getDb();if(!d||typeof window.openModal!=='function')return false;ensureCategories();
    const rows=(d.categories||[]).map((c,i)=>{const count=(d.products||[]).filter(p=>String(p.category||'').trim()===c).length;return `<tr><td><b>${esc(c)}</b></td><td>${count}</td><td><button class="btn sm danger" onclick="window.deleteCategory(${i})" ${count?'disabled title="Hay artículos usando esta categoría"':''}>Eliminar</button></td></tr>`}).join('');
    const tableHtml=typeof window.table==='function'?window.table(['Categoría','Artículos','Acción'],rows,'Aún no hay categorías'):`<table><thead><tr><th>Categoría</th><th>Artículos</th><th>Acción</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Aún no hay categorías</td></tr>'}</tbody></table>`;
    window.openModal(`<h2>📂 Categorías</h2><p class="muted">Crea y administra las categorías que aparecerán al crear o editar un artículo.</p><div class="form" style="margin-bottom:15px"><div class="field"><label>Nueva categoría</label><input id="newCategoryName" placeholder="Ej. Abarrotes" onkeydown="if(event.key==='Enter')window.createCategory()"></div><div class="field" style="align-self:end"><button class="btn primary" onclick="window.createCategory()">+ Crear categoría</button></div></div>${message?`<div class="badge green" style="margin-bottom:12px">${esc(message)}</div>`:''}<div class="card" style="box-shadow:none;background:#f8fafc">${tableHtml}</div><div class="actions" style="margin-top:15px"><button class="btn" onclick="window.closeModal()">Cerrar</button></div>`);return true;
  }
  window.openCategoriesModal=function(){if(!ensureCategories()){safeToast('Los datos todavía no están listos');return}renderCategoriesModal()};
  window.createCategory=function(){
    const d=getDb();if(!d){safeToast('Los datos todavía no están listos');return}ensureCategories();
    const input=document.getElementById('newCategoryName');const name=(input?.value||'').trim().replace(/\s+/g,' ');
    if(!name){safeToast('Escribe el nombre de la categoría');input?.focus();return}
    if(name.length>60){safeToast('La categoría no puede superar 60 caracteres');return}
    if((d.categories||[]).some(c=>String(c).toLowerCase()===name.toLowerCase())){safeToast('Esa categoría ya existe');return}
    d.categories.push(name);safeSave();renderCategoriesModal('Categoría creada correctamente');setTimeout(populateCategorySelect,0);
  };
  window.deleteCategory=function(index){
    const d=getDb();if(!d)return;ensureCategories();const name=d.categories[index];if(!name)return;
    const used=(d.products||[]).some(p=>String(p.category||'').trim()===name);if(used){safeToast('No puedes eliminar una categoría que tiene artículos asignados');return}
    if(!window.confirm(`¿Eliminar la categoría "${name}"?`))return;d.categories.splice(index,1);if(!d.categories.length)d.categories.push('General');safeSave();renderCategoriesModal('Categoría eliminada');setTimeout(populateCategorySelect,0);
  };
  function populateCategorySelect(){
    const d=getDb();const field=document.getElementById('f_cat');if(!d||!field)return false;ensureCategories();
    const current=String(field.value||'');let select=field;
    // Importante: si el formulario ya trae un SELECT vacío, hay que llenarlo. La versión anterior salía aquí y dejaba el selector sin opciones.
    if(field.tagName!=='SELECT'){select=document.createElement('select');select.id='f_cat';select.name=field.name||'category';select.className=field.className||'';field.replaceWith(select)}
    const categories=d.categories||['General'];select.innerHTML=categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if(categories.includes(current))select.value=current;else if(categories.includes('General'))select.value='General';return true;
  }
  function initCategories(){if(!ensureCategories())return false;safeSave();populateCategorySelect();return true}
  let tries=0;const bootTimer=setInterval(()=>{tries++;initCategories();populateCategorySelect();if(tries>=80)clearInterval(bootTimer)},250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCategories,{once:true});else setTimeout(initCategories,0);
  new MutationObserver(()=>populateCategorySelect()).observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>populateCategorySelect(),500);
  if(typeof window.log!=='function')window.log=function(action,detail=''){try{const d=getDb();if(!d)return;d.activityLog=Array.isArray(d.activityLog)?d.activityLog:[];d.activityLog.unshift({id:'a_'+Date.now(),date:new Date().toISOString(),action:String(action||''),detail:String(detail||''),user:window.currentUser?.name||'Administrador'});if(d.activityLog.length>500)d.activityLog.length=500}catch(e){console.warn(e)}};
})();
/* category-module-ready-9 */

/* VENTARA POS - Ticket POS único: vista previa + impresión automática */
(()=>{
  let pendingWindow=null,pendingSalesCount=0,pendingStartedAt=0,pendingTimer=null;
  function getDb(){try{return db}catch(e){return window.db||null}}
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')}
  function moneySafe(v){try{return typeof money==='function'?money(v):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}}
  function ticketHtml(s){
    const d=getDb();if(!d||!s)return '<html><body><h3>Ticket no disponible</h3></body></html>';
    const st=d.settings||{},logo=st.logo||window.VENTARA_LOGO||'';
    const client=typeof clientName==='function'?clientName(s.clientId):((d.clients||[]).find(x=>x.id===s.clientId)?.name||'Consumidor final');
    const items=(s.items||[]).map(i=>`<div class="row"><span>${esc(i.qty)} x ${esc(i.name)}</span><span>${moneySafe(i.qty*i.price)}</span></div>`).join('');
    const discount=Number(s.discount||0),subtotal=(s.items||[]).reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0),cashier=s.cashier||d.users?.find(u=>u.id===s.userId)?.name||'';
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.number||'Ticket POS')}</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{width:80mm;font-family:"Courier New",monospace;font-size:12px;line-height:1.25}.toolbar{position:sticky;top:0;z-index:5;background:#eef2f7;padding:9px;display:flex;gap:7px;justify-content:center;font-family:Arial,sans-serif}.toolbar button{border:0;border-radius:6px;padding:8px 12px;font-weight:700;cursor:pointer}.toolbar .primary{background:#009fe3;color:#fff}.ticket{width:80mm;padding:3.5mm;margin:0 auto}.center{text-align:center}.logo{display:block;max-width:48mm;max-height:22mm;margin:0 auto 3mm;object-fit:contain}.business{font-size:16px;font-weight:900;margin:1mm 0}.legal{font-size:11px}.sep{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between;gap:5px;margin:2px 0}.row span:first-child{max-width:54mm;word-break:break-word}.total{font-size:15px;font-weight:900}.small{font-size:10px}@media print{.toolbar{display:none!important}body{width:80mm}.ticket{margin:0;padding:3mm}}</style></head><body><div class="toolbar"><button class="primary" onclick="window.focus();window.print()">🖨 Imprimir ticket</button><button onclick="window.close()">Cerrar</button></div><div class="ticket"><div class="center">${logo?`<img class="logo" src="${esc(logo)}" alt="Logo">`:''}<div class="business">${esc(st.business||'VENTARA POS')}</div>${st.legal?`<div class="legal">${esc(st.legal)}</div>`:''}${st.nit?`<div>NIT / ID: ${esc(st.nit)}</div>`:''}${st.type?`<div>${esc(st.type)}</div>`:''}${st.tax?`<div>${esc(st.tax)}</div>`:''}${st.city?`<div>${esc(st.city)}</div>`:''}${st.phone?`<div>Tel: ${esc(st.phone)}</div>`:''}${st.email?`<div>${esc(st.email)}</div>`:''}</div><div class="sep"></div><div><b>FACTURA POS ${esc(s.number||'')}</b><br>Fecha: ${esc(s.date||'')} ${esc(s.time||'')}<br>Cliente: ${esc(client)}${s.clientDoc?`<br>Documento: ${esc(s.clientDoc)}`:''}${cashier?`<br>Cajero: ${esc(cashier)}`:''}</div><div class="sep"></div>${items||'<div>Sin productos</div>'}<div class="sep"></div><div class="row"><span>Subtotal</span><span>${moneySafe(subtotal)}</span></div>${discount>0?`<div class="row"><span>Descuento</span><span>${moneySafe(discount)}</span></div>`:''}<div class="row total"><span>TOTAL</span><span>${moneySafe(s.total)}</span></div><div class="row"><span>Medio de pago</span><span>${esc(s.method||'')}</span></div>${s.method==='Crédito'?`<div class="row"><span>Plazo</span><span>${esc((d.clients||[]).find(c=>c.id===s.clientId)?.creditDays||0)} días</span>`:''}<div class="sep"></div><div class="center">Gracias por su compra<br><b>${esc(st.business||'VENTARA POS')}</b><br><span class="small">Documento generado por VENTARA POS</span></div></div><script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print()}catch(e){}},350)});</script></body></html>`;
  }
  function writeTicket(w,s,autoPrint=true){if(!w||w.closed||!s)return false;try{w.document.open();w.document.write(ticketHtml(s));w.document.close();if(autoPrint)setTimeout(()=>{try{if(!w.closed){w.focus();w.print()}}catch(e){}},700);return true}catch(e){console.warn('VENTARA ticket:',e);return false}}
  function showPreparing(w){try{w.document.open();w.document.write('<!doctype html><html><head><title>VENTARA POS</title></head><body style="font-family:Arial,sans-serif;padding:35px;text-align:center"><h2>Preparando ticket...</h2><p>La venta se está registrando.</p></body></html>');w.document.close()}catch(e){}}
  function clearPending(){if(pendingTimer)clearInterval(pendingTimer);pendingTimer=null;pendingStartedAt=0}
  function getLatestSale(){const d=getDb(),sales=d?.sales;if(!Array.isArray(sales)||!sales.length)return null;return sales[0]}
  function finishPending(){if(!pendingWindow||pendingWindow.closed)return false;const d=getDb();if(!d||!Array.isArray(d.sales)||!d.sales.length)return false;const sale=d.sales[0];if(d.sales.length<=pendingSalesCount&&Date.now()-pendingStartedAt<2500)return false;const w=pendingWindow;pendingWindow=null;clearPending();writeTicket(w,sale,true);return true}
  function beginPending(){if(pendingWindow&&!pendingWindow.closed)return;const d=getDb();pendingSalesCount=Array.isArray(d?.sales)?d.sales.length:0;pendingStartedAt=Date.now();try{pendingWindow=window.open('about:blank','_blank','width=460,height=850')}catch(e){pendingWindow=null}if(!pendingWindow){safeToast('El navegador bloqueó el ticket. Permite ventanas emergentes para VENTARA POS.');return}showPreparing(pendingWindow);pendingTimer=setInterval(()=>{if(!pendingWindow||pendingWindow.closed){clearPending();pendingWindow=null;return}if(finishPending())return;if(Date.now()-pendingStartedAt>20000){clearPending();try{pendingWindow.close()}catch(e){}pendingWindow=null}},120)}
  function isConfirmButton(b){if(!b||b.tagName!=='BUTTON')return false;const t=(b.innerText||b.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();return t.includes('CONFIRMAR')&&t.includes('REGISTRAR')&&t.includes('VENTA')}
  document.addEventListener('click',function(e){const b=e.target?.closest?.('button');if(isConfirmButton(b))beginPending()},true);
  window.printTicket=function(id,autoPrint=true){const d=getDb();if(!d)return;const s=(d.sales||[]).find(x=>x.id===id);if(!s)return safeToast('No se encontró la venta');if(pendingWindow&&!pendingWindow.closed){const w=pendingWindow;pendingWindow=null;clearPending();if(writeTicket(w,s,true))return}const w=window.open('about:blank','_blank','width=460,height=850');if(!w)return safeToast('El navegador bloqueó la ventana del ticket. Permite ventanas emergentes para VENTARA POS.');writeTicket(w,s,autoPrint)};
  window.offerTicket=function(id){const d=getDb();if(!d)return;const s=(d.sales||[]).find(x=>x.id===id);if(!s)return;window.printTicket(id,true)};
  document.addEventListener('keydown',function(e){if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();const last=getLatestSale();if(last)window.printTicket(last.id,true);else safeToast('No hay una venta reciente para imprimir')}});
})();
/* ticket-flow-final-3 */
