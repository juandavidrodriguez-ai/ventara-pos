/* VENTARA POS — Corrección aislada de cliente y cierre seguro de pago a crédito. */
(()=>{'use strict';
if(window.__ventaraCreditPaymentFix)return;
window.__ventaraCreditPaymentFix=true;

const hideWarning=()=>{
  const w=document.getElementById('creditWarning');
  if(w){w.style.display='none';w.textContent=''}
};

const isCreditPayment=()=>{
  return window.selectedPay==='Crédito'||window.__ventaraPaymentMethod==='Crédito';
};

const normalizeSelect=()=>{
  const s=document.getElementById('creditClientSelect');
  if(!s)return false;
  Array.from(s.options).forEach(o=>{
    if(o.value==='undefined'||o.value==='null')o.value='';
  });
  s.addEventListener('change',()=>{
    const id=String(s.value||'').trim();
    if(id&&id!=='0'&&id!=='undefined'){
      window.posClient=id;
      hideWarning();
    }
  },{once:false});
  if(s.value&&s.value!=='0'&&s.value!=='undefined'){
    window.posClient=String(s.value);
    hideWarning();
  }
  return true;
};

const findNewSale=(before)=>{
  try{
    const list=Array.isArray(window.db?.sales)?window.db.sales:[];
    return list.find(s=>!before.has(s.id));
  }catch(e){
    console.warn('[VENTARA] no se pudo inspeccionar la venta creada',e);
    return null;
  }
};

const showTicketAfterCreditSave=(sale)=>{
  if(!sale)return false;
  try{
    window.currentTicketData=sale;
    window.saleCompleted=true;
    if(typeof window.save==='function')window.save();
    if(typeof window.offerTicket==='function'){
      window.offerTicket(sale);
      return true;
    }
    if(typeof window.printTicket==='function'){
      window.printTicket(sale.id);
      return true;
    }
    if(typeof window.openModal==='function'){
      window.openModal(
        '<h2>✓ Venta registrada con éxito</h2>'+
        '<p>La venta a crédito fue guardada. El ticket está listo.</p>'+
        '<div class="actions">'+
        '<button class="btn primary" type="button" onclick="window.print()">🖨 Imprimir Ticket POS</button>'+
        '<button class="btn" type="button" onclick="window.closeModal()">Cerrar / Nueva Venta</button>'+
        '</div>'
      );
      return true;
    }
  }catch(err){
    console.error('[VENTARA] Error al mostrar ticket de crédito',err);
  }
  return false;
};

const patchModal=()=>{
  if(typeof window.openPaymentModalPOS==='function'&&!window.__ventaraCreditOpenPatched){
    const originalOpen=window.openPaymentModalPOS;
    window.openPaymentModalPOS=function(){
      const result=originalOpen.apply(this,arguments);
      setTimeout(normalizeSelect,0);
      return result;
    };
    window.__ventaraCreditOpenPatched=true;
  }

  if(typeof window.confirmPayment==='function'&&!window.__ventaraCreditConfirmPatched){
    const originalConfirm=window.confirmPayment;
    window.confirmPayment=function(total,e){
      const credit=isCreditPayment();
      try{
        if(credit){
          const clientSelect=document.getElementById('creditClientSelect');
          const selectedClientId=clientSelect?String(clientSelect.value||'').trim():'';
          if(!selectedClientId||selectedClientId==='0'||selectedClientId==='undefined'){
            const w=document.getElementById('creditWarning');
            if(w){w.style.display='block';w.textContent='Selecciona un cliente para vender a crédito';}
            if(clientSelect)clientSelect.focus();
            return;
          }
          window.posClient=selectedClientId;
          hideWarning();
        }

        /* Efectivo/Tarjeta/Transferencia/Mixto siguen exactamente por la función nativa. */
        if(!credit)return originalConfirm.apply(this,arguments);

        const before=new Set(
          Array.isArray(window.db?.sales)?window.db.sales.map(s=>s.id):[]
        );

        try{
          return originalConfirm.apply(this,arguments);
        }catch(err){
          console.error('[VENTARA] Error interno al registrar venta a crédito:',err);

          /* Si la venta ya quedó insertada pero una operación posterior falló,
             no se pierde el flujo: recuperamos esa venta y mostramos su ticket. */
          const sale=findNewSale(before);
          if(sale){
            try{
              if(!sale.created_at)sale.created_at=new Date().toISOString();
              if(!sale.status)sale.status='Crédito';
              if(!sale.clientId)sale.clientId=window.posClient;
              if(!sale.total)sale.total=Number(total)||0;
              if(typeof window.clearCart==='function')window.clearCart();
            }catch(normalizeErr){
              console.warn('[VENTARA] normalización final de crédito',normalizeErr);
            }

            if(showTicketAfterCreditSave(sale)){
              if(typeof window.toast==='function')window.toast('Venta a crédito registrada. Ticket listo para imprimir.');
              return sale;
            }
          }

          if(typeof window.toast==='function')
            window.toast('La venta a crédito no pudo finalizar. Revisa la consola para ver el detalle.');
          return;
        }
      }catch(err){
        console.error('[VENTARA] Error en confirmación de crédito:',err);
        if(credit&&typeof window.toast==='function')
          window.toast('No se pudo completar la venta a crédito.');
        return;
      }
    };
    window.__ventaraCreditConfirmPatched=true;
  }

  return normalizeSelect();
};

patchModal();
const observer=new MutationObserver(()=>patchModal());
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),30000);
})();