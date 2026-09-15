/* VENTARA POS — lectura multi-fuente de proveedores, modulo aislado. */
(function(){
  'use strict';

  function getAllSuppliersInVentara(){
    try{
      if(window.db && Array.isArray(window.db.suppliers) && window.db.suppliers.length){
        return window.db.suppliers;
      }

      var found=[];
      for(var i=0;i<localStorage.length;i++){
        try{
          var key=localStorage.key(i);
          var raw=localStorage.getItem(key);
          if(!raw) continue;
          var parsed=JSON.parse(raw);

          if(Array.isArray(parsed) && parsed.length){
            var first=parsed[0]||{};
            if(first.nombre || first.name || first.razonSocial || first.empresa || String(key).toLowerCase().indexOf('supplier')!==-1){
              found=parsed;
              break;
            }
          }

          if(parsed && Array.isArray(parsed.suppliers) && parsed.suppliers.length){
            found=parsed.suppliers;
            break;
          }
        }catch(storageError){
          console.warn('[VENTARA] lectura proveedor',storageError);
        }
      }
      return found;
    }catch(error){
      console.warn('[VENTARA] getAllSuppliersInVentara',error);
      return [];
    }
  }

  function populateSupplierDropdown(){
    try{
      var select=document.getElementById('productSupplier');
      if(!select) return;

      var suppliers=getAllSuppliersInVentara();
      console.log('PROVEEDORES ENCONTRADOS EN MEMORIA:',suppliers);

      var current=String(select.value||'');
      select.innerHTML='<option value="">Sin Proveedor</option>';

      suppliers.forEach(function(supplier){
        try{
          var id=supplier && (supplier.id || supplier.supplierId || supplier._id || supplier.codigo || supplier.nombre || '');
          var name=supplier && (supplier.nombre || supplier.name || supplier.razonSocial || supplier.empresa || supplier.proveedor || id);
          if(!name) return;

          var option=document.createElement('option');
          option.value=String(id);
          option.textContent=String(name);
          select.appendChild(option);
        }catch(optionError){
          console.warn('[VENTARA] opcion proveedor',optionError);
        }
      });

      if(current) select.value=current;
    }catch(error){
      console.warn('[VENTARA] populateSupplierDropdown',error);
    }
  }

  function bindButtons(){
    try{
      var root=document.getElementById('products');
      if(root && !root.dataset.ventaraSupplierForceGlobal){
        root.dataset.ventaraSupplierForceGlobal='1';
        root.addEventListener('click',function(event){
          try{
            var button=event.target && event.target.closest ? event.target.closest('button') : null;
            var text=button ? String(button.textContent||'').trim() : '';
            if(/^\+?\s*nuevo artículo$|^\+?\s*nuevo articulo$|^editar$/i.test(text)){
              setTimeout(populateSupplierDropdown,100);
            }
          }catch(error){
            console.warn('[VENTARA] click proveedor',error);
          }
        });
      }

      if(document.body && !document.body.dataset.ventaraSupplierForceGlobal){
        document.body.dataset.ventaraSupplierForceGlobal='1';
        document.body.addEventListener('click',function(event){
          try{
            var target=event.target;
            if(target && target.closest && target.closest('#btnNewProduct, .btn-primary, [data-target="#productModal"]')){
              setTimeout(populateSupplierDropdown,100);
            }
          }catch(error){
            console.warn('[VENTARA] click global proveedor',error);
          }
        });
      }
    }catch(error){
      console.warn('[VENTARA] bindButtons proveedor',error);
    }
  }

  function boot(){
    try{
      bindButtons();
      populateSupplierDropdown();
    }catch(error){
      console.warn('[VENTARA] boot proveedor',error);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      setTimeout(boot,1000);
    },{once:true});
  }else{
    setTimeout(boot,1000);
  }

  window.ventaraSupplierForce={
    getAllSuppliersInVentara:getAllSuppliersInVentara,
    populateSupplierDropdown:populateSupplierDropdown,
    refresh:boot
  };
})();
