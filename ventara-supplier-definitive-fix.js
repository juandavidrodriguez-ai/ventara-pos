/* VENTARA POS — proveedores: sincronización pasiva y eliminación aislada. */
(()=>{
  'use strict';

  function populateSupplierSelectOnce(){try{
    const select=document.getElementById('productSupplier');
    if(!select)return;
    if(select.children.length>1)return;
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
    select.innerHTML='<option value="">Sin Proveedor</option>';
    suppliers.forEach(s=>{try{
      const id=s?.id||s?.supplierId||s?.nit||s?.nombre||'';
      const name=s?.nombre||s?.razonSocial||s?.name||'';
      if(!name)return;
      const opt=document.createElement('option');
      opt.value=String(id);
      opt.textContent=String(name);
      select.appendChild(opt);
    }catch(e){console.warn('[VENTARA] supplier option',e)}});
  }catch(e){console.warn('[VENTARA] populate suppliers',e)}}

  function bindDirectProductButtons(){try{
    const root=document.getElementById('products');
    if(!root)return;
    root.querySelectorAll('button').forEach(btn=>{try{
      const text=(btn.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^(\+\s*)?Nuevo artículo$/i.test(text)&&!/^Editar$/i.test(text))return;
      if(btn.dataset.ventaraSupplierOnce==='1')return;
      btn.dataset.ventaraSupplierOnce='1';
      btn.addEventListener('click',()=>{try{populateSupplierSelectOnce()}catch(e){console.warn('[VENTARA] supplier direct click',e)}},{passive:true});
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] bind product buttons',e)}}

  function bindProductsRoot(){try{
    const root=document.getElementById('products');
    if(!root||root.dataset.ventaraSupplierRoot==='1')return;
    root.dataset.ventaraSupplierRoot='1';
    root.addEventListener('click',e=>{try{
      const btn=e.target?.closest?.('button');
      if(!btn||!root.contains(btn))return;
      const text=(btn.textContent||'').replace(/\s+/g,' ').trim();
      if(/^(\+\s*)?Nuevo artículo$/i.test(text)||/^Editar$/i.test(text))populateSupplierSelectOnce();
    }catch(err){console.warn('[VENTARA] supplier product click',err)}});
  }catch(e){console.warn('[VENTARA] bind products root',e)}}

  function injectDeleteButtons(){try{
    const root=document.getElementById('suppliers');
    if(!root)return;
    const body=root.querySelector('table tbody');
    if(!body)return;
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
    [...body.querySelectorAll('tr')].forEach((tr,index)=>{try{
      if(tr.querySelector('.btn-delete-supplier'))return;
      const edit=[...tr.querySelectorAll('button')].find(b=>/editar/i.test(b.textContent||''));
      const supplier=suppliers[index];
      if(!edit||!supplier)return;
      const id=String(supplier.id||supplier.supplierId||'');
      if(!id)return;
      const del=document.createElement('button');
      del.className='btn btn-sm btn-danger btn-delete-supplier ms-1';
      del.dataset.id=id;
      del.type='button';
      del.textContent='Eliminar';
      edit.parentElement?.appendChild(del);
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] inject delete',e)}}

  function deleteSupplier(id){try{
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:null;
    if(!suppliers)return;
    const target=String(id||'');
    if(!target)return;
    if(!window.confirm('¿Desea eliminar este proveedor?'))return;
    window.db.suppliers=suppliers.filter(s=>String(s?.id||s?.supplierId||'')!==target);
    try{if(typeof window.saveDb==='function')window.saveDb();else if(typeof window.save==='function')window.save()}catch(e){console.warn('[VENTARA] supplier save',e)}
    try{if(typeof window.cloudSave==='function')Promise.resolve(window.cloudSave()).catch(e=>console.warn('[VENTARA] supplier cloud save',e))}catch(e){console.warn('[VENTARA] supplier cloud save',e)}
    try{if(typeof window.renderSuppliers==='function')window.renderSuppliers()}catch(e){console.warn('[VENTARA] supplier table refresh',e);injectDeleteButtons()}
  }catch(e){console.warn('[VENTARA] delete supplier',e)}}

  function bindSupplierTable(){try{
    const root=document.getElementById('suppliers');
    if(!root||root.dataset.ventaraSupplierDelete==='1')return;
    root.dataset.ventaraSupplierDelete='1';
    root.addEventListener('click',e=>{try{
      const btn=e.target?.closest?.('.btn-delete-supplier');
      if(!btn)return;
      e.preventDefault();
      e.stopPropagation();
      deleteSupplier(btn.getAttribute('data-id'));
    }catch(err){console.warn('[VENTARA] supplier delete click',err)}});
    injectDeleteButtons();
  }catch(e){console.warn('[VENTARA] bind supplier table',e)}}

  function bindSupplierRender(){try{
    if(typeof window.renderSuppliers!=='function'||window.renderSuppliers.__ventaraSupplierDelete)return;
    const original=window.renderSuppliers;
    const wrapped=function(){
      const result=original.apply(this,arguments);
      try{setTimeout(injectDeleteButtons,0)}catch(e){console.warn('[VENTARA] supplier redraw',e)}
      return result;
    };
    wrapped.__ventaraSupplierDelete=true;
    window.renderSuppliers=wrapped;
  }catch(e){console.warn('[VENTARA] supplier render hook',e)}}

  function boot(){try{bindDirectProductButtons();bindProductsRoot();bindSupplierTable();bindSupplierRender()}catch(e){console.warn('[VENTARA] supplier boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});
  else setTimeout(boot,1000);

  window.populateSupplierSelectOnce=populateSupplierSelectOnce;
  window.populateSuppliersOnce=populateSupplierSelectOnce;
  window.syncSuppliersDropdown=populateSupplierSelectOnce;
  window.ventaraSupplierDefinitive={populateSupplierSelectOnce,deleteSupplier,injectDeleteButtons,refresh:boot};
})();
