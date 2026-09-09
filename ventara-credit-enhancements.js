(() => {
  'use strict';

  const STORAGE_KEY = 'ventara_credit_accounts_v1';
  const SALES_KEY = 'ventara_credit_sales_v1';
  const PAYMENTS_KEY = 'ventara_credit_payments_v1';
  const WINDOW_CLASS = 'ventara-managed-window';

  const read = (key, fallback = []) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(value) ? value : fallback;
    } catch (_) { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const esc = (v) => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const daysUntil = (date) => Math.ceil((new Date(`${date}T23:59:59`) - new Date()) / 86400000);

  function accounts() { return read(STORAGE_KEY); }
  function sales() { return read(SALES_KEY); }
  function payments() { return read(PAYMENTS_KEY); }
  function balanceFor(accountId) {
    const s = sales().filter(x => x.accountId === accountId).reduce((a, x) => a + Number(x.amount || 0), 0);
    const p = payments().filter(x => x.accountId === accountId).reduce((a, x) => a + Number(x.amount || 0), 0);
    return Math.max(0, s - p);
  }
  function accountWithBalance(a) { return { ...a, balance: balanceFor(a.id), available: Math.max(0, Number(a.creditLimit || 0) - balanceFor(a.id)) }; }

  function injectStyles() {
    if (document.getElementById('ventara-credit-enhancements-style')) return;
    const style = document.createElement('style');
    style.id = 'ventara-credit-enhancements-style';
    style.textContent = `
      .ventara-credit-overlay{position:fixed;inset:0;background:rgba(8,34,44,.48);z-index:99990;display:flex;align-items:center;justify-content:center;padding:18px}
      .ventara-credit-window{width:min(1180px,96vw);height:min(760px,94vh);background:#fff;border-radius:16px;box-shadow:0 22px 70px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;border:1px solid #d7e3e8}
      .ventara-window-bar{height:52px;min-height:52px;background:#005f73;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 18px;cursor:default}
      .ventara-window-title{font-weight:800;font-size:16px;display:flex;gap:9px;align-items:center}.ventara-window-title small{font-weight:500;opacity:.78}
      .ventara-window-actions{display:flex;gap:6px}.ventara-window-actions button{width:32px;height:32px;border:0;border-radius:7px;background:rgba(255,255,255,.12);color:#fff;font-size:17px;cursor:pointer}.ventara-window-actions button:hover{background:rgba(255,255,255,.22)}.ventara-window-actions .close{background:#e5483e}.ventara-window-actions .close:hover{background:#c9362d}
      .ventara-credit-body{padding:18px;overflow:auto;background:#f6fafb;flex:1}.ventara-credit-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px}.ventara-credit-actions{display:flex;gap:8px;flex-wrap:wrap}
      .vc-btn{border:0;border-radius:8px;padding:10px 13px;font-weight:700;cursor:pointer}.vc-primary{background:#009fe3;color:#fff}.vc-primary:hover{background:#0087c2}.vc-secondary{background:#e8f0f3;color:#16404c}.vc-danger{background:#ef4a3e;color:#fff}.vc-green{background:#17834b;color:#fff}
      .vc-search{min-width:260px;padding:10px 12px;border:1px solid #cbdde3;border-radius:8px;background:#fff;outline:none}.vc-search:focus{border-color:#009fe3;box-shadow:0 0 0 3px rgba(0,159,227,.12)}
      .vc-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.vc-kpi{background:#fff;border:1px solid #dbe7eb;border-radius:12px;padding:14px}.vc-kpi span{display:block;color:#607985;font-size:12px}.vc-kpi strong{display:block;font-size:22px;margin-top:5px;color:#123c48}.vc-kpi.danger strong{color:#c63731}.vc-kpi.green strong{color:#137643}
      .vc-card{background:#fff;border:1px solid #dbe7eb;border-radius:12px;padding:14px;margin-bottom:14px}.vc-card h3{margin:0 0 12px;color:#143e4a;font-size:15px}.vc-table-wrap{overflow:auto}.vc-table{width:100%;border-collapse:collapse;font-size:13px}.vc-table th{background:#f0f6f8;text-align:left;color:#55717b;font-size:11px;text-transform:uppercase;padding:10px;white-space:nowrap}.vc-table td{padding:11px 10px;border-top:1px solid #e6eef1;white-space:nowrap}.vc-table tr:hover td{background:#fbfdfe}.vc-badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800}.vc-badge.ok{background:#d9f5e7;color:#137643}.vc-badge.warn{background:#fff0cc;color:#9a6800}.vc-badge.overdue{background:#ffe0dd;color:#b8322b}.vc-empty{padding:34px;text-align:center;color:#6c858d}
      .vc-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.vc-field{display:flex;flex-direction:column;gap:5px}.vc-field.full{grid-column:1/-1}.vc-field label{font-size:12px;font-weight:700;color:#46626b}.vc-field input,.vc-field select,.vc-field textarea{border:1px solid #cbdde3;border-radius:8px;padding:10px;background:#fff;font:inherit}.vc-field textarea{min-height:70px;resize:vertical}.vc-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      .vc-modal{position:fixed;inset:0;background:rgba(8,34,44,.52);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px}.vc-dialog{width:min(620px,94vw);background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden}.vc-dialog-head{padding:14px 16px;background:#005f73;color:#fff;display:flex;justify-content:space-between;align-items:center}.vc-dialog-head button{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}.vc-dialog-body{padding:16px}.vc-help{font-size:12px;color:#6a8189;margin:4px 0 0}
      .ventara-window-minimized{height:52px!important;align-self:flex-end;margin-top:auto}.ventara-window-minimized > :not(.ventara-window-bar){display:none!important}.ventara-window-maximized{width:calc(100vw - 24px)!important;height:calc(100vh - 24px)!important}
      @media(max-width:800px){.vc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.vc-form{grid-template-columns:1fr}.vc-field.full{grid-column:auto}.ventara-credit-window{width:98vw;height:96vh}}
    `;
    document.head.appendChild(style);
  }

  function normalizeText(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  function renameCreditMenu() {
    document.querySelectorAll('button,a,[role="button"]').forEach(el => {
      const t = normalizeText(el.textContent);
      if (t === 'fiados / crédito' || t === 'fiados/ crédito' || t === 'fiados') {
        el.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE && normalizeText(n.textContent).includes('fiad')) n.textContent = ' Crédito y Cartera'; });
        if (!normalizeText(el.textContent).includes('crédito y cartera')) el.textContent = 'Crédito y Cartera';
        el.setAttribute('title', 'Crédito y Cartera');
        el.dataset.ventaraCreditMenu = '1';
      }
    });
  }

  function findCreditMenuTarget(target) {
    const el = target.closest('button,a,[role="button"]');
    if (!el) return null;
    const t = normalizeText(el.textContent);
    if (t === 'fiados / crédito' || t === 'fiados' || t === 'crédito y cartera' || t === 'cartera y crédito') return el;
    return null;
  }

  function openCreditWindow() {
    if (document.getElementById('ventara-credit-overlay')) { document.getElementById('ventara-credit-overlay').style.display = 'flex'; renderCredit(); return; }
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'ventara-credit-overlay'; overlay.className = 'ventara-credit-overlay';
    overlay.innerHTML = `<section class="ventara-credit-window ${WINDOW_CLASS}" role="dialog" aria-modal="true" aria-label="Crédito y Cartera">
      <div class="ventara-window-bar"><div class="ventara-window-title">Crédito y Cartera <small>Gestión de saldos, vencimientos y abonos</small></div><div class="ventara-window-actions"><button data-win="min" title="Minimizar">−</button><button data-win="max" title="Maximizar">□</button><button class="close" data-win="close" title="Cerrar">×</button></div></div>
      <div id="ventara-credit-content" class="ventara-credit-body"></div>
    </section>`;
    document.body.appendChild(overlay);
    const win = overlay.querySelector('.ventara-credit-window');
    overlay.addEventListener('click', e => { if (e.target === overlay) closeCreditWindow(); });
    overlay.querySelector('[data-win="close"]').onclick = closeCreditWindow;
    overlay.querySelector('[data-win="min"]').onclick = () => win.classList.toggle('ventara-window-minimized');
    overlay.querySelector('[data-win="max"]').onclick = () => win.classList.toggle('ventara-window-maximized');
    document.addEventListener('keydown', creditEscape, true);
    renderCredit();
  }
  function creditEscape(e) { if (e.key === 'Escape' && document.getElementById('ventara-credit-overlay')) closeCreditWindow(); }
  function closeCreditWindow() { const o = document.getElementById('ventara-credit-overlay'); if (o) o.remove(); document.removeEventListener('keydown', creditEscape, true); }

  function renderCredit(filter = '') {
    const host = document.getElementById('ventara-credit-content'); if (!host) return;
    const rows = accounts().map(accountWithBalance).filter(a => !filter || `${a.customer} ${a.document} ${a.phone}`.toLowerCase().includes(filter.toLowerCase()));
    const total = rows.reduce((s,a) => s+a.balance,0);
    const overdue = rows.filter(a => a.balance > 0 && a.dueDate && daysUntil(a.dueDate) < 0).reduce((s,a)=>s+a.balance,0);
    const available = rows.reduce((s,a)=>s+a.available,0);
    const dueSoon = rows.filter(a => a.balance > 0 && a.dueDate && daysUntil(a.dueDate) >= 0 && daysUntil(a.dueDate) <= 7).length;
    host.innerHTML = `
      <div class="ventara-credit-toolbar"><div><strong style="font-size:20px;color:#123c48">Cartera</strong><div style="font-size:12px;color:#68818a">Control de crédito de clientes y cuentas por cobrar</div></div><div class="ventara-credit-actions"><button class="vc-btn vc-primary" data-action="new-account">+ Nueva cuenta</button><button class="vc-btn vc-green" data-action="new-sale">+ Venta a crédito</button><button class="vc-btn vc-secondary" data-action="new-payment">Registrar abono</button><button class="vc-btn vc-secondary" data-action="export">Exportar CSV</button><button class="vc-btn vc-secondary" data-action="refresh">Actualizar</button><button class="vc-btn vc-danger" data-action="close">Cerrar</button></div></div>
      <div class="vc-kpis"><div class="vc-kpi"><span>Cartera total</span><strong>${money(total)}</strong></div><div class="vc-kpi danger"><span>Vencido</span><strong>${money(overdue)}</strong></div><div class="vc-kpi green"><span>Cupo disponible</span><strong>${money(available)}</strong></div><div class="vc-kpi ${dueSoon ? 'danger':''}"><span>Vencen en 7 días</span><strong>${dueSoon}</strong></div></div>
      <div class="vc-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><h3 style="margin:0">Cuentas de crédito</h3><input id="vc-credit-search" class="vc-search" placeholder="Buscar cliente, documento o teléfono" value="${esc(filter)}"></div>
        <div class="vc-table-wrap"><table class="vc-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Saldo</th><th>Cupo</th><th>Disponible</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows.length ? rows.map(renderRow).join('') : '<tr><td colspan="8" class="vc-empty">No hay cuentas registradas todavía. Crea la primera cuenta para empezar a manejar la cartera.</td></tr>'}</tbody></table></div></div>
      <div class="vc-card"><h3>Resumen operativo</h3><div style="font-size:13px;color:#58717a">Las cuentas, ventas a crédito y abonos se guardan localmente para no bloquear el módulo si la conexión con la nube falla. Cada movimiento queda con fecha, referencia y método de pago.</div></div>`;
    host.querySelector('#vc-credit-search').oninput = e => renderCredit(e.target.value);
    host.querySelectorAll('[data-action]').forEach(b => b.onclick = () => handleCreditAction(b.dataset.action));
    host.querySelectorAll('[data-account-action]').forEach(b => b.onclick = () => handleAccountAction(b.dataset.accountAction, b.dataset.id));
  }

  function renderRow(a) {
    const overdue = a.balance > 0 && a.dueDate && daysUntil(a.dueDate) < 0;
    const soon = a.balance > 0 && a.dueDate && daysUntil(a.dueDate) >= 0 && daysUntil(a.dueDate) <= 7;
    const status = a.balance <= 0 ? ['Al día','ok'] : overdue ? ['Vencido','overdue'] : soon ? ['Por vencer','warn'] : ['Pendiente','warn'];
    return `<tr><td><strong>${esc(a.customer)}</strong><div style="font-size:11px;color:#758a92">${esc(a.phone || 'Sin teléfono')}</div></td><td>${esc(a.document || '—')}</td><td><strong>${money(a.balance)}</strong></td><td>${money(a.creditLimit)}</td><td>${money(a.available)}</td><td>${a.dueDate ? new Date(`${a.dueDate}T12:00:00`).toLocaleDateString('es-CO') : '—'}</td><td><span class="vc-badge ${status[1]}">${status[0]}</span></td><td><button class="vc-btn vc-secondary" style="padding:6px 9px" data-account-action="payment" data-id="${esc(a.id)}">Abono</button> <button class="vc-btn vc-secondary" style="padding:6px 9px" data-account-action="sale" data-id="${esc(a.id)}">Crédito</button> <button class="vc-btn vc-danger" style="padding:6px 9px" data-account-action="delete" data-id="${esc(a.id)}">Eliminar</button></td></tr>`;
  }

  function handleCreditAction(action) {
    if (action === 'new-account') showAccountForm();
    if (action === 'new-sale') showSaleForm();
    if (action === 'new-payment') showPaymentForm();
    if (action === 'export') exportCsv();
    if (action === 'refresh') renderCredit(document.getElementById('vc-credit-search')?.value || '');
    if (action === 'close') closeCreditWindow();
  }
  function handleAccountAction(action, id) {
    if (action === 'payment') showPaymentForm(id);
    if (action === 'sale') showSaleForm(id);
    if (action === 'delete') {
      const a = accounts().find(x=>x.id===id); if (!a) return;
      if (!confirm(`¿Eliminar la cuenta de ${a.customer}? Los movimientos históricos no se borrarán.`)) return;
      write(STORAGE_KEY, accounts().filter(x=>x.id!==id)); renderCredit();
    }
  }

  function dialog(title, body) {
    const d = document.createElement('div'); d.className='vc-modal'; d.innerHTML=`<div class="vc-dialog"><div class="vc-dialog-head"><strong>${title}</strong><button type="button" data-x>×</button></div><div class="vc-dialog-body">${body}</div></div>`;
    document.body.appendChild(d); d.querySelector('[data-x]').onclick=()=>d.remove(); d.addEventListener('click',e=>{if(e.target===d)d.remove()}); return d;
  }
  function showAccountForm() {
    const d=dialog('Nueva cuenta de crédito',`<form class="vc-form" id="vc-account-form"><div class="vc-field"><label>Cliente *</label><input name="customer" required autofocus></div><div class="vc-field"><label>Documento</label><input name="document"></div><div class="vc-field"><label>Teléfono</label><input name="phone"></div><div class="vc-field"><label>Cupo de crédito</label><input name="creditLimit" type="number" min="0" step="100" value="0"></div><div class="vc-field"><label>Fecha de vencimiento inicial</label><input name="dueDate" type="date"></div><div class="vc-field full"><label>Notas</label><textarea name="notes" placeholder="Condiciones, observaciones o acuerdos de pago"></textarea></div><div class="vc-field full"><div class="vc-help">El cupo se usa para mostrar cuánto crédito queda disponible. Las ventas y abonos modifican el saldo automáticamente.</div></div><div class="vc-field full vc-form-actions"><button type="button" class="vc-btn vc-secondary" data-cancel>Cancelar</button><button class="vc-btn vc-primary">Guardar cuenta</button></div></form>`);
    d.querySelector('[data-cancel]').onclick=()=>d.remove(); d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const a=accounts();a.push({id:uid('ACC'),customer:f.get('customer'),document:f.get('document'),phone:f.get('phone'),creditLimit:Number(f.get('creditLimit')||0),dueDate:f.get('dueDate')||'',notes:f.get('notes'),createdAt:new Date().toISOString()});write(STORAGE_KEY,a);d.remove();renderCredit();};
  }
  function accountOptions(selected='') { return accounts().map(accountWithBalance).map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(a.customer)} — saldo ${money(a.balance)}</option>`).join(''); }
  function showSaleForm(selected='') {
    if (!accounts().length) { showAccountForm(); return; }
    const d=dialog('Registrar venta a crédito',`<form class="vc-form" id="vc-sale-form"><div class="vc-field full"><label>Cliente *</label><select name="accountId" required>${accountOptions(selected)}</select></div><div class="vc-field"><label>Valor *</label><input name="amount" type="number" min="1" step="100" required></div><div class="vc-field"><label>Fecha de vencimiento</label><input name="dueDate" type="date" value="${today()}"></div><div class="vc-field"><label>Referencia / factura</label><input name="reference" placeholder="FAC-0001"></div><div class="vc-field"><label>Concepto</label><input name="note" placeholder="Venta de mercancía"></div><div class="vc-field full vc-form-actions"><button type="button" class="vc-btn vc-secondary" data-cancel>Cancelar</button><button class="vc-btn vc-green">Registrar crédito</button></div></form>`);
    d.querySelector('[data-cancel]').onclick=()=>d.remove(); d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const id=f.get('accountId');const a=accountWithBalance(accounts().find(x=>x.id===id));const amount=Number(f.get('amount')||0);if(amount<=0)return;if(a.creditLimit>0 && amount>a.available){alert(`El valor supera el cupo disponible de ${money(a.available)}.`);return;}const s=sales();s.push({id:uid('CR'),accountId:id,amount,date:today(),dueDate:f.get('dueDate')||'',reference:f.get('reference')||'',note:f.get('note')||'',status:'pending'});write(SALES_KEY,s);const aa=accounts().map(x=>x.id===id&&f.get('dueDate')?{...x,dueDate:f.get('dueDate')}:x);write(STORAGE_KEY,aa);d.remove();renderCredit();};
  }
  function showPaymentForm(selected='') {
    if (!accounts().length) { showAccountForm(); return; }
    const d=dialog('Registrar abono',`<form class="vc-form" id="vc-payment-form"><div class="vc-field full"><label>Cliente *</label><select name="accountId" required>${accountOptions(selected)}</select></div><div class="vc-field"><label>Valor del abono *</label><input name="amount" type="number" min="1" step="100" required></div><div class="vc-field"><label>Método</label><select name="method"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Consignación</option><option>Otro</option></select></div><div class="vc-field"><label>Referencia</label><input name="reference" placeholder="REC-0001"></div><div class="vc-field"><label>Nota</label><input name="note" placeholder="Abono recibido"></div><div class="vc-field full vc-form-actions"><button type="button" class="vc-btn vc-secondary" data-cancel>Cancelar</button><button class="vc-btn vc-primary">Guardar abono</button></div></form>`);
    d.querySelector('[data-cancel]').onclick=()=>d.remove(); d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const id=f.get('accountId');const a=accountWithBalance(accounts().find(x=>x.id===id));const amount=Number(f.get('amount')||0);if(amount<=0)return;if(amount>a.balance){alert(`El abono no puede superar el saldo pendiente de ${money(a.balance)}.`);return;}const p=payments();p.push({id:uid('PAY'),accountId:id,amount,date:today(),method:f.get('method'),reference:f.get('reference')||'',note:f.get('note')||''});write(PAYMENTS_KEY,p);d.remove();renderCredit();};
  }

  function exportCsv() {
    const rows=accounts().map(accountWithBalance); const head=['Cliente','Documento','Telefono','Saldo','Cupo','Disponible','Vencimiento','Estado']; const body=rows.map(a=>[a.customer,a.document,a.phone,a.balance,a.creditLimit,a.available,a.dueDate,a.balance<=0?'Al dia':(a.dueDate&&daysUntil(a.dueDate)<0?'Vencido':'Pendiente')]);
    const csv=[head,...body].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ventara-cartera-${today()}.csv`;a.click();URL.revokeObjectURL(url);
  }

  function enhanceExistingModal(root) {
    if (!root || root.dataset.ventaraWindowEnhanced === '1') return;
    const cs=getComputedStyle(root); const r=root.getBoundingClientRect();
    if (r.width<240 || r.height<120 || (cs.display==='none')) return;
    root.dataset.ventaraWindowEnhanced='1'; root.classList.add(WINDOW_CLASS);
    let bar=root.querySelector(':scope > .ventara-window-bar');
    if(!bar){
      bar=document.createElement('div');bar.className='ventara-window-bar';bar.innerHTML='<div class="ventara-window-title">VENTARA</div><div class="ventara-window-actions"><button data-ew="min" title="Minimizar">−</button><button data-ew="max" title="Maximizar">□</button><button class="close" data-ew="close" title="Cerrar">×</button></div>';
      root.insertBefore(bar,root.firstChild);
    }
    const close=bar.querySelector('[data-ew="close"]'); const min=bar.querySelector('[data-ew="min"]'); const max=bar.querySelector('[data-ew="max"]');
    if(close) close.onclick=()=>{const candidates=root.querySelectorAll('button,[role="button"]');let done=false;candidates.forEach(b=>{if(!done&&b!==close&&/cancelar|cerrar|salir/i.test(b.textContent)){b.click();done=true;}});if(!done){root.style.display='none';}};
    if(min) min.onclick=()=>root.classList.toggle('ventara-window-minimized');
    if(max) max.onclick=()=>root.classList.toggle('ventara-window-maximized');
  }

  function observeModals() {
    const scan=()=>{
      document.querySelectorAll('[role="dialog"],.modal,.dialog,.modal-content').forEach(enhanceExistingModal);
      renameCreditMenu();
    };
    scan();
    new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  }

  function init() {
    injectStyles();
    renameCreditMenu();
    observeModals();
    document.addEventListener('click', e=>{
      const target=findCreditMenuTarget(e.target); if(!target)return;
      e.preventDefault(); e.stopImmediatePropagation(); openCreditWindow();
    }, true);
  }

  window.ventaraCredit = { open:openCreditWindow, close:closeCreditWindow, render:renderCredit, accounts, sales, payments };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
