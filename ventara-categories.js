/* VENTARA POS - Categorías de artículos (aislado y seguro) */
(()=>{
  const getDb=()=>{try{return typeof db!=='undefined'?db:(window.db||null)}catch(e){return window.db||null}};
  const notify=(message)=>{try{if(typeof window.toast==='function')window.toast(message);else alert(message)}catch(e){console.log('[VENTARA]',message)}};
  const escapeHtml=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function ensureCategories(){
    const d=getDb();
    if(!d)return false;
    d.categories=Array.isArray(d.categories)?d.categories:[];
    const names=new Set(d.categories.map(c=>String(c||'').trim()).filter(Boolean));
    (d.products||[]).forEach(p=>{const name=String(p.category||'').trim();if(name)names.add(name)});
    if(!names.size)names.add('General');
    d.categories=[...names];
    return true;
  }

  function categoryOptions(selected=''){
    const d=getDb();
    if(!d)return '<option value="General">General</option>';
    ensureCategories();
    return (d.categories||['General']).map(c=>`<option value="${escapeHtml(c)}" ${String(c)===String(selected)?'selected':''}>${escapeHtml(c)}</option>`).join('');
  }

  function refreshProductCategory(selected){
    const d=getDb(),field=document.getElementById('f_cat');
    if(!d||!field)return;
    ensureCategories();
    const current=selected??field.value??'General';
    if(field.tagName!=='SELECT'){
      const select=document.createElement('select');
      select.id='f_cat';
      select.name='category';
      select.className=field.className||'';
      select.style.cssText=field.style.cssText||'';
      field.replaceWith(select);
      field=select;
    }
    const signature=(d.categories||[]).join('\u0001');
    if(field.dataset.categorySignature!==signature){
      field.innerHTML=categoryOptions(current);
      field.dataset.categorySignature=signature;
    }
    if((d.categories||[]).includes(current))field.value=current;
  }

  function addCategoryButtonToProductModal(){
    const field=document.getElementById('f_cat');
    if(!field)return;
    refreshProductCategory(field.value||'General');
    const select=document.getElementById('f_cat');
    if(!select||document.getElementById('ventaraCategoryQuickAdd'))return;
    const host=select.closest('.field');
    if(!host)return;
    const button=document.createElement('button');
    button.id='ventaraCategoryQuickAdd';
    button.type='button';
    button.className='btn sm';
    button.style.cssText='margin-top:7px;width:max-content';
    button.textContent='📂 Nueva categoría';
    button.onclick=()=>window.openCategoriesModal();
    host.appendChild(button);
  }

  function removeCategoryAccessOutsideArticles(){
    document.querySelectorAll('.nav, button').forEach(button=>{
      const text=(button.innerText||button.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(!text.includes('categor'))return;
      const isArticleArea=button.closest('#products,[data-page="products"],#modalbox #f_cat');
      const isProductModal=!!button.closest('#modalbox')&&!!document.getElementById('f_cat');
      if(isArticleArea||isProductModal)return;
      if(button.closest('#pos,[data-page="pos"]')||button.classList.contains('nav'))button.remove();
    });
  }

  window.openCategoriesModal=function(){
    if(!ensureCategories())return notify('Los datos todavía no están listos.');
    if(typeof window.openModal!=='function')return notify('No se pudo abrir Categorías.');
    renderCategoriesModal();
  };

  function renderCategoriesModal(message=''){
    const d=getDb();
    if(!d||typeof window.openModal!=='function')return;
    ensureCategories();
    const rows=(d.categories||[]).map((name,index)=>{
      const used=(d.products||[]).filter(p=>String(p.category||'').trim()===name).length;
      return `<tr><td><b>${escapeHtml(name)}</b></td><td>${used}</td><td><button class="btn sm danger" type="button" onclick="window.deleteCategory(${index})" ${used?'disabled title="Hay artículos usando esta categoría"':''}>Eliminar</button></td></tr>`;
    }).join('');
    const tableHtml=typeof window.table==='function'?window.table(['Categoría','Artículos','Acción'],rows,'Aún no hay categorías'):`<table class="table"><thead><tr><th>Categoría</th><th>Artículos</th><th>Acción</th></tr></thead><tbody>${rows||'<tr><td colspan="3" class="empty">Aún no hay categorías</td></tr>'}</tbody></table>`;
    window.openModal(`<h2>📂 Categorías</h2><p class="muted">Administra las categorías que aparecen en Artículos.</p><form id="ventaraCategoryForm"><div class="form" style="margin-bottom:15px"><div class="field"><label>Nueva categoría</label><input id="newCategoryName" type="text" maxlength="60" placeholder="Ej. Abarrotes" autocomplete="off"></div><div class="field" style="align-self:end"><button class="btn primary" type="submit">+ Crear categoría</button></div></div></form>${message?`<div class="badge green" style="margin-bottom:12px">${escapeHtml(message)}</div>`:''}<div class="card" style="box-shadow:none;background:#f8fafc">${tableHtml}</div><div class="actions" style="margin-top:15px"><button class="btn" type="button" onclick="window.closeModal()">Cerrar</button></div>`);
    document.getElementById('ventaraCategoryForm')?.addEventListener('submit',e=>{e.preventDefault();window.createCategory()});
    document.getElementById('newCategoryName')?.focus();
  }

  window.createCategory=async function(){
    const d=getDb();
    if(!d)return notify('Los datos todavía no están listos.');
    ensureCategories();
    const input=document.getElementById('newCategoryName');
    const name=(input?.value||'').trim().replace(/\s+/g,' ');
    if(!name)return notify('Escribe el nombre de la categoría.');
    if(name.length>60)return notify('La categoría no puede superar 60 caracteres.');
    if(d.categories.some(c=>String(c).toLowerCase()===name.toLowerCase()))return notify('Esa categoría ya existe.');
    d.categories.push(name);
    if(typeof window.save==='function')window.save();
    try{if(typeof window.cloudSave==='function')await window.cloudSave()}catch(e){console.warn('[VENTARA] cloud category save',e)}
    refreshProductCategory(name);
    renderCategoriesModal('Categoría creada correctamente.');
    addCategoryButtonToProductModal();
  };

  window.deleteCategory=function(index){
    const d=getDb();
    if(!d)return;
    ensureCategories();
    const name=d.categories[index];
    if(!name)return;
    const used=(d.products||[]).some(p=>String(p.category||'').trim()===name);
    if(used)return notify('No puedes eliminar una categoría que tiene artículos asignados.');
    if(!confirm(`¿Eliminar la categoría "${name}"?`))return;
    d.categories.splice(index,1);
    if(!d.categories.length)d.categories.push('General');
    if(typeof window.save==='function')window.save();
    refreshProductCategory();
    renderCategoriesModal('Categoría eliminada.');
  };

  function observe(){
    ensureCategories();
    addCategoryButtonToProductModal();
    removeCategoryAccessOutsideArticles();
  }

  const observer=new MutationObserver(()=>observe());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observe();observer.observe(document.body,{subtree:true,childList:true})},{once:true});
  else{observe();observer.observe(document.body,{subtree:true,childList:true})}
})();
