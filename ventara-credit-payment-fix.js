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
  const clients=getClients().filter(c=>{
    const id=c?.id??c?.client_id??c?.cedula;
    const name=c?.nombre??c?.name??c?.razon_social;
    return id!==undefined&&id!==null&&String(id)!=='0'&&String(name??'').trim()!=='';
  });
  const signature=clients.map(c=>String(c?.id??c?.client_id??c?.cedula)+'|'+String(c?.nombre??c?.name??c?.razon_social??'')).join('||');
  if(s.dataset.ventaraClientSignature!==signature){
    s.innerHTML='<option value="">-- Selecciona un cliente --</option>'+clients.map(c=>{
      const id=c?.id??c?.client_id??c?.cedula;
      const name=c?.nombre??c?.name??c?.razon_social;
      return '<option value="'+escapeHtml(id)+'">'+escapeHtml(name)+'</option>';
    }).join('');
    s.dataset.ventaraClientSignature=signature;
  }

  /* Corrige también selectores que hayan sido llenados por otro código con el nombre como value. */
  Array.from(s.options).forEach(o=>{
    if(!o.value||o.value==='0'||o.value==='undefined')return;
    const byId=clients.find(c=>String(c?.id??c?.client_id??c?.cedula)===String(o.value));
    if(byId){
      const id=byId?.id??byId?.client_id??byId?.cedula;
      o.value=String(id);
      return;
    }
    const label=String(o.textContent||'').trim().toLowerCase();
    const byName=clients.find(c=>String(c?.nombre??c?.name??c?.razon_social??'').trim().toLowerCase()===label);
    if(byName){
      const id=byName?.id??byName?.client_id??byName?.cedula;
      o.value=String(id);
    }
  });

  s.addEventListener('change',()=>{
    const option=s.options[s.selectedIndex];
    const rawId=String(s.value||'').trim();
    const label=String(option?.textContent||'').trim().toLowerCase();
    const client=clients.find(c=>String(c?.id??c?.client_id??c?.cedula)===rawId)||
      clients.find(c=>String(c?.nombre??c?.name??c?.razon_social??'').trim().toLowerCase()===label);
    if(client){
      const id=client?.id??client?.client_id??client?.cedula;
      if(client.id===undefined||client.id===null)client.id=id;
      if(option)option.value=String(id);
      s.value=String(id);
      window.posClient=client.id;
      hideWarning();
    }
  },{once:false});

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
        const option=clientSelect?.options?.[clientSelect.selectedIndex];
        const selectedVal=String(clientSelect?.value||'').trim();
        const selectedName=String(option?.textContent||'').trim();
        if(!selectedVal||selectedVal==='0'||selectedVal==='undefined'){
          throw new Error('Debe seleccionar un cliente para vender a crédito');
        }

        const clients=getClients();
        /* Mapeo flexible: acepta id, client_id, cedula o id_cliente y normaliza el tipo. */
        let clienteEncontrado=clients.find(c=>{
          const idCliente=String(c?.id??c?.client_id??c?.cedula??c?.id_cliente??'').trim();
          return idCliente===selectedVal&&idCliente!=='';
        });

        /* Respaldo de emergencia: si el select recibió el nombre como value, resolver por nombre. */
        if(!clienteEncontrado){
          const nombreSeleccionado=selectedName.trim().toLowerCase();
          clienteEncontrado=clients.find(c=>
            String(c?.nombre??c?.name??c?.razon_social??'').trim().toLowerCase()===selectedVal.toLowerCase()
          )||clients.find(c=>
            String(c?.nombre??c?.name??c?.razon_social??'').trim().toLowerCase()===nombreSeleccionado
          );
        }
        if(!clienteEncontrado){
          throw new Error('No se pudo mapear el cliente de la lista desplegable.');
        }

        const clienteId=clienteEncontrado?.id??clienteEncontrado?.client_id??clienteEncontrado?.cedula??clienteEncontrado?.id_cliente;
        if(clienteId===undefined||clienteId===null||String(clienteId).trim()===''){
          throw new Error('El cliente seleccionado no tiene un ID válido.');
        }

        /* Normaliza el selector y el objeto antes de entrar al flujo nativo de venta. */
        if(clienteEncontrado.id===undefined||clienteEncontrado.id===null){
          clienteEncontrado.id=clienteId;
        }
        if(option)option.value=String(clienteId);
        if(clientSelect)clientSelect.value=String(clienteId);
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