/* VENTARA POS — FASE 1: inyección visual aislada + consulta pasiva. */
(()=>{
  'use strict';
  const W=window;
  const getDb=()=>{try{return W.db||null}catch(e){return null}};
  const products=()=>{try{const d=getDb();return Array.isArray(d?.products)?d.products:[]}catch(e){return[]}};
  const suppliers=()=>{try{
    const d=getDb();
    if(Array.isArray(d?.suppliers)&&d.suppliers.length)return d.suppliers;
    const read=k=>{try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):null}catch(e){return null}};
    const a=read('suppliers');if(Array.isArray(a)&&a.length)return a;
    const b=read('db_suppliers');if(Array.isArray(b)&&b.length)return b;
    return [];
  }catch(e){return[]}};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const supplierIdOf=(s,i)=>String(s?.id??s?.supplierId??s?.codigo??i);
  const supplierNameOf=(s)=>String(s?.nombre||s?.name||s?.razonSocial||s?.empresa||'Proveedor sin nombre');
  const supplierName=id=>{try{const list=suppliers(),s=list.find((x,i)=>supplierIdOf(x,i)===String(id));return s?supplierNameOf(s):'Sin Proveedor'}catch(e){return'Sin Proveedor'}};
  const productModal=()=>{try{return document.getElementById('productModal')||[...document.querySelectorAll('.modalbox')].find(m=>m.querySelector('#f_cat')||m.querySelector('#f_name'))||null}catch(e){return null}};

  function loadSuppliersIntoDropdown(selected){try{
    const select=document.getElementById('productSupplier');if(!select)return;
    const current=selected!==undefined?String(selected):String(select.value||'');
    const suppliersList=suppliers();
    select.innerHTML='<option value="">Sin Proveedor</option>';
    suppliersList.forEach((sup,index)=>{
      try{
        const id=sup?.id||sup?.supplierId||sup?.codigo||index;
        const nombre=sup?.nombre||sup?.name||sup?.razonSocial||sup?.empresa;
        if(id!==undefined&&id!==null&&String(id)!==''&&nombre){
          const option=document.createElement('option');
          option.value=String(id);option.textContent=String(nombre);select.appendChild(option);
        }
      }catch(e){console.warn('[VENTARA] supplier item',e)}
    });
    select.value=current;
  }catch(e){console.warn('[VENTARA] load suppliers',e)}}
  const fillSupplierOptions=loadSuppliersIntoDropdown;

  function productIdFromModal(){try{
    const m=productModal();
    const b=[...(m?.querySelectorAll('.actions button')||[])].find(x=>/guardar/i.test(x.textContent||''));
    const raw=b?.getAttribute('onclick')||'';
    const match=raw.match(/saveProduct\(['"]([^'"]*)['"]\)/);
    return match?match[1]:'';
  }catch(e){return''}}

  function hydrate(){try{
    const id=productIdFromModal(),p=products().find(x=>String(x?.id)===String(id));
    const s=document.getElementById('productSupplier'),mx=document.getElementById('productMaxStock');
    loadSuppliersIntoDropdown(p?.supplierId??s?.value??'');
    if(!p)return;
    if(s)s.value=String(p.supplierId??'');
    if(mx)mx.value=Number.isFinite(+p.stockMax)?p.stockMax:0;
  }catch(e){console.warn('[VENTARA] hydrate',e)}}

  function injectFields(){try{
    const m=productModal();if(!m)return false;
    const category=document.getElementById('f_cat');
    const min=document.getElementById('f_min');
    if(!category&&!min)return false;
    if(!document.getElementById('productSupplier')){
      const host=category?.closest('.field')||m.querySelector('.form');
      if(host){const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='supplier';wrap.innerHTML='<label>Proveedor</label><select id="productSupplier" class="form-control"><option value="">Sin Proveedor</option></select>';host.insertAdjacentElement('afterend',wrap)}
    }
    if(!document.getElementById('productMaxStock')){
      const host=min?.closest('.field')||m.querySelector('.form');
      if(host){const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='max';wrap.innerHTML='<label>Stock Máximo / Objetivo</label><input id="productMaxStock" class="form-control" type="number" min="0" step="0.001" placeholder="0">';host.insertAdjacentElement('afterend',wrap)}
    }
    loadSuppliersIntoDropdown();
    hydrate();
    attachSaveHook();
    return !!document.getElementById('productSupplier')&&!!document.getElementById('productMaxStock');
  }catch(e){console.warn('[VENTARA] inject fields',e);return false}}

  function attachSaveHook(){try{
    const m=productModal(),b=[...(m?.querySelectorAll('.actions button')||[])].find(x=>/guardar/i.test(x.textContent||''));
    if(!m||!b||b.dataset.ventaraPhase1Save==='1')return;
    b.dataset.ventaraPhase1Save='1';
    b.addEventListener('click',()=>{try{
      const id=productIdFromModal(),code=document.getElementById('f_code')?.value||'',name=document.getElementById('f_name')?.value||'',supplierId=document.getElementById('productSupplier')?.value||'',supplierName=document.getElementById('productSupplier')?.selectedOptions?.[0]?.textContent||'',min=Number(document.getElementById('f_min')?.value||0),max=Number(document.getElementById('productMaxStock')?.value||0);
      setTimeout(()=>persistAfterNativeSave({id,code,name,supplierId,supplierName,min,max}),350);
    }catch(e){console.warn('[VENTARA] save hook',e)}},{capture:true});
  }catch(e){console.warn('[VENTARA] attach save',e)}}

  function persistAfterNativeSave(x){try{
    const d=getDb();if(!d||!Array.isArray(d.products))return;
    let p=x.id?d.products.find(v=>String(v?.id)===String(x.id)):null;
    if(!p&&x.code)p=d.products.find(v=>String(v?.code||'')===String(x.code));
    if(!p&&x.name)p=d.products.find(v=>String(v?.name||'').trim()===String(x.name).trim());
    if(!p)return;
    p.supplierId=x.supplierId||'';
    p.supplierName=x.supplierName||'';
    p.stockMin=Number.isFinite(x.min)&&x.min>0?x.min:0;
    p.stockMax=Number.isFinite(x.max)&&x.max>0?x.max:0;
    p.min=p.stockMin;
    if(typeof W.save==='function')W.save();
    if(typeof W.cloudSave==='function')Promise.resolve(W.cloudSave()).catch(e=>console.warn('[VENTARA] cloud save',e));
  }catch(e){console.warn('[VENTARA] persistence',e)}}

  function injectButton(){try{
    const root=document.getElementById('products');if(!root)return false;
    document.getElementById('ventaraPhase1AlertsBtn')?.remove();document.getElementById('btnConsultAlerts')?.remove();
    const b=document.createElement('button');b.id='btnConsultAlerts';b.type='button';b.className='btn btn-warning';b.textContent='🔔 Consultar Alertas';b.addEventListener('click',()=>{try{showAlerts()}catch(e){console.warn('[VENTARA] alerts click',e)}});
    const actions=root.querySelector('.head .actions')||root.querySelector('.actions');if(!actions)return false;actions.appendChild(b);return true;
  }catch(e){console.warn('[VENTARA] inject button',e);return false}}

  function showAlerts(){try{
    const rows=products().filter(p=>{const stock=Number(p?.stockActual??p?.stock??0),min=Number(p?.stockMin??p?.min);return Number.isFinite(stock)&&Number.isFinite(min)&&min>0&&stock<=min});
    const body=rows.length?rows.map(p=>{const stock=Number(p?.stockActual??p?.stock??0),min=Number(p?.stockMin??p?.min),max=Number(p?.stockMax??0),qty=Math.max(0,max-stock),name=String(p?.name||p?.description||'Producto sin nombre');return `<tr><td>${esc(name)}</td><td>${esc(p?.supplierName||supplierName(p?.supplierId))}</td><td>${stock}</td><td>${min}</td><td><b>${qty}</b></td></tr>`}).join(''):`<tr><td colspan="5" class="empty">No hay alertas de stock pendiente.</td></tr>`;
    const html=`<h2>Alertas de Reabastecimiento de Inventario</h2><div class="card" style="box-shadow:none;background:#f8fafc"><table class="table"><thead><tr><th>Producto</th><th>Proveedor</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Cantidad Sugerida a Pedir</th></tr></thead><tbody>${body}</tbody></table></div><div class="actions" style="margin-top:15px"><button class="btn" type="button" onclick="window.closeModal()">Cerrar</button></div>`;
    if(typeof W.openModal==='function')W.openModal(html);else alert(rows.length?rows.map(p=>`${p?.name||'Producto'} — ${p?.supplierName||supplierName(p?.supplierId)} — actual: ${p?.stockActual??p?.stock??0} — mínimo: ${p?.stockMin??p?.min??0} — sugerido: ${Math.max(0,Number(p?.stockMax??0)-Number(p?.stockActual??p?.stock??0))}`).join('\n'):'No hay alertas de stock pendiente.');
  }catch(e){console.warn('[VENTARA] show alerts',e)}}

  function afterProductOpen(){try{
    loadSuppliersIntoDropdown();
    setTimeout(()=>{try{injectFields();loadSuppliersIntoDropdown()}catch(e){console.warn('[VENTARA] deferred fields',e)}},80);
    setTimeout(()=>{try{loadSuppliersIntoDropdown()}catch(e){console.warn('[VENTARA] late suppliers',e)}},250);
  }catch(e){console.warn('[VENTARA] after open',e)}}
  function wireRoot(){try{const root=document.getElementById('products');if(!root||root.dataset.ventaraPhase1Root==='1')return;root.dataset.ventaraPhase1Root='1';root.addEventListener('click',e=>{try{
    const b=e.target?.closest?.('button');
    if(b&&/nuevo artículo|nuevo articulo|editar/i.test(b.textContent||''))afterProductOpen();
    setTimeout(()=>{try{injectButton()}catch(err){console.warn('[VENTARA] deferred button',err)}},120);
  }catch(err){console.warn('[VENTARA] products listener',err)}})}catch(e){console.warn('[VENTARA] wire root',e)}}
  function wireNav(){try{document.querySelectorAll('.nav[data-page="products"],.nav[data-page="inventory"]').forEach(b=>{if(b.dataset.ventaraPhase1Nav==='1')return;b.dataset.ventaraPhase1Nav='1';b.addEventListener('click',()=>setTimeout(()=>{try{injectButton()}catch(e){console.warn('[VENTARA] nav button',e)}},250))})}catch(e){console.warn('[VENTARA] wire nav',e)}}
  function boot(){try{wireRoot();wireNav();injectButton();if(productModal())injectFields()}catch(e){console.warn('[VENTARA] phase1 boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
  W.ventaraPhase1={refresh:boot,consult:showAlerts,loadSuppliersIntoDropdown};
})();