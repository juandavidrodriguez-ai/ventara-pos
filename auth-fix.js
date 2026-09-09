/* VENTARA runtime guard + categorías + cartera/crédito
   Mantiene la navegación protegida y agrega únicamente las mejoras solicitadas. */
(function(){
  'use strict';

  function getRenderer(name){
    try { var fn=window[name]; return typeof fn==='function'?fn:null; } catch(e){ return null; }
  }

  function safeRender(page){
    var names={dashboard:'renderDashboard',pos:'renderPOS',sales:'renderSales',orders:'renderOrders',products:'renderProducts',inventory:'renderInventory',purchases:'renderPurchases',suppliers:'renderSuppliers',clients:'renderClients',receivables:'renderReceivables',quotes:'renderQuotes',cash:'renderCash',expenses:'renderExpenses',reports:'renderReports',users:'renderUsers',catalog:'renderCatalog',settings:'renderSettings'};
    var fn=getRenderer(names[page]);
    if(fn){try{return fn();}catch(e){console.error('VENTARA render error:',e);var el=document.getElementById(page);if(el)el.innerHTML='<div class="card" style="margin:20px"><h2>No se pudo cargar este módulo</h2><p class="muted">La sesión sigue activa, pero este módulo encontró un error. Revisa la consola para ver el detalle.</p><button class="btn primary" onclick="window.showPage && window.showPage(\'dashboard\')">Volver al inicio</button></div>';return;}}
    var el=document.getElementById(page);if(el)el.innerHTML='<div class="card" style="margin:20px"><h2>Módulo temporalmente no disponible</h2><p class="muted">El módulo <b>'+page+'</b> no está disponible en esta versión cargada. La navegación no se bloqueará.</p><button class="btn primary" onclick="window.showPage && window.showPage(\'dashboard\')">Volver al inicio</button></div>';
  }

  function patchNavigation(){
    if(typeof window.showPage==='function'&&!window.__ventaraShowPagePatched){
      var originalShowPage=window.showPage;
      window.showPage=function(page){try{if(window.currentUser&&typeof window.canAccess==='function'&&!window.canAccess(page)){if(typeof window.toast==='function')window.toast('Tu rol no tiene permiso para este módulo');return;}document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active')});var target=document.getElementById(page);if(target)target.classList.add('active');document.querySelectorAll('.nav').forEach(function(x){x.classList.toggle('active',x.dataset.page===page)});safeRender(page);}catch(e){console.error('VENTARA navigation error:',e);try{originalShowPage(page)}catch(_){}}};
      window.__ventaraShowPagePatched=true;
    }
  }
  function patchRender(){window.render=function(page){safeRender(page)};window.__ventaraSafeRender=true;}

  /* -------------------- CATEGORÍAS DE ARTÍCULOS -------------------- */
  function ensureCategories(){
    if(typeof db==='undefined')return;
    var found=[];
    (db.categories||[]).forEach(function(c){var n=typeof c==='string'?c:c?.name;if(n&&n.trim())found.push(n.trim())});
    (db.products||[]).forEach(function(p){if(p.category&&String(p.category).trim())found.push(String(p.category).trim())});
    found.push('General');
    db.categories=[...new Set(found)].sort(function(a,b){return a.localeCompare(b,'es')});
  }
  function categoryOptions(selected){
    ensureCategories();
    return db.categories.map(function(c){return '<option value="'+escapeHtml(c)+'" '+(c===selected?'selected':'')+'>'+escapeHtml(c)+'</option>'}).join('');
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]})}
  function modalRoot(){return document.getElementById('modalbox')||document.querySelector('.modalbox')}
  function isArticleModal(){var m=modalRoot();var t=(m?.innerText||'').toLowerCase();return t.includes('nuevo artículo')||t.includes('nuevo articulo')||t.includes('editar artículo')||t.includes('editar articulo')}

  var originalRenderProducts=null, originalOpenProductModal=null;
  function patchProductModal(){
    if(!originalOpenProductModal)originalOpenProductModal=window.openProductModal;
    if(typeof originalOpenProductModal!=='function'||window.__ventaraCategoryModalPatched)return;
    window.openProductModal=function(id){
      originalOpenProductModal(id||'');
      setTimeout(function(){
        if(!isArticleModal())return;
        ensureCategories();
        var input=document.getElementById('f_cat');
        if(!input||input.tagName==='SELECT')return;
        var field=input.closest('.field');
        var select=document.createElement('select');select.id='f_cat';select.name='f_cat';select.innerHTML=categoryOptions(input.value||'General');
        input.replaceWith(select);
        var hint=document.createElement('small');hint.className='muted';hint.textContent='Selecciona una categoría creada desde el botón “Categorías”.';
        field?.appendChild(hint);
      },20);
    };
    window.__ventaraCategoryModalPatched=true;
  }
  function renderProductsPatched(){
    ensureCategories();
    var el=document.getElementById('products');if(!el)return;
    var rows=(db.products||[]).map(function(p){return '<tr><td>'+(p.image?'<img class="product-thumb" src="'+p.image+'" alt="'+escapeHtml(p.name)+'">':'—')+'</td><td>'+escapeHtml(p.code)+'</td><td><b>'+escapeHtml(p.name)+'</b></td><td>'+escapeHtml(p.category||'General')+'</td><td>'+escapeHtml(p.unit)+'</td><td>'+money(p.price)+'</td><td>'+money(p.cost)+'</td><td>'+p.stock+'</td><td><span class="badge '+(p.active!==false?'green':'red')+'">'+(p.active!==false?'Activo':'Inactivo')+'</span></td><td><button class="btn sm" onclick="openProductModal(\''+p.id+'\')">Editar</button> <button class="btn sm danger" onclick="deleteProduct(\''+p.id+'\')">Eliminar</button></td></tr>'}).join('');
    el.innerHTML=pageHead('Artículos','Productos, precios, costos, categorías, imágenes y códigos de barras','<button class="btn primary" onclick="openProductModal()">+ Nuevo artículo</button><button class="btn" onclick="openCategoriesModal()">Categorías</button><button class="btn" onclick="exportCSV(\'products\')">Exportar CSV</button>')+'<div class="card">'+table(['Imagen','Código','Producto','Categoría','Unidad','Precio','Costo','Stock','Estado','Acciones'],rows,'No hay artículos registrados.')+'</div>';
  }
  function openCategoriesModal(){
    ensureCategories();
    var rows=db.categories.map(function(c){var count=(db.products||[]).filter(function(p){return (p.category||'General')===c}).length;return '<tr><td><b>'+escapeHtml(c)+'</b></td><td>'+count+'</td><td>'+(c==='General'?'<span class="muted">Predeterminada</span>':'<button class="btn sm danger" onclick="deleteCategory(\''+encodeURIComponent(c)+'\')">Eliminar</button>')+'</td></tr>'}).join('');
    openModal('<h2>Categorías de artículos</h2><p class="muted">Crea y administra las categorías que luego aparecerán en el desplegable de cada artículo.</p><div class="form"><div class="field"><label>Nueva categoría</label><input id="newCategoryName" placeholder="Ej. Ferretería, Eléctricos, Abarrotes, Lácteos..."></div><div class="field" style="align-self:end"><button class="btn primary" onclick="createCategory()">+ Crear categoría</button></div></div><div class="card" style="margin-top:16px">'+table(['Categoría','Artículos','Acciones'],rows,'No hay categorías.')+'</div><div class="actions" style="margin-top:15px"><button class="btn" onclick="closeModal();renderProducts()">Cerrar</button></div>');
  }
  function createCategory(){
    ensureCategories();var name=(document.getElementById('newCategoryName')?.value||'').trim();if(!name)return toast('Escribe el nombre de la categoría');var exists=db.categories.some(function(c){return c.toLowerCase()===name.toLowerCase()});if(exists)return toast('Esa categoría ya existe');db.categories.push(name);db.categories.sort(function(a,b){return a.localeCompare(b,'es')});save();toast('Categoría creada: '+name);openCategoriesModal();
  }
  function deleteCategory(encoded){
    var name=decodeURIComponent(encoded);ensureCategories();var used=(db.products||[]).filter(function(p){return (p.category||'General')===name}).length;if(used)return toast('No puedes eliminar “'+name+'” porque tiene '+used+' artículo(s). Reasigna esos artículos primero.');if(!confirm('¿Eliminar la categoría “'+name+'”?'))return;db.categories=db.categories.filter(function(c){return c!==name});save();openCategoriesModal();
  }
  window.openCategoriesModal=openCategoriesModal;window.createCategory=createCategory;window.deleteCategory=deleteCategory;

  /* -------------------- CARTERA Y CRÉDITO -------------------- */
  var originalRenderReceivables=null;
  function renderReceivablesPatched(){
    var el=document.getElementById('receivables');if(!el)return;
    var todayStr=typeof today==='function'?today():new Date().toISOString().slice(0,10);
    var debtors=(db.clients||[]).filter(function(c){return (c.creditEnabled||false)||(c.balance||0)>0});
    var total=debtors.reduce(function(a,c){return a+(Number(c.balance)||0)},0);
    var overdue=debtors.filter(function(c){return (c.balance||0)>0&&c.nextPaymentDate&&c.nextPaymentDate<todayStr}).reduce(function(a,c){return a+c.balance},0);
    var dueSoon=debtors.filter(function(c){if(!(c.balance>0)||!c.nextPaymentDate)return false;var d=new Date(c.nextPaymentDate+'T00:00:00');var t=new Date(todayStr+'T00:00:00');return (d-t)>=0&&(d-t)<=7*86400000}).length;
    var rows=debtors.map(function(c){var available=Math.max(0,(Number(c.credit)||0)-(Number(c.balance)||0));var isOver=(c.balance>0&&c.nextPaymentDate&&c.nextPaymentDate<todayStr);var status=isOver?'<span class="badge red">Vencido</span>':(c.balance>0?'<span class="badge warn">Pendiente</span>':'<span class="badge green">Al día</span>');return '<tr><td><b>'+escapeHtml(c.name)+'</b><br><small class="muted">'+escapeHtml(c.doc||'')+'</small></td><td>'+money(c.credit)+'</td><td>'+money(c.balance||0)+'</td><td>'+money(available)+'</td><td>'+(c.nextPaymentDate||'—')+'</td><td>'+status+'</td><td><button class="btn sm" onclick="openPaymentModal(\''+c.id+'\')">Abonar</button> <button class="btn sm" onclick="openClientModal(\''+c.id+'\')">Editar</button></td></tr>'}).join('');
    el.innerHTML=pageHead('Cartera y Crédito','Control de fiados, líneas de crédito, vencimientos y abonos','<button class="btn primary" onclick="openClientModal()">+ Nueva línea de crédito</button><button class="btn" onclick="exportCreditReport()">Exportar cartera</button>')+'<div class="grid cols3"><div class="card kpi"><div class="label">Total por cobrar</div><div class="value">'+money(total)+'</div><div class="sub">Cartera activa</div></div><div class="card kpi"><div class="label">Vencido</div><div class="value">'+money(overdue)+'</div><div class="sub">Requiere seguimiento</div></div><div class="card kpi"><div class="label">Vencen en 7 días</div><div class="value">'+dueSoon+'</div><div class="sub">Clientes para contactar</div></div></div><div class="card" style="margin-top:16px">'+table(['Cliente','Límite','Saldo','Disponible','Próximo pago','Estado','Acción'],rows,'No hay líneas de crédito configuradas')+'</div>';
  }

  function install(){
    if(typeof db==='undefined')return;
    ensureCategories();
    if(typeof window.renderProducts==='function'&&!originalRenderProducts){originalRenderProducts=window.renderProducts;window.renderProducts=renderProductsPatched}
    if(typeof window.renderReceivables==='function'&&!originalRenderReceivables){originalRenderReceivables=window.renderReceivables;window.renderReceivables=renderReceivablesPatched}
    patchProductModal();
  }

  patchRender();patchNavigation();install();
  var tries=0;var timer=setInterval(function(){tries++;patchRender();patchNavigation();install();if(tries>=40)clearInterval(timer)},250);
  window.addEventListener('load',install);
})();
