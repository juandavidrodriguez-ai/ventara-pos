/* VENTARA runtime fixes: navigation + categorías + cartera/crédito.
   Este archivo NO reemplaza renderizadores existentes; solo completa lo que falte
   y mejora los módulos solicitados. */
(function(){
  'use strict';

  function esc(v){return String(v ?? '').replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]})}
  function ensureDb(){
    if(typeof db==='undefined') return false;
    db.categories=Array.isArray(db.categories)?db.categories:[];
    (db.products||[]).forEach(function(p){if(p.category&&String(p.category).trim())db.categories.push(String(p.category).trim())});
    db.categories.push('General');
    db.categories=[...new Set(db.categories.map(function(x){return String(x).trim()}).filter(Boolean))].sort(function(a,b){return a.localeCompare(b,'es')});
    return true;
  }
  function options(selected){
    ensureDb();
    return db.categories.map(function(c){return '<option value="'+esc(c)+'" '+(c===selected?'selected':'')+'>'+esc(c)+'</option>'}).join('');
  }
  function modalBox(){return document.getElementById('modalbox')||document.querySelector('.modalbox')}
  function isArticleModal(){
    var m=modalBox(),t=(m&&m.innerText||'').toLowerCase();
    return t.includes('nuevo artículo')||t.includes('nuevo articulo')||t.includes('editar artículo')||t.includes('editar articulo');
  }

  /* Evita que un renderer ausente rompa todo el POS. Si el renderer real existe,
     se conserva intacto. */
  function ensureInventoryRenderer(){
    if(typeof window.renderInventory==='function') return;
    window.renderInventory=function(){
      var el=document.getElementById('inventory');
      if(!el)return;
      ensureDb();
      var products=db.products||[],moves=db.kardex||[];
      var rows=products.map(function(p){
        return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.stock)+'</td><td>'+esc(p.min)+'</td><td>'+(p.stock<=0?'<span class="badge red">Agotado</span>':p.stock<=p.min?'<span class="badge warn">Bajo</span>':'<span class="badge green">OK</span>')+'</td><td>'+money((p.stock||0)*(p.cost||0))+'</td></tr>';
      }).join('');
      var movementRows=moves.slice(0,50).map(function(k){return '<tr><td>'+esc(k.date)+'</td><td>'+esc(k.type)+'</td><td>'+esc((products.find(function(p){return p.id===k.productId})||{}).name||'')+'</td><td>'+esc(k.qty)+'</td><td>'+esc(k.balance)+'</td><td>'+esc(k.user||'Sistema')+'</td></tr>'}).join('');
      el.innerHTML=pageHead('Inventario y Kardex','Existencias, entradas, salidas y trazabilidad','<button class="btn primary" onclick="openAdjustModal()">+ Movimiento</button>')+
        '<div class="grid cols2"><div class="card">'+table(['Producto','Stock','Mínimo','Estado','Valor costo'],rows,'No hay artículos.')+'</div><div class="card">'+table(['Fecha','Tipo','Producto','Cant.','Saldo','Usuario'],movementRows,'No hay movimientos.')+'</div></div>';
    };
  }

  function patchArticleModal(){
    if(typeof window.openProductModal!=='function'||window.__ventaraArticlePatched)return;
    var original=window.openProductModal;
    window.openProductModal=function(id){
      original(id||'');
      setTimeout(function(){
        if(!isArticleModal()||!ensureDb())return;
        var input=document.getElementById('f_cat');
        if(input&&input.tagName!=='SELECT'){
          var select=document.createElement('select');
          select.id='f_cat';select.name='f_cat';select.innerHTML=options(input.value||'General');
          input.replaceWith(select);
        }
      },30);
    };
    window.__ventaraArticlePatched=true;
  }

  function renderCategoriesButton(){
    var el=document.getElementById('products');
    if(!el)return;
    var buttons=el.querySelector('.head .actions');
    if(buttons&&!buttons.querySelector('[data-ventara-categories]')){
      var b=document.createElement('button');b.className='btn';b.type='button';b.dataset.ventaraCategories='1';b.textContent='Categorías';b.onclick=window.openCategoriesModal;buttons.insertBefore(b,buttons.firstChild||null);
    }
  }

  function openCategoriesModal(){
    if(!ensureDb()||typeof openModal!=='function')return;
    var rows=db.categories.map(function(c){
      var used=(db.products||[]).filter(function(p){return (p.category||'General')===c}).length;
      return '<tr><td><b>'+esc(c)+'</b></td><td>'+used+'</td><td>'+(c==='General'?'<span class="muted">Predeterminada</span>':'<button class="btn sm danger" onclick="deleteCategory(\''+encodeURIComponent(c)+'\')">Eliminar</button>')+'</td></tr>';
    }).join('');
    openModal('<h2>Categorías de artículos</h2><p class="muted">Crea aquí las categorías. Después aparecerán en la lista desplegable de cada artículo.</p><div class="form"><div class="field"><label>Nueva categoría</label><input id="newCategoryName" placeholder="Ej. Herramientas, Pinturas, Eléctricos..."></div><div class="field" style="align-self:end"><button class="btn primary" onclick="createCategory()">+ Crear categoría</button></div></div><div class="card" style="margin-top:16px">'+table(['Categoría','Artículos','Acciones'],rows,'No hay categorías.')+'</div><div class="actions" style="margin-top:15px"><button class="btn" onclick="closeModal();renderProducts()">Cerrar</button></div>');
  }
  function createCategory(){
    if(!ensureDb())return;
    var name=(document.getElementById('newCategoryName')?.value||'').trim();
    if(!name)return toast('Escribe el nombre de la categoría');
    if(db.categories.some(function(c){return c.toLowerCase()===name.toLowerCase()}))return toast('Esa categoría ya existe');
    db.categories.push(name);db.categories.sort(function(a,b){return a.localeCompare(b,'es')});
    save();toast('Categoría creada: '+name);openCategoriesModal();
  }
  function deleteCategory(encoded){
    if(!ensureDb())return;
    var name=decodeURIComponent(encoded),used=(db.products||[]).filter(function(p){return (p.category||'General')===name}).length;
    if(used)return toast('No puedes eliminar “'+name+'” porque tiene '+used+' artículo(s).');
    if(!confirm('¿Eliminar la categoría “'+name+'”?'))return;
    db.categories=db.categories.filter(function(c){return c!==name});save();openCategoriesModal();
  }

  function patchProductsRenderer(){
    if(typeof window.renderProducts!=='function'||window.__ventaraProductsPatched)return;
    var original=window.renderProducts;
    window.renderProducts=function(){
      ensureDb();original();
      renderCategoriesButton();
    };
    window.__ventaraProductsPatched=true;
  }

  function patchReceivables(){
    if(typeof window.renderReceivables!=='function'||window.__ventaraReceivablesPatched)return;
    var original=window.renderReceivables;
    window.renderReceivables=function(){
      original();
      var el=document.getElementById('receivables');if(!el)return;
      var h=el.querySelector('.head h1');if(h)h.textContent='Cartera y Crédito';
      var p=el.querySelector('.head p');if(p)p.textContent='Control de fiados, líneas de crédito, vencimientos y abonos';
    };
    window.__ventaraReceivablesPatched=true;
  }

  function renameMenu(){
    document.querySelectorAll('.nav').forEach(function(b){
      if(b.dataset.page==='receivables'){
        var s=b.querySelector('span');if(s)s.textContent='Cartera y Crédito';
      }
    });
  }

  function install(){
    ensureInventoryRenderer();
    patchArticleModal();
    patchProductsRenderer();
    patchReceivables();
    renameMenu();
    renderCategoriesButton();
  }

  window.openCategoriesModal=openCategoriesModal;
  window.createCategory=createCategory;
  window.deleteCategory=deleteCategory;
  install();
  var tries=0;
  var timer=setInterval(function(){
    tries++;install();
    if(tries>=80)clearInterval(timer);
  },250);
  window.addEventListener('load',install);
})();
