/* VENTARA POS - Emergency isolated sale confirmation.
   Loads the existing safe module first so Categories/payment UI remain intact.
   No useEffect, no automatic print, no state mutation during render. */
(function(){
  'use strict';

  var script = document.createElement('script');
  script.src = '/ventara-sale-safe.js';
  script.async = false;
  script.onload = function(){
    installSafeConfirm();
  };
  script.onerror = function(){
    console.error('[VENTARA] No se pudo cargar el modulo seguro de venta.');
  };
  document.head.appendChild(script);

  function getDb(){
    try { return typeof db !== 'undefined' ? db : null; }
    catch(e){ return null; }
  }

  function money(v){
    try {
      return typeof window.money === 'function'
        ? window.money(v)
        : '$ ' + Number(v || 0).toLocaleString('es-CO');
    } catch(e){
      return '$ ' + Number(v || 0).toLocaleString('es-CO');
    }
  }

  function notify(message){
    try {
      if(typeof window.toast === 'function') window.toast(message);
      else alert(message);
    } catch(e){
      console.log('[VENTARA]', message);
    }
  }

  function totalSale(){
    var items = (typeof window.cart !== 'undefined' && Array.isArray(window.cart)) ? window.cart : [];
    var subtotal = items.reduce(function(sum,item){
      return sum + Number(item.qty || 0) * Number(item.price || 0);
    },0);
    var discount = Number(document.getElementById('posDiscount')?.value || 0);
    return Math.max(0, subtotal - discount);
  }

  function installSafeConfirm(){
    var previousFinish = window.finishSale;

    window.handleConfirmSale = async function(event){
      if(event){
        event.preventDefault();
        if(typeof event.stopPropagation === 'function') event.stopPropagation();
      }

      if(window.__ventaraConfirmBusy) return;

      var data = getDb();
      var items = (typeof window.cart !== 'undefined' && Array.isArray(window.cart)) ? window.cart : [];
      if(!data || !items.length){
        notify('No hay productos en la venta.');
        return;
      }

      var button = document.getElementById('ventaraConfirmSale');
      var total = totalSale();
      var paymentMethod = window.__ventaraPaymentMethod || 'Efectivo';

      /* Validate only the fields that already belong to the existing payment UI. */
      if(paymentMethod === 'Efectivo' && Number(document.getElementById('cashReceived')?.value || 0) < total){
        notify('El efectivo recibido es menor al total.');
        return;
      }
      if(paymentMethod === 'Tarjeta' && !document.getElementById('cardType')?.value){
        notify('Selecciona el tipo de tarjeta.');
        return;
      }
      if(paymentMethod === 'Transferencia' && !document.getElementById('transferProvider')?.value){
        notify('Selecciona el banco o billetera.');
        return;
      }
      if(paymentMethod === 'Mixto'){
        var mixCash = Number(document.getElementById('mixCash')?.value || 0);
        var mixOther = Number(document.getElementById('mixOther')?.value || 0);
        if(Math.abs(mixCash + mixOther - total) >= 0.005){
          notify('El pago mixto debe ser exactamente igual al total.');
          return;
        }
      }
      if(paymentMethod === 'Crédito' && !document.getElementById('creditClient')?.value){
        notify('Selecciona un cliente para vender a crédito.');
        return;
      }

      for(var i=0;i<items.length;i++){
        var line = items[i];
        var product = (data.products || []).find(function(p){ return p.id === line.id; });
        if(!product){
          notify('Producto no encontrado: ' + line.id);
          return;
        }
        if(Number(line.qty || 0) > Number(product.stock || 0)){
          notify('Stock insuficiente para ' + product.name);
          return;
        }
      }

      window.__ventaraConfirmBusy = true;
      if(button) button.disabled = true;

      try{
        if(typeof previousFinish !== 'function'){
          throw new Error('No existe el procesador de ventas principal.');
        }

        var before = new Set((data.sales || []).map(function(s){ return s.id; }));

        /* Exactly one call into the existing DB/inventory transaction. */
        var result = await Promise.resolve(previousFinish.call(window, paymentMethod, total));

        var sale = result || (data.sales || []).find(function(s){ return !before.has(s.id); });
        if(!sale){
          throw new Error('La venta no fue creada correctamente.');
        }

        /* Store ticket data only after the transaction has completed. */
        window.currentTicketData = sale;
        window.saleCompleted = true;

        if(typeof window.save === 'function') window.save();

        /* No automatic print. Ticket is shown only after successful persistence. */
        if(typeof window.offerTicket === 'function'){
          window.offerTicket(sale);
        } else if(typeof window.openModal === 'function'){
          window.openModal(
            '<h2>✓ Venta registrada con éxito</h2>' +
            '<p>La venta fue guardada correctamente.</p>' +
            '<div class="actions">' +
            '<button class="btn primary" type="button" onclick="window.print()">🖨 Imprimir Ticket POS</button>' +
            '<button class="btn" type="button" onclick="window.closeModal()">Cerrar / Nueva Venta</button>' +
            '</div>'
          );
        }

        notify('¡Venta registrada con éxito!');
      }catch(error){
        console.error('[VENTARA] Error al registrar la venta:', error);
        alert('Ocurrió un error al registrar la venta: ' + (error?.message || String(error)));
      }finally{
        window.__ventaraConfirmBusy = false;
        if(button) button.disabled = false;
      }
    };

    /* Rebind only the concrete confirmation button. */
    var confirmButton = document.getElementById('ventaraConfirmSale');
    if(confirmButton){
      confirmButton.type = 'button';
      confirmButton.onclick = window.handleConfirmSale;
    }
  }
})();
