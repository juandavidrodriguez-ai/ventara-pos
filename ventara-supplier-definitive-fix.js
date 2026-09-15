/* VENTARA POS — ajustes quirúrgicos definitivos de proveedores, módulo aislado. */
(()=>{
  'use strict';

  function syncSuppliersDropdown(){try{
    const select=document.getElementById('productSupplier');
    if(!select)return;
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
    const current=String(select.value||'');
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
    if(current)select.value=current;
  }catch(e){console.warn('[VENTARA] sync suppliers',e)}}

  function bindDirectProductButtons(){try{
    const root=document.getElementById('products');
    if(!root)return;
    root.querySelectorAll('button').forEach(b=>{try{
      if(b.dataset.ventaraSupplierSync==='1')return;
      const text=(b.textContent||'').replace(/\s+/g,' ').trim();
      if(/^\+?\s*nuevo artículo$|^\+?\s*nuevo articulo$|^editar$/i.test(text)){
        b.dataset.ventaraSupplierSync='1';
        b.addEventListener('click',()=>setTimeout(()=>{try{syncSuppliersDropdown()}catch(e){console.warn('[VENTARA] direct supplier sync',e)}},0));
      }
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] bind product supplier buttons',e)}}

  function injectDeleteButtons(){try{
    const root=document.getElementById('suppliers');
    if(!root)return;
    const body=root.querySelector('table tbody');
    if(!body)return;
    const list=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
    [...body.querySelectorAll('tr')].forEach((tr,i)=>{try{
      if(tr.querySelector('.btn-delete-supplier'))return;
      const supplier=list[i];
      if(!supplier)return;
      const edit=[...tr.querySelectorAll('button')].find(b=>/editar/i.test(b.textContent||''));
      if(!edit)return;
      const cell=edit.parentElement;
      if(!cell)return;
      const id=String(supplier.id||'');
      if(!id)return;
      const del=document.createElement('button');
      del.className='btn btn-sm btn-danger btn-delete-supplier';
      del.setAttribute('data-id',id);
      del.type='button';
      del.textContent='Eliminar';
      cell.appendChild(del);
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] inject supplier delete buttons',e)}}

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
    try{
      if(typeof window.renderSuppliers==='function')window.renderSuppliers();
      else injectDeleteButtons();
    }catch(e){console.warn('[VENTARA] supplier table refresh',e);injectDeleteButtons()}
    setTimeout(()=>{try{injectDeleteButtons()}catch(e){console.warn('[VENTARA] supplier post-render',e)}},0);
  }catch(e){console.warn('[VENTARA] delete supplier',e)}}

  function wireSupplierTable(){try{
    const root=document.getElementById('suppliers');
    if(!root)return;
    if(root.dataset.ventaraSupplierDelete!=='1'){
      root.dataset.ventaraSupplierDelete='1';
      root.addEventListener('click',e=>{try{
        const b=e.target?.closest?.('.btn-delete-supplier');
        if(!b)return;
        e.preventDefault();
        e.stopPropagation();
        deleteSupplier(b.getAttribute('data-id'));
      }catch(err){console.warn('[VENTARA] supplier delete click',err)}});
    }
    injectDeleteButtons();
    if(root.dataset.ventaraSupplierObserver!=='1'){
      root.dataset.ventaraSupplierObserver='1';
      const observer=new MutationObserver(()=>{try{injectDeleteButtons()}catch(e){console.warn('[VENTARA] supplier observer',e)}});
      observer.observe(root,{childList:true,subtree:true});
    }
  }catch(e){console.warn('[VENTARA] supplier table wire',e)}}

  function wireProducts(){try{
    const root=document.getElementById('products');
    if(!root)return;
    bindDirectProductButtons();
    if(root.dataset.ventaraSupplierObserver!=='1'){
      root.dataset.ventaraSupplierObserver='1';
      root.addEventListener('click',e=>{try{
        const b=e.target?.closest?.('button');
        const text=(b?.textContent||'').replace(/\s+/g,' ').trim();
        if(/^\+?\s*nuevo artículo$|^\+?\s*nuevo articulo$|^editar$/i.test(text))setTimeout(syncSuppliersDropdown,0);
      }catch(err){console.warn('[VENTARA] product supplier click',err)}},{capture:true});
      const observer=new MutationObserver(()=>{try{bindDirectProductButtons();syncSuppliersDropdown()}catch(e){console.warn('[VENTARA] product observer',e)}});
      observer.observe(root,{childList:true,subtree:true});
    }
  }catch(e){console.warn('[VENTARA] product wire',e)}}

  function wireModal(){try{
    const modalBox=document.getElementById('modalbox');
    if(!modalBox||modalBox.dataset.ventaraSupplierModal==='1')return;
    modalBox.dataset.ventaraSupplierModal='1';
    const observer=new MutationObserver(()=>{try{if(document.getElementById('productSupplier'))syncSuppliersDropdown()}catch(e){console.warn('[VENTARA] modal supplier observer',e)}});
    observer.observe(modalBox,{childList:true,subtree:true});
    if(document.getElementById('productSupplier'))syncSuppliersDropdown();
  }catch(e){console.warn('[VENTARA] modal wire',e)}}

  function boot(){try{
    wireProducts();
    wireSupplierTable();
    wireModal();
    syncSuppliersDropdown();
    injectDeleteButtons();
  }catch(e){console.warn('[VENTARA] definitive supplier boot',e)}}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});
  else setTimeout(boot,1000);

  window.syncSuppliersDropdown=syncSuppliersDropdown;
  window.ventaraSupplierDefinitive={syncSuppliersDropdown,deleteSupplier,injectDeleteButtons,refresh:boot};
})();
