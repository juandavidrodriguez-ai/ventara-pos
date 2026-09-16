/* VENTARA POS — Corrección definitiva de DOM para Pedidos. Aísla el modal legacy y fuerza la interfaz evolucionada. */
(()=>{
  'use strict';
  if(window.__VENTARA_ORDERS_DOM_FIX__) return;
  window.__VENTARA_ORDERS_DOM_FIX__=true;
  const W=window;
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const db=()=>{try{return typeof window.db!=='undefined'?window.db:null}catch(e){return null}};
  const arr=(v)=>Array.isArray(v)?v:[];
  const customerName=c=>String(c?.name??c?.nombre??c?.customer??c?.client??'').trim();
  const customerPhone=c=>String(c?.phone??c?.telefono??c?.tel??'').trim();
  const customerAddress=c=>String(c?.address??c?.direccion??c?.deliveryAddress??'').trim();
  const productName=p=>String(p?.name??p?.nombre??p?.description??p?.descripcion??'').trim();
  const productPrice=p=>Number(p?.price??p?.precio??p?.salePrice??p?.precioVenta??0)||0;
  const productId=p=>String(p?.id??p?.productId??'').trim();
  const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
  const today=()=>new Date().toISOString().slice(0,10);
  const removeLegacy=()=>{document.querySelectorAll('#orderModal,[id="order-modal"],[id="newOrderModal"]').forEach(el=>{if(el.id!=='newOrderModal')el.remove()})};
  function productOptions(){return arr(db()?.products).map((p,i)=>{const id=productId(p)||String(i);return `<option value="${esc(id)}">${esc(productName(p)||'Producto sin nombre')} — ${esc(money(productPrice(p)))}</option>`}).join('')||'<option value="">No hay productos disponibles</option>'}
  function customerOptions(){return arr(db()?.customers).map((c,i)=>{const id=String(c?.id??c?.customerId??i);return `<option value="${esc(id)}">${esc(customerName(c)||'Cliente sin nombre')}</option>`}).join('')||'<option value="">Sin clientes registrados</option>'}
  function findCustomer(id){return arr(db()?.customers).find((c,i)=>String(c?.id??c?.customerId??i)===String(id))||null}
  function findProduct(id){return arr(db()?.products).find((p,i)=>String(p?.id??p?.productId??i)===String(id))||null}
  function renderRows(){
    const body=document.querySelector('#orderItemsTable tbody');
    if(!body)return;
    body.innerHTML='';
    const items=arr(W.__ventaraOrderItems);
    items.forEach((it,index)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${esc(it.name||'Producto')}</td><td><input class="order-item-qty" data-index="${index}" type="number" min="1" step="1" value="${Number(it.qty)||1}" style="width:80px"></td><td>${money(it.price)}</td><td>${money((Number(it.qty)||0)*(Number(it.price)||0))}</td><td><button type="button" class="btn sm danger" data-remove-order-item="${index}">Eliminar</button></td>`;
      body.appendChild(tr);
    });
    const total=items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.price)||0),0);
    const totalEl=document.getElementById('orderGeneralTotal'); if(totalEl) totalEl.textContent=money(total);
  }
  function addItem(){
    const sel=document.getElementById('orderProductSelect'); const qtyEl=document.getElementById('orderProductQty');
    const p=findProduct(sel?.value); const qty=Math.max(1,Number(qtyEl?.value)||1);
    if(!p)return;
    const id=productId(p)||String(sel.value); const items=arr(W.__ventaraOrderItems); const found=items.find(x=>String(x.productId)===id);
    if(found)found.qty=(Number(found.qty)||0)+qty; else items.push({productId:id,name:productName(p)||'Producto',qty,price:productPrice(p)});
    W.__ventaraOrderItems=items; renderRows();
  }
  function openNewOrderModal(){
    const d=db(); if(!d){if(typeof W.toast==='function')W.toast('Los datos todavía no están listos.');return;}
    removeLegacy(); W.__ventaraOrderItems=[];
    const html=`<div id="ventaraOrdersEvolvedModal" class="modalbox" style="max-width:1100px;width:min(96vw,1100px)">
      <h2>🧾 Nuevo pedido</h2>
      <form id="ventaraNewOrderForm">
        <div class="form">
          <div class="field"><label>Cliente</label><select id="orderCustomerSelect" required>${customerOptions()}</select></div>
          <div class="field"><label>Teléfono</label><input id="orderPhone" type="tel" placeholder="Teléfono"></div>
        </div>
        <div class="form">
          <div class="field"><label>Dirección de entrega</label><input id="orderAddress" type="text" placeholder="Dirección de entrega" required></div>
          <div class="field"><label>Fecha de entrega</label><input id="orderDeliveryDate" type="date" value="${today()}" required></div>
          <div class="field"><label>Hora de entrega</label><input id="orderDeliveryTime" type="time" required></div>
        </div>
        <div class="form" style="align-items:end">
          <div class="field"><label>Producto</label><select id="orderProductSelect">${productOptions()}</select></div>
          <div class="field"><label>Cantidad</label><input id="orderProductQty" type="number" min="1" step="1" value="1"></div>
          <div class="field"><button type="button" class="btn primary" id="addOrderItemBtn">+ Agregar ítem</button></div>
        </div>
        <div class="card" style="margin-top:14px;box-shadow:none">
          <table class="table" id="orderItemsTable"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th>Acciones</th></tr></thead><tbody><tr><td colspan="5" class="empty">Agrega al menos un producto.</td></tr></tbody></table>
          <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:14px;font-size:18px"><b>Total General:</b><b id="orderGeneralTotal">${money(0)}</b></div>
        </div>
        <div class="actions" style="margin-top:16px"><button type="button" class="btn" id="cancelEvolvedOrder">Cancelar</button><button type="submit" class="btn primary">Guardar pedido</button></div>
      </form>
    </div>`;
    if(typeof W.openModal==='function')W.openModal(html);else{const wrap=document.createElement('div');wrap.className='modal';wrap.id='ventaraOrdersModalHost';wrap.innerHTML=html;document.body.appendChild(wrap)}
    const c=document.getElementById('orderCustomerSelect');
    const syncCustomer=()=>{const x=findCustomer(c?.value);document.getElementById('orderPhone').value=customerPhone(x);document.getElementById('orderAddress').value=customerAddress(x)};
    c?.addEventListener('change',syncCustomer); syncCustomer();
    document.getElementById('addOrderItemBtn')?.addEventListener('click',addItem);
    document.getElementById('orderItemsTable')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-order-item]');if(!b)return;W.__ventaraOrderItems.splice(Number(b.dataset.removeOrderItem),1);renderRows()});
    document.getElementById('orderItemsTable')?.addEventListener('change',e=>{const q=e.target.closest('.order-item-qty');if(!q)return;const i=Number(q.dataset.index);W.__ventaraOrderItems[i].qty=Math.max(1,Number(q.value)||1);renderRows()});
    document.getElementById('cancelEvolvedOrder')?.addEventListener('click',()=>{if(typeof W.closeModal==='function')W.closeModal();else document.getElementById('ventaraOrdersModalHost')?.remove()});
    document.getElementById('ventaraNewOrderForm')?.addEventListener('submit',e=>{e.preventDefault();saveOrder()});
  }
  function saveOrder(){
    const d=db(); const items=arr(W.__ventaraOrderItems); if(!d||!items.length){if(typeof W.toast==='function')W.toast('Agrega al menos un ítem al pedido.');return;}
    const c=document.getElementById('orderCustomerSelect'); const customer=findCustomer(c?.value); const total=items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.price)||0),0);
    d.orders=arr(d.orders);
    d.orders.push({id:'PED-'+String(Date.now()).slice(-6),customer:customerName(customer)||c?.selectedOptions?.[0]?.textContent||'Cliente',customerId:String(c?.value||''),address:String(document.getElementById('orderAddress')?.value||''),phone:String(document.getElementById('orderPhone')?.value||''),deliveryDate:String(document.getElementById('orderDeliveryDate')?.value||''),deliveryTime:String(document.getElementById('orderDeliveryTime')?.value||''),items:items.map(x=>({...x,subtotal:(Number(x.qty)||0)*(Number(x.price)||0)})),total,status:'Pendiente',createdAt:new Date().toISOString()});
    try{if(typeof W.save==='function')W.save()}catch(e){console.warn('[VENTARA] save order',e)}
    if(typeof W.closeModal==='function')W.closeModal();
    W.__ventaraOrderItems=[];
    if(typeof W.renderOrdersTable==='function')try{W.renderOrdersTable()}catch(e){}
    else document.getElementById('orders')?.dispatchEvent(new Event('ventara:orders-refresh'));
  }
  W.openNewOrderModal=openNewOrderModal;
  W.openOrderModal=openNewOrderModal;
  function interceptNewOrder(e){
    const b=e.target?.closest?.('button,a,[role="button"]'); if(!b)return;
    const text=(b.innerText||b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    const id=String(b.id||'').toLowerCase();
    if(text.includes('pedido')&&text.includes('+') || id==='neworder'||id==='addorder'||id==='orderadd'){
      e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openNewOrderModal();
    }
  }
  document.addEventListener('click',interceptNewOrder,true);
  function sanitizeOrders(){
    const root=document.getElementById('orders'); if(!root)return;
    root.querySelectorAll('td,th,span,b,div').forEach(el=>{if(el.children.length)return;const t=el.textContent.trim();if(!/^(undefined|null)$/.test(t))return;el.textContent='';});
    root.querySelectorAll('tbody tr').forEach((tr,i)=>{const cells=tr.querySelectorAll('td');if(!cells.length)return;cells.forEach((td,j)=>{if(/^(undefined|null)$/.test(td.textContent.trim()))td.textContent=j===0?`P-${String(i+1).padStart(5,'0')}`:''});});
  }
  function observeOrders(){
    const run=()=>{sanitizeOrders()};
    run();
    const mo=new MutationObserver(run); mo.observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeOrders,{once:true});else observeOrders();
})();
