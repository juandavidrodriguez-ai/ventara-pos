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

const escapeHtml=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const getClients=()=>{
  try{
    const db=window.db;
    return Array.isArray(db?.clients)?db.clients:[];
  }catch{return []}
};

const rebuildClientSelect=()=>{
  const s=document.getElementById('creditClientSelect');
  if(!s)return false;
  const current=String(s.value||'');
  const clients=getClients().filter(c=>{
    const id=c?.id??c?.client_id;
    const name=c?.nombre??c?.name;
    return id!==undefined&&id!==null&&String(id)!=='0'&&String(name??'').trim()!=='';
  });
  s.innerHTML='<option value="">-- Selecciona un cliente --</option>'+clients.map(c=>{
    const id=c?.id??c?.client_id;
    const name=c?.nombre??c?.name;
    return '<option value="'+escapeHtml(id)+'">'+escapeHtml(name)+'</option>';
  }).join('');
  if(current&&Array.from(s.options).some(o=>String(o.value)===current))s.value=current;
  s.addEventListener('change',()=>{
    const id=String(s.value||'').trim();
    if(id&&id!=='0'&&id!=='undefined'){
      const client=getClients().find(c=>String(c?.id??c?.client_id)===id);
      if(client){
        if(client.id===undefined||client.id===null)client.id=client.client_id;
        window.posClient=client.id;
        hideWarning();
      }
    }
  },{once:false});
  if(s.value&&s.value!=='0'&&s.value!=='undefined'){
    const client=getClients().find(c=>String(c?.id??c?.client_id)===String(s.value));
    if(client){
      if(client.id===undefined||client.id===null)client.id=client.client_id;
      window.posClient=client.id;
      hideWarning();
    }
  }
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
      setTimeout(rebuildClientSelect,0);
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
        const selectedId=String(clientSelect?.value||'').trim();
        if(!selectedId||selectedId==='0'||selectedId==='undefined'){
          throw new Error('Debe seleccionar un cliente para vender a crédito');
        }

        const clients=getClients();
        const clienteEncontrado=clients.find(c=>String(c?.id??c?.client_id)===selectedId);
        if(!clienteEncontrado){
          throw new Error('No se encontró el cliente seleccionado en la memoria local.');
        }

        if(clienteEncontrado.id===undefined||clienteEncontrado.id===null){
          clienteEncontrado.id=clienteEncontrado.client_id;
        }
        window.posClient=clienteEncontrado.id;
        hideWarning();

        if(typeof window.finishSale!=='function'){
          throw new Error('No está disponible la función de registro de ventas.');
        }

        /* Crédito: se usa el flujo nativo de finishSale y únicamente se controla aquí el error. */
        const sale=window.finishSale('Crédito',total);
        if(!sale||!sale.id){
          throw new Error('La venta a crédito no pudo registrarse. Verifica el límite de crédito y los datos del cliente.');
        }

        if(typeof window.offerTicket==='function'){
          window.offerTicket(sale.id);
        }else if(typeof window.printTicket==='function'){
          window.printTicket(sale.id);
        }else{
          throw new Error('La venta fue registrada, pero no está disponible la función de impresión del ticket.');
        }

        return sale;
      }catch(error){
        console.error('[VENTARA] Error al registrar venta a crédito:',error);
        alert('No se pudo registrar la venta a crédito: '+(error?.message||String(error)));
        return null;
      }
    };
    window.__ventaraCreditConfirmPatched=true;
  }

  return rebuildClientSelect();
};

patchModal();
const observer=new MutationObserver(()=>patchModal());
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),30000);
})();