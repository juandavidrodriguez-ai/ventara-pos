/* VENTARA POS — Corrección quirúrgica del pago a crédito v9. */
(()=>{'use strict';
if(window.__ventaraCreditPaymentFix)return;
window.__ventaraCreditPaymentFix=true;

const hideWarning=()=>{
  const w=document.getElementById('creditWarning');
  if(w){w.style.display='none';w.textContent=''}
};

const isCreditPayment=()=>{
  const selected=document.querySelector('.payment-grid button.selected');
  return selected?.id==='pm-Crédito' ||
    document.getElementById('creditFields')?.style.display!=='none';
};

const normalizeClientSelect=()=>{
  const s=document.getElementById('creditClientSelect');
  if(!s)return false;
  Array.from(s.options).forEach(o=>{
    const optionId=o.getAttribute('data-id');
    if(optionId)o.value=String(optionId);
  });
  return true;
};

const patchModal=()=>{
  if(typeof window.openPaymentModalPOS==='function'&&!window.__ventaraCreditOpenPatched){
    const originalOpen=window.openPaymentModalPOS;
    window.openPaymentModalPOS=function(){
      const result=originalOpen.apply(this,arguments);
      setTimeout(normalizeClientSelect,0);
      return result;
    };
    window.__ventaraCreditOpenPatched=true;
  }

  if(typeof window.confirmPayment==='function'&&!window.__ventaraCreditConfirmPatched){
    const originalConfirm=window.confirmPayment;
    window.confirmPayment=function(total,e){
      if(!isCreditPayment())return originalConfirm.apply(this,arguments);

      let salePayload={};
      try{
        const creditSelect=document.getElementById('creditClientSelect');
        const selectedOption=creditSelect?.options?.[creditSelect.selectedIndex];

        const selectedClientId=String(
          creditSelect?.value ||
          selectedOption?.getAttribute('data-id') ||
          ''
        ).trim();

        const selectedClientName=String(
          selectedOption?.text ||
          selectedOption?.innerText ||
          ''
        ).trim();

        if(!selectedClientId&&!selectedClientName){
          alert('Selecciona un cliente válido.');
          return null;
        }

        /*
         * Payload local seguro. No se escribe ninguna propiedad .clients sobre
         * un objeto indefinido y no se crea una estructura paralela de ventas.
         */
        salePayload={
          total:parseFloat(total)||0,
          payment_method:'credito',
          fecha:new Date().toISOString(),
          client_id:selectedClientId||null,
          client_name:selectedClientName
        };

        if(creditSelect&&selectedClientId)creditSelect.value=selectedClientId;
        hideWarning();

        /*
         * La persistencia real de Ventara está encapsulada en el flujo nativo
         * confirmPayment -> finishSale -> save(). Se conserva ese flujo para
         * mantener la estructura actual de Supabase/ventara_state.
         */
        return originalConfirm.call(this,total,e);
      }catch(error){
        console.error('[VENTARA] Error al procesar crédito:',error,salePayload);
        alert('No se pudo registrar la venta a crédito: '+(error?.message||String(error)));
        return null;
      }
    };
    window.__ventaraCreditConfirmPatched=true;
  }

  return normalizeClientSelect();
};

patchModal();
const observer=new MutationObserver(()=>patchModal());
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),30000);
})();