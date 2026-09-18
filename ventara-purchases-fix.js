/* VENTARA POS — Compras: acciones + multiproducto. Parche aislado. */
(()=> {
  'use strict';

  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const moneySafe = v => {
    try { return typeof window.money === 'function' ? window.money(Number(v)||0) : '$ '+Number(v||0).toLocaleString('es-CO'); }
    catch (_) { return '$ '+Number(v||0).toLocaleString('es-CO'); }
  };
  const todaySafe = () => typeof window.today === 'function' ? window.today() : new Date().toISOString().slice(0,10);
  const productName = p => String(p?.name || p?.nombre || 'Producto');
  const supplierNameSafe = id => (window.db?.suppliers || []).find(s => String(s.id) === String(id))?.name || '';
  const productById = id => (window.db?.products || []).find(p => String(p.id) === String(id));
  const notify = m => { try { if (typeof window.toast === 'function') window.toast(m); } catch (_) {} };

  let purchaseDraft = [];

  function purchaseItemsTotal(items) {
    return (items || []).reduce((sum, item) => sum + (Number(item.qty)||0) * (Number(item.cost)||0), 0);
  }

  function renderPurchasesFixed() {
    const root = document.getElementById('purchases');
    if (!root || !window.db) return;

    const rows = (Array.isArray(db.purchases) ? db.purchases : []).map((x, index) => {
      const cancelled = String(x.status||'').toLowerCase() === 'anulada';
      return '<tr>' +
        '<td>'+esc(x.number||'—')+'</td>' +
        '<td>'+esc(x.date||'—')+'</td>' +
        '<td>'+esc(supplierNameSafe(x.supplierId)||'—')+'</td>' +
        '<td>'+moneySafe(x.total)+'</td>' +
        '<td>'+esc(x.method||'—')+'</td>' +
        '<td>'+esc(x.status||'—')+'</td>' +
        '<td style="white-space:nowrap"><button class="btn sm" type="button" data-purchase-action="view" data-purchase-index="'+index+'">Ver</button> ' +
        '<button class="btn sm" type="button" data-purchase-action="pdf" data-purchase-index="'+index+'">PDF</button> ' +
        (cancelled ? '<button class="btn sm" type="button" disabled>Anulada</button>' :
          '<button class="btn sm danger" type="button" data-purchase-action="delete" data-purchase-index="'+index+'">Eliminar</button>') +
        '</td></tr>';
    }).join('');

    root.innerHTML =
      (typeof window.pageHead === 'function'
        ? window.pageHead('Compras','Entradas de mercancía, costos y cuentas por pagar','<button class="btn primary" type="button" id="ventaraPurchaseNew">+ Registrar compra</button>')
        : '<div class="head"><div><h1>Compras</h1><p>Entradas de mercancía, costos y cuentas por pagar</p></div><button class="btn primary" id="ventaraPurchaseNew">+ Registrar compra</button></div>') +
      '<div class="card"><div class="tablewrap"><table class="table"><thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Pago</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="empty">No hay compras registradas.</td></tr>') +
      '</tbody></table></div></div>';

    document.getElementById('ventaraPurchaseNew')?.addEventListener('click', openPurchaseFixed);
    root.querySelectorAll('[data-purchase-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.purchaseIndex);
        const p = db.purchases?.[i];
        if (!p) return notify('No se encontró la compra.');
        const action = btn.dataset.purchaseAction;
        if (action === 'view') viewPurchase(p);
        if (action === 'pdf') printPurchase(p);
        if (action === 'delete') cancelPurchase(p);
      });
    });
  }

  function openPurchaseFixed() {
    purchaseDraft = [];
    const suppliers = (db.suppliers || []).map(s => '<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');
    const products = (db.products || []).map(p => '<option value="'+esc(p.id)+'">'+esc(productName(p))+'</option>').join('');

    window.openModal(
      '<h2>Registrar compra</h2>' +
      '<div class="form">' +
        '<div class="field"><label>Proveedor</label><select id="b_sup">'+suppliers+'</select></div>' +
        '<div class="field"><label>Forma de pago</label><select id="b_method"><option>Crédito</option><option>Efectivo</option><option>Transferencia</option></select></div>' +
        '<div class="field"><label>Factura / referencia</label><input id="b_invoice" placeholder="Opcional"></div>' +
        '<div class="field"><label>Producto</label><select id="b_prod"><option value="">Selecciona un producto...</option>'+products+'</select></div>' +
        '<div class="field"><label>Cantidad</label><input id="b_qty" type="number" min="0.01" step="0.01" value="1"></div>' +
        '<div class="field"><label>Costo unitario</label><input id="b_cost" type="number" min="0" step="0.01" value="0"></div>' +
      '</div>' +
      '<div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="ventaraAddPurchaseItem">+ Agregar producto</button></div>' +
      '<div class="tablewrap" style="margin-top:14px"><table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th><th>Acción</th></tr></thead><tbody id="ventaraPurchaseItems"></tbody></table></div>' +
      '<div class="totalline grand"><span>Total</span><b id="ventaraPurchaseTotal">'+moneySafe(0)+'</b></div>' +
      '<div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn" type="button" id="ventaraCancelPurchase">Cancelar</button><button class="btn success" type="button" id="ventaraSavePurchase">Registrar compra</button></div>'
    );

    document.getElementById('ventaraAddPurchaseItem')?.addEventListener('click', addPurchaseItem);
    document.getElementById('ventaraCancelPurchase')?.addEventListener('click', () => window.closeModal());
    document.getElementById('ventaraSavePurchase')?.addEventListener('click', savePurchaseFixed);
    renderPurchaseDraft();
  }

  function addPurchaseItem() {
    const productId = document.getElementById('b_prod')?.value;
    const qty = Number(document.getElementById('b_qty')?.value || 0);
    const costInput = Number(document.getElementById('b_cost')?.value || 0);
    const p = productById(productId);
    if (!p || qty <= 0) return notify('Selecciona un producto y una cantidad válida.');

    const cost = costInput > 0 ? costInput : Number(p.cost || 0);
    if (cost < 0) return notify('El costo no puede ser negativo.');

    const existing = purchaseDraft.find(x => String(x.productId) === String(p.id));
    if (existing) {
      existing.qty += qty;
      existing.cost = cost;
    } else {
      purchaseDraft.push({ productId:p.id, name:productName(p), qty, cost });
    }
    renderPurchaseDraft();
    const q = document.getElementById('b_qty'); if (q) q.value = '1';
    const c = document.getElementById('b_cost'); if (c) c.value = '0';
    document.getElementById('b_prod')?.focus();
  }

  function renderPurchaseDraft() {
    const body = document.getElementById('ventaraPurchaseItems');
    if (!body) return;
    body.innerHTML = purchaseDraft.length
      ? purchaseDraft.map((x,i) => '<tr><td>'+esc(x.name)+'</td><td>'+esc(x.qty)+'</td><td>'+moneySafe(x.cost)+'</td><td>'+moneySafe(x.qty*x.cost)+'</td><td><button type="button" class="btn sm danger" data-remove-purchase="'+i+'">Eliminar</button></td></tr>').join('')
      : '<tr><td colspan="5" class="empty">Agrega uno o varios productos a la compra.</td></tr>';
    body.querySelectorAll('[data-remove-purchase]').forEach(b => b.addEventListener('click', () => {
      purchaseDraft.splice(Number(b.dataset.removePurchase),1);
      renderPurchaseDraft();
    }));
    const total = purchaseItemsTotal(purchaseDraft);
    const t = document.getElementById('ventaraPurchaseTotal'); if (t) t.textContent = moneySafe(total);
  }

  function savePurchaseFixed() {
    if (!window.db) return notify('Los datos aún no están disponibles.');
    if (!purchaseDraft.length) return notify('Agrega al menos un producto a la compra.');

    const supplier = (db.suppliers || []).find(s => String(s.id) === String(document.getElementById('b_sup')?.value));
    if (!supplier) return notify('Selecciona un proveedor.');

    const method = document.getElementById('b_method')?.value || 'Crédito';
    const invoice = String(document.getElementById('b_invoice')?.value || '').trim();
    const total = purchaseItemsTotal(purchaseDraft);
    const number = 'C-'+String((db.purchases || []).length+1).padStart(6,'0');

    purchaseDraft.forEach(item => {
      const p = productById(item.productId);
      if (!p) return;
      p.stock = Number(p.stock || 0) + Number(item.qty || 0);
      p.cost = Number(item.cost || 0);
      db.kardex = Array.isArray(db.kardex) ? db.kardex : [];
      db.kardex.unshift({
        id: typeof window.uid === 'function' ? window.uid('k') : 'k-'+Date.now(),
        date: todaySafe(),
        type: 'Compra',
        ref: invoice || number,
        productId: p.id,
        qty: Number(item.qty || 0),
        balance: p.stock,
        cost: Number(item.cost || 0),
        user: window.currentUser?.name || 'Sistema'
      });
    });

    if (method === 'Crédito') supplier.balance = Number(supplier.balance || 0) + total;

    db.purchases = Array.isArray(db.purchases) ? db.purchases : [];
    db.purchases.unshift({
      id: typeof window.uid === 'function' ? window.uid('b') : 'b-'+Date.now(),
      number,
      date: todaySafe(),
      supplierId: supplier.id,
      total,
      method,
      status: 'Registrada',
      invoice: invoice || '',
      items: purchaseDraft.map(x => ({productId:x.productId, qty:Number(x.qty), cost:Number(x.cost)})),
      createdBy: window.currentUser?.id || null
    });

    try { if (typeof window.log === 'function') window.log('Compra registrada', number); } catch (_) {}
    window.save();
    window.closeModal();
    notify('Compra registrada correctamente.');
    renderPurchasesFixed();
  }

  function viewPurchase(p) {
    const items = (p.items || []).map(x => {
      const prod = productById(x.productId);
      return '<tr><td>'+esc(productName(prod))+'</td><td>'+esc(x.qty)+'</td><td>'+moneySafe(x.cost)+'</td><td>'+moneySafe(Number(x.qty||0)*Number(x.cost||0))+'</td></tr>';
    }).join('');
    window.openModal(
      '<h2>Detalle de compra '+esc(p.number)+'</h2>' +
      '<div class="form"><div class="field"><label>Proveedor</label><input value="'+esc(supplierNameSafe(p.supplierId))+'" disabled></div>' +
      '<div class="field"><label>Fecha</label><input value="'+esc(p.date||'')+'" disabled></div>' +
      '<div class="field"><label>Pago</label><input value="'+esc(p.method||'')+'" disabled></div>' +
      '<div class="field"><label>Factura / referencia</label><input value="'+esc(p.invoice||'')+'" disabled></div>' +
      '<div class="field"><label>Estado</label><input value="'+esc(p.status||'')+'" disabled></div></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th></tr></thead><tbody>'+items+'</tbody></table></div>' +
      '<div class="totalline grand"><span>Total</span><b>'+moneySafe(p.total)+'</b></div>' +
      '<div class="actions" style="justify-content:flex-end"><button class="btn" type="button" onclick="closeModal()">Cerrar</button></div>'
    );
  }

  function printPurchase(p) {
    const items = (p.items || []).map(x => {
      const prod = productById(x.productId);
      return '<tr><td>'+esc(productName(prod))+'</td><td style="text-align:center">'+esc(x.qty)+'</td><td style="text-align:right">'+moneySafe(x.cost)+'</td><td style="text-align:right">'+moneySafe(Number(x.qty||0)*Number(x.cost||0))+'</td></tr>';
    }).join('');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Compra '+esc(p.number)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#17324d}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:18px}</style></head><body><h1>Comprobante de compra</h1><p><b>Número:</b> '+esc(p.number)+'<br><b>Fecha:</b> '+esc(p.date||'')+'<br><b>Proveedor:</b> '+esc(supplierNameSafe(p.supplierId))+'<br><b>Pago:</b> '+esc(p.method||'')+'<br><b>Factura:</b> '+esc(p.invoice||'—')+'<br><b>Estado:</b> '+esc(p.status||'')+'</p><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo</th><th>Subtotal</th></tr></thead><tbody>'+items+'</tbody></table><div class="total">Total: '+moneySafe(p.total)+'</div><script>window.addEventListener("load",function(){window.print()})<\/script></body></html>';
    const w = window.open('', '_blank', 'width=850,height=700');
    if (!w) return notify('El navegador bloqueó la ventana de impresión.');
    w.document.open(); w.document.write(html); w.document.close();
  }

  function cancelPurchase(p) {
    if (String(p.status||'').toLowerCase() === 'anulada') return;
    if (!window.confirm('¿Confirmas eliminar/anular la compra '+String(p.number||'')+'?\n\nSe revertirá la entrada de inventario y, si fue a crédito, se ajustará el saldo del proveedor.')) return;

    let reversed = false;
    (p.items || []).forEach(item => {
      const prod = productById(item.productId);
      const qty = Number(item.qty || 0);
      if (!prod || qty <= 0) return;
      prod.stock = Number(prod.stock || 0) - qty;
      db.kardex = Array.isArray(db.kardex) ? db.kardex : [];
      db.kardex.unshift({
        id: typeof window.uid === 'function' ? window.uid('k') : 'k-'+Date.now(),
        date: todaySafe(),
        type: 'Anulación compra',
        ref: p.number || '',
        productId: prod.id,
        qty: -qty,
        balance: prod.stock,
        cost: Number(item.cost || prod.cost || 0),
        user: window.currentUser?.name || 'Sistema'
      });
      reversed = true;
    });

    if (p.method === 'Crédito') {
      const supplier = (db.suppliers || []).find(s => String(s.id) === String(p.supplierId));
      if (supplier) supplier.balance = Math.max(0, Number(supplier.balance || 0) - Number(p.total || 0));
    }

    p.status = 'Anulada';
    p.cancelledAt = new Date().toISOString();
    p.cancelledBy = window.currentUser?.id || null;
    try { if (typeof window.log === 'function') window.log('Compra anulada', p.number || ''); } catch (_) {}
    window.save();
    notify(reversed ? 'Compra anulada e inventario revertido.' : 'Compra anulada.');
    renderPurchasesFixed();
  }

  window.renderPurchases = renderPurchasesFixed;
  window.openPurchaseModal = openPurchaseFixed;
  window.savePurchase = savePurchaseFixed;
  window.ventaraPurchasesFix = { render:renderPurchasesFixed, open:openPurchaseFixed, view:viewPurchase, print:printPurchase, cancel:cancelPurchase };

  const boot = () => {
    try {
      if (document.getElementById('purchases')?.classList.contains('active')) renderPurchasesFixed();
    } catch (_) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
