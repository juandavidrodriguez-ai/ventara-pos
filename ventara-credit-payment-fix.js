/* VENTARA POS — Corrección aislada de cliente y cierre seguro de pago a crédito. */
(()=>{'use strict';
if(window.__ventaraCreditPaymentFix)return;
window.__ventaraCreditPaymentFix=true;

const hideWarning=()=>{const w=document.getElementById('creditWarning');if(w){w.style.display='none';w.textContent=''}};

const isCreditPayment=()=>{
  const selected=document.querySelector('.payment-grid button.selected');
  return window.selectedPay==='Crédito'||
    window.__ventaraPaymentMethod==='Crédito'||
    selected?.id==='pm-Crédito'||
    document.getElementById('creditFields')?.style.display!=='none';
};

const normalizeSelect=()=>{
  const s=document.getElementById('creditClientSelect');
  if(!s)return false;
  Array.from(s.options).forEach(o=>{if(o.value==='undefined'||o.value==='null')o.value=''});
  s.addEventListener('change',()=>{
    const id=String(s.value||'').trim();
    if(id&&id!=='0'&&id!=='undefined'){window.posClient=id;hideWarning()}
  });
  if(s.value&&s.value!=='0'&&s.value!=='undefined'){window.posClient=String(s.value);hideWarning()}
  return true;
};

const getDb=()=>{try{return window.db&&typeof window.db==='object'?window.db:null}catch{return null}};
const findNewSale=(before)=>{
  const list=Array.isArray(getDb()?.sales)?getDb().sales:[];
  return list.find(s=>!before.has(s.id))||null;
};

const showTicketAfterCreditSave=(sale)=>{
  if(!sale)return false;
  try{
    window.currentTicketData=sale;
    if(typeof window.offerTicket==='function'){window.offerTicket(sale.id);return true}
    if(typeof window.printTicket==='function'){window.printTicket(sale.id);return true}
  }catch(err){console.error('[VENTARA] Error al emitir ticket de crédito:',err)}
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
      if(!credit)return originalConfirm.apply(this,arguments);

      try{
        const clientSelect=document.getElementById('creditClientSelect');
        const rawId=clientSelect?String(clientSelect.value||'').trim():'';
        if(!rawId||rawId==='0'||rawId==='undefined')throw new Error('Debe seleccionar un cliente');

        /* finishSale() compara client.id con ===. Conservamos el tipo real del ID. */
        const db=getDb();
        const clients=Array.isArray(db?.clients)?db.clients:[];
        const client=clients.find(c=>String(c?.id)===rawId);
        if(!client)throw new Error('No se encontró el cliente seleccionado');

        window.posClient=client.id;
        hideWarning();

        const before=new Set(Array.isArray(db?.sales)?db.sales.map(s=>s.id):[]);
        let result;

        try{
          result=originalConfirm.apply(this,arguments);
        }catch(innerError){
          console.error('[VENTARA] Error al registrar venta a crédito:',innerError);
          throw innerError;
        }

        /* La función nativa devuelve la venta cuando finishSale() termina correctamente. */
        if(result&&result.id){
          return result;
        }

        /* Si una operación posterior dejó la venta creada, no bloqueamos el ticket. */
        const sale=findNewSale(before);
        if(sale){
          try{
            if(!sale.clientId)sale.clientId=client.id;
            if(!sale.total)sale.total=Number(total)||0;
            if(!sale.created_at)sale.created_at=new Date().toISOString();
            if(!sale.status)sale.status='Crédito';
            if(typeof window.save==='function')window.save();
          }catch(normalizeError){console.warn('[VENTARA] normalización final de crédito',normalizeError)}
          showTicketAfterCreditSave(sale);
          return sale;
        }

        return result;
      }catch(error){
        console.error('[VENTARA] Error al registrar venta a crédito:',error);
        alert('No se pudo registrar la venta a crédito: '+(error?.message||String(error)));
        return null;
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