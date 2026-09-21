/* VENTARA POS — Corrección quirúrgica del pago a crédito. */
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

const escapeHtml=value=>String(value??'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const normalizeClientSelect=()=>{
  const s=document.getElementById('creditClientSelect');
  if(!s)return false;

  /*
   * El selector nativo de index.html ya se construye con los clientes reales.
   * Aquí solo repara opciones cuyo value haya quedado como nombre en lugar del ID.
   * No accede a window.db: el objeto db del POS vive en el ámbito léxico de index.html.
   */
  Array.from(s.options).forEach(o=>{
    if(!o.value||o.value==='0'||o.value==='undefined')return;
    const label=String(o.textContent||o.text||'').trim();
    const optionId=o.getAttribute('data-id');
    if(optionId){
      o.value=String(optionId);
      return;
    }
    /*
     * Si el value ya es un identificador, se conserva. No se inventa ni se
     * crea ningún cliente en memoria.
     */
    if(label&&o.value.trim().toLowerCase()===label.toLowerCase()){
      const inferredId=o.getAttribute('data-client-id');
      if(inferredId)o.value=String(inferredId);
    }
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

      try{
        const creditSelect=document.getElementById('creditClientSelect');
        const selectedOption=creditSelect?.options?.[creditSelect.selectedIndex];

        /* Lectura directa del DOM, como requiere el flujo de crédito. */
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
          alert('Por favor selecciona un cliente válido.');
          return null;
        }

        /*
         * No se crea payloadVenta ni se escribe sobre window.db.clients.
         * La persistencia actual de Ventara usa finishSale()/save() y el objeto
         * db de index.html está fuera del alcance léxico de este archivo.
         * El confirmPayment original también valida crédito, registra la venta,
         * limpia el carrito y abre el flujo de ticket.
         */
        if(creditSelect&&selectedClientId){
          creditSelect.value=selectedClientId;
        }

        hideWarning();

        /*
         * Devolvemos el control al flujo nativo. Esto es deliberado: confirmPayment
         * original lee creditClientSelect.value y usa el cliente real de db.clients.
         * Así evitamos duplicar la escritura/persistencia y no tocamos efectivo,
         * tarjeta ni transferencia.
         */
        return originalConfirm.call(this,total,e);
      }catch(error){
        console.error('[VENTARA] Error al procesar crédito:',error);
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