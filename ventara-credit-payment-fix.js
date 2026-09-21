/* VENTARA POS — Corrección quirúrgica del pago a crédito v10. */
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

/*
 * Flujo seguro de crédito:
 * - crea SIEMPRE el payload antes de asignar propiedades;
 * - no escribe .clients sobre objetos externos/indefinidos;
 * - conserva la persistencia nativa de Ventara (confirmPayment -> finishSale -> save);
 * - no crea una tabla/flujo paralelo de ventas.
 */
async function procesarVentaCreditoSegura(totalVenta,e){
  let ventaCredito={};
  try{
    const selectCliente=document.getElementById('creditClientSelect') ||
      document.querySelector('#creditFields select');
    const clienteId=selectCliente ? selectCliente.value : null;
    const clienteNombre=selectCliente && selectCliente.selectedIndex>=0
      ? selectCliente.options[selectCliente.selectedIndex].text
      : '';

    if(!clienteId && !clienteNombre){
      alert('Selecciona un cliente válido.');
      return null;
    }

    ventaCredito={
      total:typeof totalVenta!=='undefined' ? (parseFloat(totalVenta)||0) : 0,
      metodo_pago:'credito',
      client_id:clienteId||null,
      cliente:clienteNombre||'',
      fecha:new Date().toISOString()
    };

    hideWarning();

    /*
     * IMPORTANTE: el proyecto actual no tiene public.ventas.
     * La persistencia real está en public.ventara_state mediante save().
     * Delegamos al confirmPayment nativo para no duplicar ni romper ventas.
     */
    const originalConfirm=window.__ventaraOriginalConfirmPayment;
    if(typeof originalConfirm==='function'){
      return originalConfirm.call(this,totalVenta,e);
    }

    throw new Error('No se encontró el flujo nativo de confirmación de venta.');
  }catch(err){
    console.error('Error capturado:',err,ventaCredito);
    alert('No se pudo registrar la venta a crédito: '+(err?.message||String(err)));
    return null;
  }
}
window.procesarVentaCreditoSegura=procesarVentaCreditoSegura;

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
    window.__ventaraOriginalConfirmPayment=originalConfirm;
    window.confirmPayment=function(total,e){
      if(!isCreditPayment())return originalConfirm.apply(this,arguments);
      return procesarVentaCreditoSegura.call(this,total,e);
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