/* VENTARA POS — ajustes quirúrgicos de proveedores, módulo aislado. */
(()=>{
  'use strict';

  function syncSuppliersDropdown(){try{
    const select=document.getElementById('productSupplier');
    if(!select)return;
    const list=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
    const current=String(select.value||'');
    select.innerHTML='<option value="">Sin Proveedor</option>';
    list.forEach(s=>{try{
      const id=s&& (s.id||s.supplierId||s.nit||s.nombre);
      const name=s&& (s.nombre||s.razonSocial||s.name);
      if(name){
        const opt=document.createElement('option');
        opt.value=String(id||'');
        opt.textContent=String(name);
        select.appendChild(opt);
      }
    }catch(e){console.warn('[VENTARA] supplier option',e)}});
    if(current)select.value=current;
  }catch(e){console.warn('[VENTARA] sync suppliers',e)}}

  function deleteSupplier(id){try{
    if(!window.db||!Array.isArray(window.db.suppliers))return;
    const target=String(id);
    if(!window.confirm('¿Desea eliminar este proveedor?'))return;
    const index=window.db.suppliers.findIndex(s=>String(s&& (s.id||s.supplierId||s.nit||s.nombre))===target);
    if(index<0)return;
    window.db.suppliers.splice(index,1);
    try{if(typeof window.save==='function')window.save()}catch(e){console.warn('[VENTARA] supplier save',e)}
    try{if(typeof window.cloudSave==='function')window.cloudSave().catch(()=>{})}catch(e){console.warn('[VENTARA] supplier cloud save',e)}
    try{if(typeof window.renderSuppliers==='function')window.renderSuppliers()}catch(e){console.warn('[VENTARA] supplier render',e)}
    try{
      const root=document.getElementById('suppliers');
      if(root&&typeof window.renderPage==='function')window.renderPage('suppliers');
    }catch(e){console.warn('[VENTARA] supplier refresh',e)}
  }catch(e){console.warn('[VENTARA] delete supplier',e)}}

  function wireProductButtons(){try{
    const root=document.getElementById('products');
    if(!root||root.dataset.ventaraSupplierDefinitive==='1')return;
    root.dataset.ventaraSupplierDefinitive='1';
    root.addEventListener('click',e=>{try{
      const b=e.target&&e.target.closest?e.target.closest('button'):null;
      const text=(b&&b.textContent||'').trim();
      if(/^\+?\s*nuevo artículo$|^\+?\s*nuevo articulo$|^editar$/i.test(text))syncSuppliersDropdown();
    }catch(err){console.warn('[VENTARA] product supplier click',err)}});
  }catch(e){console.warn('[VENTARA] product button wire',e)}}

  function wireSupplierTable(){try{
    const root=document.getElementById('suppliers');
    if(!root||root.dataset.ventaraSupplierDelete==='1')return;
    root.dataset.ventaraSupplierDelete='1';
    root.addEventListener('click',e=>{try{
      const b=e.target&&e.target.closest?e.target.closest('.btn-delete-supplier'):null;
      if(!b)return;
      deleteSupplier(b.getAttribute('data-id'));
    }catch(err){console.warn('[VENTARA] supplier delete click',err)}});
    const buttons=root.querySelectorAll('button');
    buttons.forEach(b=>{try{
      if(!/editar/i.test(b.textContent||'')||b.parentElement.querySelector('.btn-delete-supplier'))return;
      const onclick=b.getAttribute('onclick')||'';
      const match=onclick.match(/(?:editSupplier|editarProveedor|openSupplier)[(]\s*['\"]?([^'\")]+)['\"]?/i);
      const id=match?match[1]:b.dataset.id;
      if(!id)return;
      const del=document.createElement('button');
      del.className='btn btn-sm btn-danger btn-delete-supplier';
      del.setAttribute('data-id',id);
      del.textContent='Eliminar';
      b.parentElement.appendChild(del);
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] supplier table wire',e)}}

  function boot(){try{wireProductButtons();wireSupplierTable();syncSuppliersDropdown()}catch(e){console.warn('[VENTARA] definitive supplier boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});
  else setTimeout(boot,1000);
  window.syncSuppliersDropdown=syncSuppliersDropdown;
  window.ventaraSupplierDefinitive={syncSuppliersDropdown,deleteSupplier,refresh:boot};
})();
