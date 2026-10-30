/* VENTARA: agrega el documento del cliente debajo de su nombre SOLO en tickets de ventas a crédito.
   Parche aislado de impresión: no modifica datos, ventas, persistencia, autenticación ni index.html. */
(() => {
  'use strict';
  if (window.__ventaraTicketClientDocPatch) return;
  window.__ventaraTicketClientDocPatch = true;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const originalPrintTicket = window.printTicket;
  if (typeof originalPrintTicket !== 'function') {
    console.warn('[VENTARA] No se instaló el documento del cliente: printTicket no está disponible.');
    return;
  }

  window.printTicket = function(id) {
    const sale = Array.isArray(window.db?.sales) ? window.db.sales.find(x => x.id === id) : null;
    if (!sale) return originalPrintTicket.apply(this, arguments);

    const credit = typeof window.isCreditSale === 'function'
      ? window.isCreditSale(sale)
      : String(sale.method || '').trim().toLowerCase() === 'crédito';
    const customer = Array.isArray(window.db?.clients)
      ? window.db.clients.find(x => x.id === sale.clientId)
      : null;
    const documentNumber = credit ? String(customer?.doc || '').trim() : '';

    if (!documentNumber) return originalPrintTicket.apply(this, arguments);

    const logo = window.db.settings.logo || window.VENTARA_LOGO;
    const money = window.money;
    const rows = sale.items.map(item =>
      '<div class="r"><span>' + item.qty + ' x ' + escapeHtml(item.name) +
      '</span><span>' + money(item.qty * item.price) + '</span></div>'
    ).join('');
    const win = window.open('', '_blank', 'width=420,height=800');
    if (!win) return window.toast('El navegador bloqueó la ventana de impresión');

    const customerName = typeof window.clientName === 'function'
      ? window.clientName(sale.clientId)
      : (customer?.name || 'Consumidor final');

    win.document.write(`<html><head><title>${escapeHtml(sale.number)}</title><style>@page{size:80mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}body{font-family:'Courier New',monospace;font-size:12px;color:#000}.ticket80{width:80mm;box-sizing:border-box;padding:3mm}.c{text-align:center}.l{text-align:left}.r{display:flex;justify-content:space-between;gap:5px}.r span:first-child{max-width:55mm;word-break:break-word}.hr{border-top:1px dashed #000;margin:6px 0}img{max-width:48mm;max-height:22mm;object-fit:contain}h2{font-size:17px;margin:4px 0}h3{font-size:14px;margin:4px 0}</style></head><body><div class="ticket80"><div class="c"><img src="${logo}"><h2>${window.db.settings.business}</h2><div>${window.db.settings.nit||''}</div><div>${window.db.settings.city||''}</div><div>${window.db.settings.phone||''}</div></div><div class="hr"></div><div><b>FACTURA POS ${escapeHtml(sale.number)}</b><br>${escapeHtml(sale.date)} ${escapeHtml(sale.time)}<br>Cliente: ${escapeHtml(customerName)}<br>Documento: ${escapeHtml(documentNumber)}</div><div class="hr"></div>${rows}<div class="hr"></div><div class="r"><b>TOTAL</b><b>${money(sale.total)}</b></div><div class="r"><span>Medio de pago</span><span>${escapeHtml(sale.method)}</span></div>${credit ? `<div class="r"><span>Plazo</span><span>${Number(customer?.creditDays)||0} días</span></div>` : ''}<div class="hr"></div><div class="c">Gracias por su compra<br>VENTARA POS</div></div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
    win.document.close();
  };
})();
