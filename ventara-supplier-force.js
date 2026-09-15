/* VENTARA POS — lectura defensiva de proveedores, modulo aislado. */
(()=>{
  'use strict';
  try{
    console.log('=== VENTARA MEMORY CHECK ===');
    console.log('window.db:',window.db);
    console.log('localStorage keys:',Object.keys(localStorage));
    console.log('localStorage db_suppliers:',localStorage.getItem('db_suppliers'));
    console.log('localStorage suppliers:',localStorage.getItem('suppliers'));
  }catch(e){console.warn('[VENTARA] memory check',e)}

  function getSuppliersList(){try{
    if(window.db&&Array.isArray(window.db.suppliers)&&window.db.suppliers.length)return window.db.suppliers;
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      try{
        const raw=localStorage.getItem(key);if(!raw)continue;
        const item=JSON.parse(raw);
        if(Array.isArray(item)&&item.length&&(item[0].nombre||item[0].name||item[0].razonSocial))return item;
        if(item&&Array.isArray(item.suppliers)&&item.suppliers.length)return item.suppliers;
      }catch(e){console.warn('[VENTARA] storage scan',key,e)}
    }
  }catch(e){console.error('[VENTARA] supplier scan',e)}return[]}

  function populateSupplierDropdown(){try{
    const select=document.getElementById('productSupplier');if(!select)return;
    const suppliersList=getSuppliersList();
    const current=String(select.value||'');
    select.innerHTML='<option value="">Sin Proveedor</option>';
    suppliersList.forEach(s=>{try{
      const id=s?.id||s?.supplierId||s?._id||s?.codigo||s?.nombre||s?.name||'';
      const name=s?.nombre||s?.name||s?.razonSocial||s?.empresa||s?.proveedor||s?.nombreComercial||id;
      if(name){const opt=document.createElement('option');opt.value=String(id);opt.textContent=String(name);select.appendChild(opt)}
    }catch(e){console.warn('[VENTARA] supplier option',e)}});
    if(current)select.value=current;
  }catch(e){console.error('[VENTARA] populateSupplierDropdown',e)}}

  function bindButtons(){try{
    const root=document.getElementById('products');if(!root)return;
    root.querySelectorAll('button').forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(!/^\+?\s*nuevo artículo$|^\+?\s*nuevo articulo$|^editar$/i.test(text))return;
      if(btn.dataset.ventaraSupplierForce==='1')return;
      btn.dataset.ventaraSupplierForce='1';
      btn.addEventListener('click',()=>{try{
        populateSupplierDropdown();
        setTimeout(()=>populateSupplierDropdown(),0);
        setTimeout(()=>populateSupplierDropdown(),100);
      }catch(e){console.warn('[VENTARA] supplier force click',e)}});
    });
  }catch(e){console.warn('[VENTARA] supplier force bind',e)}}

  function boot(){try{bindButtons();populateSupplierDropdown()}catch(e){console.warn('[VENTARA] supplier force boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});else setTimeout(boot,1000);
  window.ventaraSupplierForce={getSuppliersList,populateSupplierDropdown,refresh:boot};
})();
