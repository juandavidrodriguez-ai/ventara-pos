/* VENTARA POS — proveedores: sincronización pasiva y eliminación aislada. */
(()=>{
  'use strict';

  function populateSuppliersOnce(){try{
    const select=document.getElementById('productSupplier');
    if(!select)return;
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
    select.innerHTML='<option value="">Sin Proveedor</option>';
    suppliers.forEach(s=>{try{
      const id=s?.id||s?.supplierId||s?.nit||s?.nombre||'';
      const name=s?.nombre||s?.razonSocial||s?.name||'';
      if(!name)return;
      select.innerHTML+=`<option value="${String(id).replace(/"/g,'&quot;')}">${String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`;
    }catch(e){console.warn('[VENTARA] supplier option',e)}});
  }catch(e){console.warn('[VENTARA] populate suppliers',e)}}

  function bindNewProduct(){try{
    const btn=document.getElementById('btnNewProduct')||document.querySelector('[data-target="#productModal"]');
    if(!btn||btn.dataset.ventaraSupplierSync==='1')return;
    btn.dataset.ventaraSupplierSync='1';
    btn.addEventListener('click',()=>{try{populateSuppliersOnce()}catch(e){console.warn('[VENTARA] supplier click',e)}},{passive:true});
  }catch(e){console.warn('[VENTARA] bind new product',e)}}

  function bindEditButtons(){try{
    const root=document.getElementById('products');
    if(!root)return;
    root.querySelectorAll('button').forEach(btn=>{try{
      const text=(btn.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^editar$/i.test(text)||btn.dataset.ventaraSupplierSync==='1')return;
      btn.dataset.ventaraSupplierSync='1';
      btn.addEventListener('click',()=>{try{populateSuppliersOnce()}catch(e){console.warn('[VENTARA] supplier edit',e)}},{passive:true});
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] bind edit buttons',e)}}

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
      const id=String(supplier.id||'');
      if(!id)return;
      const del=document.createElement('button');
      del.className='btn btn-sm btn-danger btn-delete-supplier';
      del.dataset.id=id;
      del.type='button';
      del.textContent='Eliminar';
      edit.parentElement?.appendChild(del);
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] inject delete',e)}}

  function refreshSupplierTable(){try{
    if(typeof window.renderSuppliers==='function')window.renderSuppliers();
    else injectDeleteButtons();
  }catch(e){console.warn('[VENTARA] refresh supplier table',e);injectDeleteButtons()}}

  function deleteSupplier(id){try{
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:null;
    if(!suppliers)return;
    const target=String(id||'');
    if(!target)return;
    if(!window.confirm('¿Desea eliminar este proveedor?'))return;
    const index=suppliers.findIndex(s=>String(s?.id||'')===target);
    if(index<0)return;
    suppliers.splice(index,1);
    try{if(typeof window.save==='function')window.save()}catch(e){console.warn('[VENTARA] supplier save',e)}
    try{if(typeof window.cloudSave==='function')Promise.resolve(window.cloudSave()).catch(e=>console.warn('[VENTARA] supplier cloud save',e))}catch(e){console.warn('[VENTARA] supplier cloud save',e)}
    refreshSupplierTable();
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
      deleteSupplier(btn.dataset.id);
    }catch(err){console.warn('[VENTARA] supplier delete click',err)}});
    injectDeleteButtons();
  }catch(e){console.warn('[VENTARA] bind supplier table',e)}}

  function boot(){try{
    bindNewProduct();
    bindEditButtons();
    bindSupplierTable();
  }catch(e){console.warn('[VENTARA] supplier boot',e)}}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});
  else setTimeout(boot,1000);

  window.populateSuppliersOnce=populateSuppliersOnce;
  window.syncSuppliersDropdown=populateSuppliersOnce;
  window.ventaraSupplierDefinitive={populateSuppliersOnce,deleteSupplier,injectDeleteButtons,refresh:boot};
})();
