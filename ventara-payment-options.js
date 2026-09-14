/* VENTARA POS - Campos secundarios por forma de pago.
   Solo controla la interfaz/validación del modal; no registra ventas ni modifica inventario. */
(()=>{
  'use strict';
  const totalNow=()=>{
    try{
      const subtotal=(window.cart||[]).reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.price)||0),0);
      const discount=Number(document.getElementById('posDiscount')?.value||0);
      return Math.max(0,subtotal-discount);
    }catch(e){return 0}
  };
  const getModalBox=()=>document.getElementById('modalbox');
  const creditFieldNames=['allowCredit','credito','tieneCredito','creditLimit','cupoCredito','creditEnabled'];
  const isTruthyCredit=v=>v===true||v===1||['true','1','si','sí','yes','habilitado','autorizado'].includes(String(v??'').trim().toLowerCase());
  const safeText=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeValue=v=>safeText(v);
  const isCreditEligible=c=>{
    if(!c||!c.id)return false;
    const hasCreditMetadata=creditFieldNames.some(k=>Object.prototype.hasOwnProperty.call(c,k));
    if(!hasCreditMetadata)return true;
    if(isTruthyCredit(c.allowCredit)||isTruthyCredit(c.credito)||isTruthyCredit(c.tieneCredito)||isTruthyCredit(c.creditEnabled))return true;
    return Number(c.creditLimit||0)>0||Number(c.cupoCredito||0)>0||Number(c.credit||0)>0;
  };
  const creditLineRecords=()=>{
    const out=[];
    ['credits','creditLines'].forEach(key=>{
      const list=window.db?.[key];
      if(!Array.isArray(list))return;
      list.forEach(x=>{if(x)out.push(x)});
    });
    return out;
  };
  const creditLineClientIds=()=>new Set(creditLineRecords().map(x=>String(x.clientId??x.customerId??x.client_id??x.customer_id??x.client??x.customer??'')).trim()).filter(Boolean));
  const creditLineClientNames=()=>new Set(creditLineRecords().map(x=>String(x.clientName??x.customerName??x.name??'').trim().toLowerCase()).filter(n=>n&&n!=='consumidor final'));
  const getCreditClients=()=>{
    const base=Array.isArray(window.db?.clients)?window.db.clients:[];
    const ids=creditLineClientIds();
    const names=creditLineClientNames();
    const eligible=base.filter(c=>{
      const name=String(c?.name||'').trim().toLowerCase();
      if(!c?.id||!name||name==='consumidor final')return false;
      return isCreditEligible(c)||ids.has(String(c.id))||names.has(name);
    });
    const seen=new Set(eligible.map(c=>String(c.id)));
    creditLineRecords().forEach(line=>{
      const id=String(line.clientId??line.customerId??line.client_id??line.customer_id??'').trim();
      const name=String(line.clientName??line.customerName??line.name??'').trim();
      if(name.toLowerCase()==='consumidor final')return;
      if(id&&!seen.has(id)){
        const client=base.find(c=>String(c?.id)===id);
        if(client){eligible.push(client);seen.add(id)}
      }
    });
    return eligible;
  };
  const ensureFields=(total)=>{
    const box=getModalBox();if(!box)return null;
    let el=document.getElementById('paymentFields');
    if(!el){
      const grid=box.querySelector('.payment-grid');
      if(!grid)return null;
      el=document.createElement('div');el.id='paymentFields';el.style.marginTop='15px';
      grid.insertAdjacentElement('afterend',el);
    }
    return el;
  };
  const paymentState=(total)=>{
    const b=document.querySelector('#modalbox .btn.success');
    if(!b)return;
    let ok=true;
    if(window.selectedPay==='Efectivo')ok=Number(document.getElementById('cashReceived')?.value||0)>=total;
    if(window.selectedPay==='Tarjeta')ok=!!document.getElementById('cardType')?.value;
    if(window.selectedPay==='Transferencia')ok=!!document.getElementById('transferProvider')?.value;
    if(window.selectedPay==='Mixto'){
      const a=Number(document.getElementById('mixCash')?.value||0),c=Number(document.getElementById('mixOther')?.value||0);
      ok=Math.round(a*100)+Math.round(c*100)===Math.round(total*100);
    }
    if(window.selectedPay==='Crédito')ok=!!document.getElementById('creditClient')?.value;
    b.disabled=!ok||!!window.__ventaraSaleBusy;
  };
  window.renderPaymentFields=function(total){
    const el=ensureFields(total);if(!el)return;
    const cash=document.getElementById('cashFields');
    const mixed=document.getElementById('mixedFields');
    if(cash)cash.style.display='none';
    if(mixed)mixed.style.display='none';
    if(window.selectedPay==='Efectivo'){
      el.innerHTML=`<div class="field"><label>EFECTIVO RECIBIDO</label><input id="cashReceived" type="number" min="0" step="0.01" value="${total}" oninput="window.updatePaymentState(${total})"><div class="totalline"><span>Cambio</span><b id="cashChange">${money(0)}</b></div></div>`;
    }else if(window.selectedPay==='Tarjeta'){
      el.innerHTML=`<div class="field"><label>TIPO DE TARJETA *</label><select id="cardType" onchange="window.updatePaymentState(${total})"><option value="">Selecciona...</option><option value="Débito">Débito</option><option value="Crédito Visa">Crédito Visa</option><option value="Crédito Mastercard">Crédito Mastercard</option><option value="Otra">Otra</option></select></div>`;
    }else if(window.selectedPay==='Transferencia'){
      el.innerHTML=`<div class="field"><label>BANCO / BILLETERA *</label><select id="transferProvider" onchange="window.updatePaymentState(${total})"><option value="">Selecciona...</option><option value="Nequi">Nequi</option><option value="Daviplata">Daviplata</option><option value="Bancolombia">Bancolombia</option><option value="Otros">Otros</option></select></div>`;
    }else if(window.selectedPay==='Mixto'){
      el.innerHTML=`<div class="form"><div class="field"><label>EFECTIVO *</label><input id="mixCash" type="number" min="0" step="0.01" value="0" oninput="window.updatePaymentState(${total})"></div><div class="field"><label>TARJETA / TRANSFERENCIA *</label><input id="mixOther" type="number" min="0" step="0.01" value="${total}" oninput="window.updatePaymentState(${total})"></div></div><p id="mixStatus" class="muted">La suma debe ser exactamente ${money(total)}.</p>`;
    }else{
      const clients=getCreditClients();
      const options=clients.map(c=>`<option value="${safeValue(c.id)}">${safeText(c.name||'Cliente')} · ${safeText(c.doc||c.nit||'Sin documento')}</option>`).join('');
      const emptyMessage=clients.length?'':'<div class="muted" style="margin-top:8px;color:#b91c1c">No hay clientes con línea de crédito habilitada.</div>';
      el.innerHTML=`<div class="field"><label>CLIENTE PARA CRÉDITO *</label><select id="creditClient" onchange="window.posClient=this.value;window.updatePaymentState(${total})"><option value="">${clients.length?'Selecciona un cliente...':'-- No hay clientes disponibles --'}</option>${options}</select>${emptyMessage}<div class="muted" style="margin-top:7px">Se muestran los clientes autorizados o con línea de crédito registrada.</div></div>`;
    }
    window.updatePaymentState(total);
  };
  window.updatePaymentState=function(total){
    if(window.selectedPay==='Efectivo'){
      const r=Number(document.getElementById('cashReceived')?.value||0),ch=document.getElementById('cashChange');
      if(ch)ch.textContent=money(Math.max(0,r-total));
    }
    if(window.selectedPay==='Mixto'){
      const a=Number(document.getElementById('mixCash')?.value||0),c=Number(document.getElementById('mixOther')?.value||0),d=Math.round(a*100)+Math.round(c*100)-Math.round(total*100),st=document.getElementById('mixStatus');
      if(st)st.textContent=d===0?'Pago completo':d>0?'Pago completo · Cambio '+money(d/100):'Faltan '+money(Math.abs(d)/100);
    }
    paymentState(total);
  };
  window.selectPay=function(method){
    window.selectedPay=method;
    document.querySelectorAll('#modalbox .payment-grid button').forEach(b=>b.classList.remove('selected'));
    const btn=document.getElementById('pm-'+method);if(btn)btn.classList.add('selected');
    window.renderPaymentFields(totalNow());
  };
  window.deleteCreditLine=function(clientId){
    try{
      const id=String(clientId||'').trim();
      if(!id||!window.db)return;
      const client=Array.isArray(db.clients)?db.clients.find(c=>String(c?.id)===id):null;
      if(!client)return alert('No se encontró el cliente de la línea de crédito.');
      const balance=Number(client.balance||0);
      if(balance>0)return alert('No se puede eliminar una línea de crédito con saldo pendiente de '+money(balance)+'.');
      if(!confirm('¿Deseas eliminar la línea de crédito de '+(client.name||'este cliente')+'?'))return;
      let removed=false;
      ['credits','creditLines'].forEach(key=>{
        if(!Array.isArray(db[key]))return;
        const before=db[key].length;
        db[key]=db[key].filter(x=>String(x?.clientId??x?.customerId??x?.client_id??x?.customer_id??x?.client??x?.customer??'')!==id);
        if(db[key].length!==before)removed=true;
      });
      if(!removed){
        if(Object.prototype.hasOwnProperty.call(client,'creditEnabled'))client.creditEnabled=false;
        if(Object.prototype.hasOwnProperty.call(client,'credit'))client.credit=0;
        removed=true;
      }
      if(typeof save==='function')save();
      if(typeof renderReceivables==='function')renderReceivables();
      alert('Línea de crédito eliminada correctamente.');
    }catch(error){
      console.error('Error al eliminar la línea de crédito:',error);
      alert('No fue posible eliminar la línea de crédito: '+(error?.message||String(error)));
    }
  };
  const enhanceReceivables=()=>{
    const root=document.getElementById('receivables');
    if(!root)return;
    root.querySelectorAll('button').forEach(editBtn=>{
      const onclick=editBtn.getAttribute('onclick')||'';
      const match=onclick.match(/openClientModal\(['"]([^'"]+)['"]\)/);
      if(!match||editBtn.parentElement?.querySelector('.ventara-delete-credit'))return;
      const id=match[1];
      const del=document.createElement('button');
      del.type='button';del.className='btn sm danger ventara-delete-credit';del.textContent='Eliminar';
      del.title='Eliminar línea de crédito';
      del.addEventListener('click',()=>window.deleteCreditLine(id));
      editBtn.insertAdjacentElement('afterend',del);
    });
  };
  const observer=new MutationObserver(()=>enhanceReceivables());
  const startObserver=()=>{const root=document.getElementById('receivables');if(root)observer.observe(root,{childList:true,subtree:true});enhanceReceivables()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
})();
