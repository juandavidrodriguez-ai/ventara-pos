/* VENTARA POS - Complementos quirúrgicos para clientes de crédito.
   NO reemplaza ni redefine selectPay, renderPaymentFields,
   openPaymentModalPOS ni confirmPayment. El core conserva el control. */
(()=>{
'use strict';
const isTruthy=v=>v===true||v===1||['true','1','si','sí','yes','habilitado','autorizado','activo'].includes(String(v??'').trim().toLowerCase());
const clientName=c=>String(c?.name??c?.fullName??c?.nombre??c?.razonSocial??c?.razon_social??'').trim();
const isActive=c=>{try{return !!c&&c.id&&clientName(c).toLowerCase()!=='consumidor final'&&c.active!==false&&c.activo!==false&&c.enabled!==false}catch(e){return false}};
const hasCredit=c=>{try{return isTruthy(c?.hasCredit)||isTruthy(c?.allowCredit)||isTruthy(c?.creditEnabled)||Number(c?.creditLimit)>0||Number(c?.credit)>0}catch(e){return false}};
const clients=()=>{try{
  const source=typeof db!=='undefined'&&Array.isArray(db?.clients)?db.clients:(Array.isArray(window.db?.clients)?window.db.clients:[]);
  const active=source.filter(isActive), configured=active.filter(hasCredit);
  return configured.length?configured:active;
}catch(e){console.error('[VENTARA] credit clients complement',e);return[]}};
const restoreNativeCreditSelect=()=>{try{
  const select=document.getElementById('creditClientSelect');
  if(!select)return;
  /* El core ya lo puebla. Solo intervenimos si quedó vacío, sin reemplazar su lógica. */
  if(select.options.length>1)return;
  const list=clients();
  if(!list.length)return;
  const current=String(select.value||'');
  select.innerHTML='<option value="">-- Selecciona un cliente --</option>';
  list.forEach(c=>{
    const option=document.createElement('option');
    option.value=String(c.id);
    option.textContent=clientName(c)||'Cliente';
    select.appendChild(option);
  });
  if(list.some(c=>String(c.id)===current))select.value=current;
}catch(e){console.error('[VENTARA] credit selector complement',e)}};
const normalizeCreditClient=()=>{try{
  const fields=document.getElementById('creditFields');
  const select=document.getElementById('creditClientSelect');
  if(!fields||!select||fields.style.display==='none'||!select.value)return;
  const source=typeof db!=='undefined'&&Array.isArray(db?.clients)?db.clients:(Array.isArray(window.db?.clients)?window.db.clients:[]);
  const client=source.find(c=>String(c?.id)===String(select.value));
  if(!client)return;
  /* El core finishSale usa client.credit. Algunas fichas solo traen creditLimit. */
  const limit=Number(client.creditLimit);
  const currentCredit=Number(client.credit);
  if(!Number.isFinite(currentCredit)||currentCredit<0){
    if(Number.isFinite(limit)&&limit>0)client.credit=limit;
    else if(isTruthy(client.hasCredit)||isTruthy(client.allowCredit)||isTruthy(client.creditEnabled))client.credit=999999999;
  }
  if(client.balance==null||!Number.isFinite(Number(client.balance)))client.balance=0;
  if(client.creditEnabled==null&&(isTruthy(client.hasCredit)||isTruthy(client.allowCredit)))client.creditEnabled=true;
  /* Datos opcionales: no se fuerzan campos de cliente que el core no necesita para guardar la venta. */
}catch(e){console.error('[VENTARA] credit client normalization',e)}};
function onDocumentClick(event){try{
  const target=event.target?.closest?.('button');
  if(!target)return;
  if(target.id==='pm-Crédito'){setTimeout(restoreNativeCreditSelect,0);return;}
  const text=String(target.textContent||'').toUpperCase();
  if(text.includes('CONFIRMAR Y REGISTRAR VENTA'))normalizeCreditClient();
}catch(e){console.error('[VENTARA] payment complement click',e)}}
function boot(){try{document.addEventListener('click',onDocumentClick,true)}catch(e){console.error('[VENTARA] payment complement boot',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
