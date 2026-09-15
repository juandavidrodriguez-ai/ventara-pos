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

  function injectDeleteSupplierButtons(){try{
    const supplierRows=document.querySelectorAll('#suppliers table tbody tr, #suppliersView table tbody tr, .suppliers-table tbody tr');
    supplierRows.forEach(row=>{try{
      const actionsCell=row.querySelector('td:last-child');
      if(!actionsCell)return;
      if(actionsCell.querySelector('.btn-delete-supplier'))return;
      const editBtn=actionsCell.querySelector('button, .btn');
      if(!editBtn)return;

      const rowText=row.cells[0]?.textContent?.trim()||'';
      const rawId=editBtn.getAttribute('data-id')||'';
      const onclick=editBtn.getAttribute('onclick')||'';
      const idMatch=onclick.match(/['"]([^'"]+)['"]/);
      const supplierId=rawId||idMatch?.[1]||'';
      const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:[];
      const supplier=suppliers.find(s=>{
        const name=String(s?.nombre||s?.razonSocial||s?.name||'').trim();
        const id=String(s?.id||s?.supplierId||'');
        return (supplierId&&id===String(supplierId))||(rowText&&name===rowText);
      });
      const resolvedId=String(supplier?.id||supplier?.supplierId||supplierId||'');

      const deleteBtn=document.createElement('button');
      deleteBtn.className='btn btn-sm btn-danger btn-delete-supplier ms-1';
      deleteBtn.style.marginLeft='5px';
      deleteBtn.type='button';
      deleteBtn.textContent='Eliminar';
      deleteBtn.setAttribute('data-id',resolvedId);
      deleteBtn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        if(confirm('¿Está seguro de que desea eliminar este proveedor?')){
          deleteSupplier(resolvedId,rowText);
        }
      });
      actionsCell.appendChild(deleteBtn);
    }catch(e){console.warn('[VENTARA] supplier row injection',e)}});
  }catch(e){console.warn('[VENTARA] supplier button injection',e)}}

  function deleteSupplier(id,rowText=''){try{
    const suppliers=(window.db&&Array.isArray(window.db.suppliers))?window.db.suppliers:null;
    if(!suppliers)return;
    const target=String(id||'');
    if(!target&&!rowText)return;
    window.db.suppliers=suppliers.filter(s=>{
      const sid=String(s?.id||s?.supplierId||'');
      const name=String(s?.nombre||s?.razonSocial||s?.name||'').trim();
      return target ? sid!==target : name!==String(rowText||'').trim();
    });
    try{if(typeof window.saveDb==='function')window.saveDb();else if(typeof window.save==='function')window.save()}catch(e){console.warn('[VENTARA] supplier save',e)}
    try{if(typeof window.cloudSave==='function')Promise.resolve(window.cloudSave()).catch(e=>console.warn('[VENTARA] supplier cloud save',e))}catch(e){console.warn('[VENTARA] supplier cloud save',e)}
    try{if(typeof window.renderSuppliers==='function')window.renderSuppliers()}catch(e){console.warn('[VENTARA] supplier table refresh',e)}
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
      if(confirm('¿Está seguro de que desea eliminar este proveedor?'))deleteSupplier(btn.getAttribute('data-id'),btn.closest('tr')?.cells[0]?.textContent||'');
    }catch(err){console.warn('[VENTARA] supplier delete click',err)}});
    injectDeleteSupplierButtons();
  }catch(e){console.warn('[VENTARA] bind supplier table',e)}}

  function bindSupplierView(){try{
    const navs=document.querySelectorAll('.nav, [data-page], button');
    navs.forEach(el=>{try{
      const text=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      const page=String(el.getAttribute('data-page')||'').toLowerCase();
      if(!text.includes('proveedor')&&!page.includes('supplier'))return;
      if(el.dataset.ventaraSupplierView==='1')return;
      el.dataset.ventaraSupplierView='1';
      el.addEventListener('click',()=>setTimeout(injectDeleteSupplierButtons,0),{passive:true});
    }catch(e){}});
  }catch(e){console.warn('[VENTARA] supplier view bind',e)}}

  function bindSupplierObserver(){try{
    const root=document.getElementById('suppliers');
    if(!root||root.dataset.ventaraSupplierObserver==='1'||typeof MutationObserver==='undefined')return;
    root.dataset.ventaraSupplierObserver='1';
    const observer=new MutationObserver(()=>{try{injectDeleteSupplierButtons()}catch(e){console.warn('[VENTARA] supplier observer',e)}});
    observer.observe(root,{childList:true,subtree:true});
  }catch(e){console.warn('[VENTARA] supplier observer bind',e)}}

  function boot(){try{
    bindDirectProductButtons();
    bindProductsRoot();
    bindSupplierTable();
    bindSupplierView();
    bindSupplierObserver();
    injectDeleteSupplierButtons();
  }catch(e){console.warn('[VENTARA] supplier boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});
  else setTimeout(boot,1000);

  window.populateSupplierSelectOnce=populateSupplierSelectOnce;
  window.populateSuppliersOnce=populateSupplierSelectOnce;
  window.syncSuppliersDropdown=populateSupplierSelectOnce;
  window.injectDeleteSupplierButtons=injectDeleteSupplierButtons;
  window.ventaraSupplierDefinitive={populateSupplierSelectOnce,deleteSupplier,injectDeleteSupplierButtons,refresh:boot};
})();
