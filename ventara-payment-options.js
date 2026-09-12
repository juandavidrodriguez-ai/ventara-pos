/* VENTARA POS - Campos secundarios por forma de pago.
   Solo controla la interfaz/validación del modal; no registra ventas ni modifica inventario. */
(()=>{
  'use strict';
  const totalNow=()=>{
    try{
      const subtotal=(cart||[]).reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.price)||0),0);
      const discount=Number(document.getElementById('posDiscount')?.value||0);
      return Math.max(0,subtotal-discount);
    }catch(e){return 0}
  };
  const paymentState=(total)=>{
    const b=document.getElementById('ventaraConfirmSale');
    if(!b)return;
    let ok=true;
    if(selectedPay==='Efectivo')ok=Number(document.getElementById('cashReceived')?.value||0)>=total;
    if(selectedPay==='Tarjeta')ok=!!document.getElementById('cardType')?.value;
    if(selectedPay==='Transferencia')ok=!!document.getElementById('transferProvider')?.value;
    if(selectedPay==='Mixto'){
      const a=Number(document.getElementById('mixCash')?.value||0);
      const c=Number(document.getElementById('mixOther')?.value||0);
      ok=Math.round(a*100)+Math.round(c*100)===Math.round(total*100);
    }
    if(selectedPay==='Crédito')ok=!!document.getElementById('creditClient')?.value;
    b.disabled=!ok||!!window.__ventaraSaleBusy;
  };
  window.renderPaymentFields=function(total){
    const el=document.getElementById('paymentFields');if(!el)return;
    if(selectedPay==='Efectivo'){
      el.innerHTML=`<div class="field"><label>EFECTIVO RECIBIDO</label><input id="cashReceived" type="number" min="0" step="0.01" value="${total}" oninput="window.updatePaymentState(${total})"><div class="totalline"><span>Cambio</span><b id="cashChange">${money(0)}</b></div></div>`;
    }else if(selectedPay==='Tarjeta'){
      el.innerHTML=`<div class="field"><label>TIPO DE TARJETA *</label><select id="cardType" onchange="window.updatePaymentState(${total})"><option value="">Selecciona...</option><option value="Débito">Débito</option><option value="Crédito Visa">Crédito Visa</option><option value="Crédito Mastercard">Crédito Mastercard</option><option value="Otra">Otra</option></select></div>`;
    }else if(selectedPay==='Transferencia'){
      el.innerHTML=`<div class="field"><label>BANCO / BILLETERA *</label><select id="transferProvider" onchange="window.updatePaymentState(${total})"><option value="">Selecciona...</option><option value="Nequi">Nequi</option><option value="Daviplata">Daviplata</option><option value="Bancolombia">Bancolombia</option><option value="Otros">Otros</option></select></div>`;
    }else if(selectedPay==='Mixto'){
      el.innerHTML=`<div class="form"><div class="field"><label>EFECTIVO *</label><input id="mixCash" type="number" min="0" step="0.01" value="0" oninput="window.updatePaymentState(${total})"></div><div class="field"><label>TARJETA / TRANSFERENCIA *</label><input id="mixOther" type="number" min="0" step="0.01" value="${total}" oninput="window.updatePaymentState(${total})"></div></div><p id="mixStatus" class="muted">La suma debe ser exactamente ${money(total)}.</p>`;
    }else{
      const clients=(db.clients||[]).filter(c=>c&&c.id&&c.id!=='c1');
      el.innerHTML=`<div class="field"><label>CLIENTE PARA CRÉDITO *</label><select id="creditClient" onchange="posClient=this.value;window.updatePaymentState(${total})"><option value="">Selecciona un cliente...</option>${clients.map(c=>`<option value="${c.id}">${c.name} · ${c.doc||c.nit||'Sin documento'}</option>`).join('')}</select>${clients.length?'':'<div class="muted" style="margin-top:8px;color:#b91c1c">No hay clientes habilitados para crédito.</div>'}<div class="muted" style="margin-top:7px">Selecciona un cliente real para asignar la cuenta por cobrar.</div></div>`;
    }
    window.updatePaymentState(total);
  };
  window.updatePaymentState=function(total){
    if(selectedPay==='Efectivo'){
      const r=Number(document.getElementById('cashReceived')?.value||0);
      const ch=document.getElementById('cashChange');if(ch)ch.textContent=money(Math.max(0,r-total));
    }
    if(selectedPay==='Mixto'){
      const a=Number(document.getElementById('mixCash')?.value||0),c=Number(document.getElementById('mixOther')?.value||0);
      const dCents=Math.round(a*100)+Math.round(c*100)-Math.round(total*100);
      const st=document.getElementById('mixStatus');
      if(st)st.textContent=dCents===0?'Pago completo':dCents>0?'Pago completo · Cambio '+money(dCents/100):'Faltan '+money(Math.abs(dCents)/100);
    }
    paymentState(total);
  };
  window.selectPay=function(method){
    selectedPay=method;
    document.querySelectorAll('#modalbox .payment-grid button').forEach(b=>b.classList.remove('selected'));
    document.getElementById('pm-'+method)?.classList.add('selected');
    window.renderPaymentFields(totalNow());
  };
})();
