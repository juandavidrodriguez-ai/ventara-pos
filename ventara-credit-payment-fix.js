/* VENTARA POS — Corrección aislada de cliente para pago a crédito. */
(()=>{'use strict';
if(window.__ventaraCreditPaymentFix)return;
window.__ventaraCreditPaymentFix=true;

const hideWarning=()=>{const w=document.getElementById('creditWarning');if(w){w.style.display='none';w.textContent=''}};
const normalizeSelect=()=>{
  const s=document.getElementById('creditClientSelect');
  if(!s)return false;
  Array.from(s.options).forEach(o=>{
    if(o.value==='undefined'||o.value==='null')o.value='';
  });
  s.addEventListener('change',()=>{
    const id=String(s.value||'').trim();
    if(id&&id!=='0'&&id!=='undefined'){window.posClient=id;hideWarning()}
  },{once:false});
  if(s.value&&s.value!=='0'&&s.value!=='undefined'){window.posClient=String(s.value);hideWarning()}
  return true;
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
      try{
        if(window.selectedPay==='Crédito'){
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
      }catch(err){console.error('[VENTARA] credit payment validation',err)}
      return originalConfirm.apply(this,arguments);
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