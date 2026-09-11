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
/* category-module-ready-7 */

/* VENTARA POS - Ticket POS: vista previa + impresión automática */
(()=>{
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
  function ticketHtml(s){
    const logo=db.settings.logo||VENTARA_LOGO;
    const rows=(s.items||[]).map(i=>`<div class="r"><span>${esc(i.qty)} x ${esc(i.name)}</span><span>${money(i.qty*i.price)}</span></div>`).join('');
    return `<html><head><meta charset="utf-8"><title>${esc(s.number)}</title><style>@page{size:80mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}body{font-family:'Courier New',monospace;font-size:12px;color:#000}.toolbar{position:sticky;top:0;background:#eef2f7;padding:10px;text-align:center;font-family:Arial,sans-serif;display:flex;gap:8px;justify-content:center}.toolbar button{padding:9px 13px;border:0;border-radius:7px;font-weight:700;cursor:pointer}.toolbar .primary{background:#009fe3;color:#fff}.ticket80{width:80mm;box-sizing:border-box;padding:3mm;margin:0 auto}.c{text-align:center}.r{display:flex;justify-content:space-between;gap:5px}.r span:first-child{max-width:55mm;word-break:break-word}.hr{border-top:1px dashed #000;margin:6px 0}img{max-width:48mm;max-height:22mm;object-fit:contain}h2{font-size:17px;margin:4px 0}@media print{.toolbar{display:none!important}body{width:80mm}.ticket80{margin:0}}</style></head><body><div class="toolbar"><button class="primary" onclick="doPrint()">🖨 Imprimir ticket</button><button onclick="window.close()">Cerrar</button></div><div class="ticket80"><div class="c"><img src="${logo}"><h2>${esc(db.settings.business||'VENTARA POS')}</h2><div>${esc(db.settings.nit||'')}</div><div>${esc(db.settings.city||'')}</div><div>${esc(db.settings.phone||'')}</div></div><div class="hr"></div><div><b>FACTURA POS ${esc(s.number)}</b><br>${esc(s.date)} ${esc(s.time)}<br>Cliente: ${esc(clientName(s.clientId))}</div><div class="hr"></div>${rows}<div class="hr"></div><div class="r"><b>TOTAL</b><b>${money(s.total)}</b></div><div class="r"><span>Medio de pago</span><span>${esc(s.method)}</span></div>${s.method==='Crédito'?`<div class="r"><span>Plazo</span><span>${db.clients.find(c=>c.id===s.clientId)?.creditDays||0} días</span></div>`:''}<div class="hr"></div><div class="c">Gracias por su compra<br>VENTARA POS</div></div><script>window.doPrint=function(){window.focus();window.print()}</script></body></html>`;
  }
  function waitForLoadAndPrint(w){
    if(!w||w.closed)return;
    const run=()=>setTimeout(()=>{try{w.focus();w.print()}catch(e){console.warn('No se pudo abrir impresión',e)}},300);
    try{if(w.document.readyState==='complete')run();else w.addEventListener('load',run,{once:true})}catch(e){setTimeout(run,500)}
  }
  window.offerTicket=function(id){
    if(!window.db)return;
    const s=db.sales.find(x=>x.id===id);if(!s)return;
    openModal(`<h2>✓ Venta registrada</h2><p>La venta se registró correctamente.</p><div class="ticket-preview"><b>${esc(s.number)}</b><br>Total: ${money(s.total)}<br>Pago: ${esc(s.method)}</div><div class="actions" style="margin-top:15px"><button class="btn" onclick="closeModal()">Cerrar</button><button class="btn" onclick="printTicket('${id}',false)">👁 Ver ticket POS</button><button class="btn primary" onclick="printTicket('${id}',true)">🖨 Imprimir ahora</button></div>`);
  };
  window.printTicket=function(id,autoPrint=false){
    if(!window.db)return;
    const s=db.sales.find(x=>x.id===id);if(!s)return;
    const w=window.open('','_blank','width=460,height=850');
    if(!w)return toast('El navegador bloqueó la ventana del ticket. Permite ventanas emergentes para VENTARA POS.');
    try{
      w.document.open();
      w.document.write(ticketHtml(s));
      w.document.close();
      if(autoPrint)waitForLoadAndPrint(w);
    }catch(e){try{w.close()}catch(_){};toast('No se pudo preparar el ticket')}
  };
  /* Compatibilidad con el flujo anterior: no se crea una ventana "Preparando ticket".
     finishSale ya llama printTicket(sale.id,true) dentro del clic del cajero. */
})();

/* Atajo seguro: Ctrl+Shift+P */
document.addEventListener('keydown',function(e){
  if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){
    e.preventDefault();
    const last=window.db?.sales?.[0];
    if(last)window.printTicket(last.id,true); else toast('No hay una venta reciente para imprimir');
  }
});
/* auto-ticket-flow-ready-4 */
