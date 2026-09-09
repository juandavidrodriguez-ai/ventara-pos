/* VENTARA POS - Gestión de categorías de artículos */
(()=>{
  function ensureCategories(){
    db.categories=Array.isArray(db.categories)?db.categories:[];
    const existing=new Set(db.categories.map(x=>String(x).trim()).filter(Boolean));
    (db.products||[]).forEach(p=>{const c=String(p.category||'').trim();if(c)existing.add(c)});
    if(!existing.size)existing.add('General');
    db.categories=[...existing];
  }

  window.openCategoriesModal=function(){
    ensureCategories();
    renderCategoriesModal();
  };

  function renderCategoriesModal(message=''){
    ensureCategories();
    const rows=db.categories.map((c,i)=>{
      const count=(db.products||[]).filter(p=>String(p.category||'').trim()===c).length;
      return `<tr><td><b>${escapeHtml(c)}</b></td><td>${count}</td><td><button class="btn sm danger" onclick="deleteCategory(${i})" ${count?'disabled title="Hay artículos usando esta categoría"':''}>Eliminar</button></td></tr>`;
    }).join('');
    openModal(`<h2>📂 Categorías</h2><p class="muted">Crea y administra las categorías que luego aparecerán al crear o editar un artículo.</p><div class="form" style="margin-bottom:15px"><div class="field"><label>Nueva categoría</label><input id="newCategoryName" placeholder="Ej. Abarrotes" onkeydown="if(event.key==='Enter')createCategory()"></div><div class="field" style="align-self:end"><button class="btn primary" onclick="createCategory()">+ Crear categoría</button></div></div>${message?`<div class="badge green" style="margin-bottom:12px">${escapeHtml(message)}</div>`:''}<div class="card" style="box-shadow:none;background:#f8fafc">${table(['Categoría','Artículos','Acción'],rows,'Aún no hay categorías')}</div><div class="actions" style="margin-top:15px"><button class="btn" onclick="closeModal()">Cerrar</button></div>`);
  }

  window.createCategory=function(){
    ensureCategories();
    const input=document.getElementById('newCategoryName');
    const name=(input?.value||'').trim().replace(/\s+/g,' ');
    if(!name)return toast('Escribe el nombre de la categoría');
    if(name.length>60)return toast('La categoría no puede superar 60 caracteres');
    if(db.categories.some(c=>c.toLowerCase()===name.toLowerCase()))return toast('Esa categoría ya existe');
    db.categories.push(name);
    save();
    renderCategoriesModal('Categoría creada correctamente');
  };

  window.deleteCategory=function(index){
    ensureCategories();
    const name=db.categories[index];
    if(!name)return;
    const used=(db.products||[]).some(p=>String(p.category||'').trim()===name);
    if(used)return toast('No puedes eliminar una categoría que tiene artículos asignados');
    if(!confirm(`¿Eliminar la categoría "${name}"?`))return;
    db.categories.splice(index,1);
    if(!db.categories.length)db.categories.push('General');
    save();
    renderCategoriesModal('Categoría eliminada');
  };

  function escapeHtml(value){
    return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function refreshProductCategoryField(){
    const select=document.getElementById('f_cat');
    if(!select)return;
    ensureCategories();
    const current=select.value;
    select.innerHTML=db.categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if(db.categories.includes(current))select.value=current;
  }

  function patchProductModal(){
    const field=document.getElementById('f_cat');
    if(!field||field.tagName==='SELECT')return;
    ensureCategories();
    const current=field.value;
    const select=document.createElement('select');
    select.id='f_cat';
    select.innerHTML=db.categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    field.replaceWith(select);
    if(db.categories.includes(current))select.value=current;
  }

  ensureCategories();
  save();
  const observer=new MutationObserver(()=>patchProductModal());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>patchProductModal(),500);
})();
