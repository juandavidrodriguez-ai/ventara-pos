/* VENTARA POS — Evolución quirúrgica del módulo Pedidos.
   Módulo aislado: trabaja únicamente sobre #orders y window.db.orders.
   No modifica index.html ni módulos nativos de Artículos, Proveedores, Ventas,
   Caja o Facturación. */
(()=>{
  'use strict';

  const ROOT_ID='orders';
  const STATUS={PENDING:'Pendiente',DELIVERED:'Entregado',CANCELLED:'Cancelado'};
  const state={items:[],mounted:false};
  const root=()=>document.getElementById(ROOT_ID);
  const db=()=>{try{return window.db&&typeof window.db==='object'?window.db:null}catch(e){return null}};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const money=v=>{try{return typeof window.money==='function'?window.money(Number(v||0)):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}};
  const notify=m=>{try{if(typeof window.toast==='function')window.toast(m);else alert(String(m))}catch(e){console.log('[VENTARA]',m)}};
  const products=()=>{const d=db();return Array.isArray(d?.products)?d.products:[]};
  const customers=()=>{const d=db();return Array.isArray(d?.customers)?d.customers:Array.isArray(d?.clients)?d.clients:[]};
  const orders=()=>{const d=db();if(!d)return[];d.orders=Array.isArray(d.orders)?d.orders:[];return d.orders};
  const productName=p=>String(p?.name||p?.nombre||p?.description||p?.descripcion||'Producto');
  const productPrice=p=>Number(p?.price??p?.salePrice??p?.sellingPrice??p?.precioVenta??p?.precio??p?.unitPrice??0)||0;
  const customerName=c=>String(c?.name||c?.fullName||c?.nombre||c?.businessName||c?.razonSocial||c?.commercialName||'Cliente');
  const customerPhone=c=>String(c?.phone||c?.telephone||c?.telefono||c?.mobile||c?.celular||c?.phoneNumber||'');
  const customerAddress=c=>String(c?.address||c?.direccion||c?.deliveryAddress||'');
  const today=()=>{const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  const formatDate=v=>{if(!v)return '—';const p=String(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v)};
  const save=async()=>{try{if(typeof window.save==='function')window.save()}catch(e){console.warn('[VENTARA] orders save',e)}try{if(typeof window.cloudSave==='function')await window.cloudSave()}catch(e){console.warn('[VENTARA] orders cloud save',e)}};

  function statusBadge(status){
    const s=String(status||STATUS.PENDING);
    const styles=s===STATUS.DELIVERED?'background:#dcfce7;color:#166534':s===STATUS.CANCELLED?'background:#fee2e2;color:#991b1b':'background:#fef3c7;color:#92400e';
    return `<span class="badge" style="${styles}">${esc(s)}</span>`;
  }
  function alertBadge(o){
    if(o.status===STATUS.DELIVERED)return '<span class="badge" style="background:#dcfce7;color:#166534">ENTREGADO</span>';
    if(o.status===STATUS.CANCELLED)return '<span class="badge" style="background:#fee2e2;color:#991b1b">CANCELADO</span>';
    if(!o.deliveryDate)return '<span class="badge" style="background:#e5e7eb;color:#4b5563">SIN FECHA</span>';
    const t=today();
    if(o.deliveryDate===t)return '<span class="badge" style="background:#fef3c7;color:#92400e">¡ENTREGAR HOY!</span>';
    if(o.deliveryDate<t)return '<span class="badge" style="background:#fee2e2;color:#991b1b">¡VENCIDO / RETRASADO!</span>';
    return '<span class="badge" style="background:#dbeafe;color:#1d4ed8">PROGRAMADO</span>';
  }
  function customerLabel(o){
    if(o.customer)return String(o.customer);
    const c=customers().find(x=>String(x?.id)===String(o.customerId));
    return c?customerName(c):'Consumidor Final';
  }

  function shell(){
    const r=root();if(!r)return false;
    r.innerHTML=`<div class="head"><div><h1>Pedidos</h1><p>Despacho, entregas programadas y seguimiento preventivo.</p></div><div class="actions"><button id="btnNewOrder" class="btn primary" type="button">+ Nuevo pedido</button></div></div>
      <div class="card ventara-orders-card" style="box-shadow:none"><div class="tablewrap"><table class="table"><thead><tr><th>ID PEDIDO</th><th>CLIENTE</th><th>DIRECCIÓN / TEL.</th><th>FECHA / HORA ENTREGA</th><th>TOTAL</th><th>ESTADO</th><th>ALERTA</th><th>ACCIONES</th></tr></thead><tbody id="ventaraOrdersBody"></tbody></table></div></div>`;
    document.getElementById('btnNewOrder').onclick=()=>openOrderModal();
    renderOrders();
    return true;
  }

  function renderOrders(){
    const body=document.getElementById('ventaraOrdersBody');if(!body)return;
    const list=orders();
    if(!list.length){body.innerHTML='<tr><td colspan="8" class="empty">Aún no hay pedidos registrados.</td></tr>';return}
    body.innerHTML=list.map((o,i)=>{
      const contact=[o.address,o.phone].filter(Boolean).join(' · ')||'—';
      const delivery=[formatDate(o.deliveryDate),o.deliveryTime||''].filter(Boolean).join(' · ')||'—';
      const actions=`<div class="actions"><button class="btn sm" type="button" data-order-detail="${i}">Ver Detalles</button>${o.status===STATUS.PENDING?`<button class="btn sm success" type="button" data-order-deliver="${i}">Marcar Entregado</button><button class="btn sm danger" type="button" data-order-cancel="${i}">Cancelar</button>`:''}</div>`;
      return `<tr><td><b>${esc(o.id)}</b></td><td>${esc(customerLabel(o))}</td><td style="white-space:normal;min-width:180px">${esc(contact)}</td><td>${esc(delivery)}</td><td><b>${money(o.total)}</b></td><td>${statusBadge(o.status)}</td><td>${alertBadge(o)}</td><td>${actions}</td></tr>`;
    }).join('');
    body.querySelectorAll('[data-order-detail]').forEach(b=>b.onclick=()=>openDetails(Number(b.dataset.orderDetail)));
    body.querySelectorAll('[data-order-deliver]').forEach(b=>b.onclick=()=>setStatus(Number(b.dataset.orderDeliver),STATUS.DELIVERED));
    body.querySelectorAll('[data-order-cancel]').forEach(b=>b.onclick=()=>setStatus(Number(b.dataset.orderCancel),STATUS.CANCELLED));
  }

  function productOptions(){
    return products().map(p=>`<option value="${esc(p?.id)}">${esc(productName(p))} — ${money(productPrice(p))}</option>`).join('');
  }
  function customerOptions(){
    return customers().map(c=>`<option value="${esc(c?.id)}">${esc(customerName(c))}${customerPhone(c)?' · '+esc(customerPhone(c)):''}</option>`).join('');
  }

  function modalFrame(id,title,content){
    closeModal(id);
    const el=document.createElement('div');el.id=id;el.className='modal show';el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:100000';
    el.innerHTML=`<div class="modalbox" style="width:min(980px,94vw);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;padding:22px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:16px"><h2 style="margin:0">${title}</h2><button type="button" class="btn sm" data-close-modal>✕</button></div>${content}</div>`;
    document.body.appendChild(el);el.querySelector('[data-close-modal]').onclick=()=>closeModal(id);el.addEventListener('click',e=>{if(e.target===el)closeModal(id)});return el;
  }
  function closeModal(id){document.getElementById(id)?.remove()}

  function openOrderModal(){
    state.items=[];
    const el=modalFrame('ventaraOrderModal','Nuevo pedido',`<form id="ventaraOrderForm">
      <div class="card" style="box-shadow:none;background:#f8fafc;margin-bottom:14px"><h3 style="margin-top:0">Cliente y entrega</h3><div class="form">
        <div class="field"><label>Cliente</label><select id="orderCustomer"><option value="">Consumidor Final</option>${customerOptions()}</select></div>
        <div class="field"><label>Teléfono de contacto</label><input id="orderPhone" type="text" inputmode="tel" placeholder="Teléfono"></div>
        <div class="field full"><label>Dirección de entrega</label><input id="orderAddress" type="text" placeholder="Dirección de entrega"></div>
        <div class="field"><label>Fecha programada de entrega</label><input id="orderDate" type="date" value="${today()}"></div>
        <div class="field"><label>Hora estimada de entrega</label><input id="orderTime" type="time"></div>
        <div class="field"><label>Estado</label><input value="Pendiente" disabled></div>
      </div></div>
      <div class="card" style="box-shadow:none"><h3 style="margin-top:0">Productos del pedido</h3><div style="display:grid;grid-template-columns:minmax(0,1fr) 120px auto;gap:10px;align-items:end;margin-bottom:14px">
        <div class="field"><label>Producto</label><select id="orderProduct"><option value="">Selecciona un producto...</option>${productOptions()}</select></div>
        <div class="field"><label>Cantidad</label><input id="orderQty" type="number" min="1" step="1" value="1"></div>
        <button id="orderAddItem" class="btn primary" type="button">+ Agregar ítem</button>
      </div><div class="tablewrap"><table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th><th>Eliminar</th></tr></thead><tbody id="ventaraOrderItems"><tr><td colspan="5" class="empty">Agrega productos al pedido.</td></tr></tbody></table></div>
      <div class="totals"><div class="totalline grand"><span>Total del pedido</span><span id="ventaraOrderTotal">${money(0)}</span></div></div></div>
      <div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-close-modal>Cancelar</button><button type="submit" class="btn success">Guardar pedido</button></div></form>`);
    el.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>closeModal('ventaraOrderModal'));
    const customer=document.getElementById('orderCustomer');
    customer.onchange=()=>{const c=customers().find(x=>String(x?.id)===String(customer.value));if(c){document.getElementById('orderPhone').value=customerPhone(c);document.getElementById('orderAddress').value=customerAddress(c)}};
    document.getElementById('orderAddItem').onclick=addItem;
    document.getElementById('ventaraOrderForm').onsubmit=saveOrder;
    renderOrderItems();
  }

  function addItem(){
    const pid=document.getElementById('orderProduct')?.value;const qty=Math.max(1,Math.floor(Number(document.getElementById('orderQty')?.value||1)));const p=products().find(x=>String(x?.id)===String(pid));
    if(!p)return notify('Selecciona un producto.');
    const existing=state.items.find(i=>String(i.productId)===String(p.id));
    if(existing){existing.qty+=qty;existing.subtotal=existing.qty*existing.price}else state.items.push({productId:p.id,name:productName(p),qty,price:productPrice(p),subtotal:qty*productPrice(p)});
    document.getElementById('orderQty').value='1';renderOrderItems();
  }
  function renderOrderItems(){
    const body=document.getElementById('ventaraOrderItems');const total=state.items.reduce((a,i)=>a+Number(i.subtotal||0),0);if(!body)return;
    body.innerHTML=state.items.length?state.items.map((i,n)=>`<tr><td style="white-space:normal">${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td><b>${money(i.subtotal)}</b></td><td><button type="button" class="btn sm danger" data-remove-item="${n}">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Agrega productos al pedido.</td></tr>';
    body.querySelectorAll('[data-remove-item]').forEach(b=>b.onclick=()=>{state.items.splice(Number(b.dataset.removeItem),1);renderOrderItems()});
    const totalEl=document.getElementById('ventaraOrderTotal');if(totalEl)totalEl.textContent=money(total);
  }

  async function saveOrder(e){
    e.preventDefault();
    if(!state.items.length)return notify('Agrega al menos un producto al pedido.');
    const d=db();if(!d)return notify('Los datos todavía no están disponibles.');
    const customerId=document.getElementById('orderCustomer')?.value||'';const c=customers().find(x=>String(x?.id)===String(customerId));
    const total=state.items.reduce((a,i)=>a+Number(i.subtotal||0),0);
    const order={id:'PED-'+Date.now().toString().slice(-5),customer:c?customerName(c):'Consumidor Final',customerId:customerId||null,address:(document.getElementById('orderAddress')?.value||'').trim(),phone:(document.getElementById('orderPhone')?.value||'').trim(),deliveryDate:document.getElementById('orderDate')?.value||'',deliveryTime:document.getElementById('orderTime')?.value||'',items:state.items.map(i=>({...i})),total,status:STATUS.PENDING,createdAt:new Date().toISOString()};
    d.orders=Array.isArray(d.orders)?d.orders:[];d.orders.unshift(order);await save();closeModal('ventaraOrderModal');renderOrders();notify('Pedido creado correctamente.');
  }

  function openDetails(index){
    const o=orders()[index];if(!o)return;
    const rows=(o.items||[]).map(i=>`<tr><td style="white-space:normal">${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${money(i.price)}</td><td>${money(i.subtotal)}</td></tr>`).join('');
    modalFrame('ventaraOrderDetails','Detalle del pedido',`<div class="form"><div class="field"><label>ID PEDIDO</label><input value="${esc(o.id)}" disabled></div><div class="field"><label>ESTADO</label><div style="padding:10px 0">${statusBadge(o.status)}</div></div><div class="field"><label>CLIENTE</label><input value="${esc(customerLabel(o))}" disabled></div><div class="field"><label>TELÉFONO</label><input value="${esc(o.phone||'—')}" disabled></div><div class="field full"><label>DIRECCIÓN</label><input value="${esc(o.address||'—')}" disabled></div><div class="field"><label>FECHA</label><input value="${esc(formatDate(o.deliveryDate))}" disabled></div><div class="field"><label>HORA</label><input value="${esc(o.deliveryTime||'—')}" disabled></div></div><div class="card" style="box-shadow:none;background:#f8fafc;margin-top:16px"><h3 style="margin-top:0">Productos</h3><div class="tablewrap"><table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">Sin productos.</td></tr>'}</tbody></table></div><div class="totalline grand"><span>Total</span><span>${money(o.total)}</span></div></div><div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-close-modal>Cerrar</button></div>`);
  }

  async function setStatus(index,status){
    const list=orders(),o=list[index];if(!o)return;
    if(status===STATUS.CANCELLED&&!confirm(`¿Cancelar el pedido ${o.id}?`))return;
    o.status=status;o.updatedAt=new Date().toISOString();await save();renderOrders();notify(status===STATUS.DELIVERED?'Pedido marcado como entregado.':'Pedido cancelado.');
  }

  function mount(){
    if(!root())return false;
    if(root().querySelector('.ventara-orders-card')&&document.getElementById('ventaraOrdersBody')){renderOrders();return true}
    state.mounted=true;return shell();
  }

  window.ventaraOrders={render:renderOrders,openNew:openOrderModal,openDetails,setStatus};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80),{once:true});else setTimeout(mount,80);
})();
