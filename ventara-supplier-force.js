/* VENTARA POS — carga universal de proveedores, modulo aislado. */
(()=>{
  'use strict';

  function getAllSuppliersInVentara(){try{
    let found=[];
    if(window.db&&Array.isArray(window.db.suppliers)&&window.db.suppliers.length>0){
      return window.db.suppliers;
    }
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      try{
        const parsed=JSON.parse(localStorage.getItem(key));
        if(Array.isArray(parsed)&&parsed.length>0){
          if(parsed[0].nombre||parsed[0].name||parsed[0].razonSocial||parsed[0].empresa||String(key).toLowerCase().includes('supplier')){
            found=parsed;break;
          }
        }else if(parsed&&Array.isArray(parsed.suppliers)&&parsed.suppliers.length>0){
          found=parsed.suppliers;break;
        }
      }catch(e){}
    }
    return found;
  }catch(e){return[]}}

  function forcePopulateSupplierSelect(){try{
    const select=document.getElementById('productSupplier');
    if(!select)return;
    const suppliers=getAllSuppliersInVentara();
    console.log('PROVEEDORES ENCONTRADOS EN MEMORIA:',suppliers);
    const current=String(select.value||'');
    select.innerHTML='<option value="">Sin Proveedor</option>';
    suppliers.forEach(s=>{try{
      const val=s?.id||s?.supplierId||s?._id||s?.codigo||s?.nombre||'';
      const text=s?.nombre||s?.name||s?.razonSocial||s?.empresa||s?.proveedor||val;
      if(text){
        const opt=document.createElement('option');
        opt.value=String(val);
        opt.textContent=String(text);
        select.appendChild(opt);
      }
    }catch(e){}});
    if(current)select.value=current;
  }catch(e){console.warn('[VENTARA] force supplier select',e)}}

  function bindButtons(){try{
    const root=document.getElementById('products');
    if(root&&!root.dataset.ventaraSupplierForceGlobal){
      root.dataset.ventaraSupplierForceGlobal='1';
      root.addEventListener('click',e=>{
        try{
          const b=e.target?.closest?.('button');
          const text=(b?.textContent||'').trim();
          if(/^\+?\s*nuevo artículo$|^\+?\s*nuevo articulo$|^editar$/i.test(text)){
            setTimeout(forcePopulateSupplierSelect,100);
          }
        }catch(err){console.warn('[VENTARA] supplier click',err)}});
    }
    if(!document.body.dataset.ventaraSupplierForceGlobal){
      document.body.dataset.ventaraSupplierForceGlobal='1';
      document.addEventListener('click',e=>{
        try{
          if(e.target?.closest?.('#btnNewProduct, .btn-primary, [data-target="#productModal"]')){
            setTimeout(forcePopulateSupplierSelect,100);
          }
        }catch(err){console.warn('[VENTARA] supplier global click',err)}});
    }
  }catch(e){console.warn('[VENTARA] supplier force bind',e)}}

  function boot(){try{bindButtons();forcePopulateSupplierSelect()}catch(e){console.warn('[VENTARA] supplier force boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});
  else setTimeout(boot,1000);
  window.ventaraSupplierForce={getAllSuppliersInVentara,forcePopulateSupplierSelect,refresh:boot};
})();
