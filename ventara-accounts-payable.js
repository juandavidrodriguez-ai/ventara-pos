/* VENTARA POS — Cuentas por pagar a proveedores
 * Parche aislado. No modifica Login/Auth, Compras, Caja, Ventas ni index.html.
 * Persistencia: reutiliza window.db + window.save() para conservar el aislamiento por empresa.
 */
(()=> {
  'use strict';

  const ROOT_ID='suppliers';
  const TAB_KEY='__ventaraPayablesView';
  const WRAP_KEY='__ventaraPayablesRenderWrapped';
  const STATES=['Pendiente','Abono parcial','Vencido','Pagado'];

  const getDb=()=>{try{if(typeof db!=='undefined'&&db)return db;return window.db||null}catch(_){try{return window.db||null}catch(__){return null}}};
  const notify=(m)=>{try{if(typeof window.toast==='function')window.toast(String(m));else alert(String(m))}catch(_){}};
  const esc=(v)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const money=(v)=>{const n=Number(v||0);return '$ '+new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(Number.isFinite(n)?n:0)};
  const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const id=(p='cp')=>{try{return typeof window.uid==='function'?window.uid(p):p+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)}catch(_){return p+'-'+Date.now()}};
  const db=()=>getDb();
  const suppliers=()=>Array.isArray(db()?.suppliers)?db().suppliers:[];
  const supplierName=(sid)=>{const s=suppliers().find(x=>String(x?.id)===String(sid));return s?.name||s?.nombre||s?.razonSocial||'Proveedor sin nombre'};
  const pending=(r)=>Math.max(0,Number(r?.total||0)-Number(r?.abonado||0));
  const paid=(r)=>Math.max(0,Number(r?.abonado||0));
  const isPastDue=(r)=>!!r?.vencimiento && pending(r)>0 && String(r.vencimiento)<today();

  function calcState(r){
    const total=Math.max(0,Number(r?.total||0)), ab=paid(r);
    if(total>0 && ab>=total)return 'Pagado';
    if(isPastDue(r))return 'Vencido';
    if(ab>0)return 'Abono parcial';
    return 'Pendiente';
  }

  function ensureArray(){
    const d=db(); if(!d)return null;
    d.accountsPayable=Array.isArray(d.accountsPayable)?d.accountsPayable:[];
    return d;
  }

  function seedFromCreditPurchases(){
    const d=ensureArray(); if(!d)return false;
    const purchases=Array.isArray(d.purchases)?d.purchases:[];
    let changed=false;
    purchases.forEach(p=>{
      if(String(p?.method||'').trim().toLowerCase()!=='crédito')return;
      if(String(p?.status||'').trim().toLowerCase()==='anulada')return;
      const already=d.accountsPayable.some(r=>String(r?.sourcePurchaseId||'')===String(p?.id||''));
      if(already)return;
      const duplicate=d.accountsPayable.some(r=>
        !r?.sourcePurchaseId &&
        String(r?.supplierId||'')===String(p?.supplierId||'') &&
        String(r?.invoice||'')===String(p?.invoice||p?.number||'') &&
        Number(r?.total||0)===Number(p?.total||0)
      );
      if(duplicate)return;
      d.accountsPayable.unshift({
        id:id('cp'),
        supplierId:p.supplierId||'',
        invoice:String(p.invoice||p.number||'').trim(),
        fecha:String(p.date||today()),
        vencimiento:'',
        total:Number(p.total||0),
        abonado:0,
        abonos:[],
        estado:'Pendiente',
        sourcePurchaseId:p.id||null,
        createdAt:new Date().toISOString(),
        migratedFromPurchase:true,
        supplierBalanceTracked:true
      });
      changed=true;
    });
    return changed;
  }

  function persist(){
    try{if(typeof window.save==='function')window.save();else if(typeof window.localSave==='function')window.localSave();return true}catch(e){console.error('[VENTARA] cuentas por pagar save',e);notify('No se pudo guardar la cuenta por pagar.');return false}
  }

  function stateBadge(state){
    const cls=state==='Pagado'?'green':state==='Vencido'?'red':state==='Abono parcial'?'warn':'';
    return '<span class="badge '+cls+'">'+esc(state)+'</span>';
  }

  function normalizeRecord(r){
    r.total=Math.max(0,Number(r.total||0));
    r.abonado=Math.min(r.total,Math.max(0,Number(r.abonado||0)));
    r.abonos=Array.isArray(r.abonos)?r.abonos:[];
    r.estado=calcState(r);
    return r;
  }

  function renderSupplierPayablesButton(root){
    if(!root)return;
    const head=root.querySelector('.head');
    const actions=head?.querySelector('.actions');
    if(!actions)return;
    if(actions.querySelector('[data-vap-open]'))return;
    const b=document.createElement('button');
    b.type='button';
    b.className='btn primary';
    b.setAttribute('data-vap-open','1');
    b.textContent='Cuentas por pagar';
    b.addEventListener('click',(ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      window[TAB_KEY]='payables';
      try{
        if(window.ventaraAccountsPayable?.render) window.ventaraAccountsPayable.render();
        else renderPayables();
      }catch(e){
        console.error('[VENTARA] Error al abrir Cuentas por pagar',e);
        notify('No se pudo abrir Cuentas por pagar. Revisa la consola.');
      }
    });
    actions.appendChild(b);
  }

  function installRenderHook(){
    try{
      const current=window.renderSuppliers;
      if(typeof current!=='function')return false;
      if(current[WRAP_KEY])return true;
      const original=current;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        setTimeout(()=>{
          try{
            const root=document.getElementById(ROOT_ID);
            if(!root)return;
            const desired=window[TAB_KEY]||'suppliers';
            if(desired==='payables')renderPayables();
            else renderSupplierPayablesButton(root);
          }catch(e){console.warn('[VENTARA] payables render hook',e)}
        },0);
        return result;
      };
      wrapped[WRAP_KEY]=true;
      wrapped.__ventaraPayablesOriginal=original;
      window.renderSuppliers=wrapped;
      return true;
    }catch(e){console.warn('[VENTARA] payables hook',e);return false}
  }

  function totals(records){
    return records.reduce((a,r)=>{const p=pending(r);a.total+=Number(r.total||0);a.paid+=paid(r);a.pending+=p;if(isPastDue(r))a.overdue+=p;return a},{total:0,paid:0,pending:0,overdue:0});
  }

  function renderPayables(){
    const root=document.getElementById(ROOT_ID); if(!root)return;
    const d=ensureArray(); if(!d)return;
    if(seedFromCreditPurchases())persist();
    d.accountsPayable.forEach(normalizeRecord);
    const t=totals(d.accountsPayable);
    window[TAB_KEY]='payables';

    const rows=d.accountsPayable.map(r=>{
      const state=calcState(r);
      r.estado=state;
      const due=r.vencimiento?esc(r.vencimiento):'<span class="muted">Sin fecha</span>';
      const inv=r.invoice?esc(r.invoice):'<span class="muted">Sin factura</span>';
      return '<tr>'+
        '<td>'+esc(supplierName(r.supplierId))+'</td>'+
        '<td>'+inv+'</td>'+
        '<td>'+esc(r.fecha||'')+'</td>'+
        '<td>'+due+'</td>'+
        '<td>'+money(r.total)+'</td>'+
        '<td><button type="button" class="btn sm" data-vap-abono="'+esc(r.id)+'" title="Registrar abono">'+money(r.abonado)+'</button></td>'+
        '<td><b>'+money(pending(r))+'</b></td>'+
        '<td><select class="vap-status-select" data-vap-status="'+esc(r.id)+'" aria-label="Estado">'+STATES.map(s=>'<option value="'+esc(s)+'" '+(s===state?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></td>'+
        '<td><div class="actions" style="gap:5px">'+
          (pending(r)>0?'<button type="button" class="btn sm success" data-vap-payall="'+esc(r.id)+'">Pagar todo</button>':'')+
          '<button type="button" class="btn sm" data-vap-view="'+esc(r.id)+'">Ver</button>'+
        '</div></td>'+
      '</tr>';
    }).join('');

    root.innerHTML=
      '<div class="head"><div><h1>Cuentas por pagar</h1><p>Control de facturas pendientes y abonos a proveedores.</p></div><div class="actions"><button type="button" class="btn primary" data-vap-new>+ Nueva cuenta por pagar</button></div></div>'+

      '<div class="grid kpis" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px">'+
        '<div class="card kpi"><div class="label">Por pagar</div><div class="value">'+money(t.pending)+'</div><div class="sub">Saldo pendiente total</div></div>'+
        '<div class="card kpi"><div class="label">Vence pronto</div><div class="value">'+money(d.accountsPayable.filter(r=>pending(r)>0&&r.vencimiento&&String(r.vencimiento)>=today()&&String(r.vencimiento)<=(()=>{const d=new Date();d.setDate(d.getDate()+7);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)})()).reduce((a,r)=>a+pending(r),0))+'</div><div class="sub">Facturas aún abiertas</div></div>'+
        '<div class="card kpi"><div class="label">Vencido</div><div class="value">'+money(t.overdue)+'</div><div class="sub">Saldo con vencimiento pasado</div></div>'+
      '</div>'+
      '<div class="card" data-vap-card>'+
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:14px">'+
          '<div class="field" style="min-width:220px;flex:1"><label>Buscar factura / proveedor</label><input type="search" data-vap-search placeholder="Ej. Plasdecol, FAC-1258"></div>'+
          '<div class="field" style="min-width:170px"><label>Estado</label><select data-vap-filter-state><option value="">Todos</option>'+STATES.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select></div>'+
          '<button type="button" class="btn" data-vap-clear>Limpiar filtros</button>'+
        '</div>'+
        '<div class="tablewrap"><table class="table"><thead><tr><th>Proveedor</th><th>Factura</th><th>Fecha</th><th>Vencimiento</th><th>Total</th><th>Abonado</th><th>Pendiente</th><th>Estado</th><th>Acciones</th></tr></thead><tbody data-vap-body>'+rows+'</tbody></table></div>'+
        (d.accountsPayable.length?'':'<div class="empty">No hay cuentas por pagar registradas.</div>')+
      '</div>';

    const back=document.createElement('button');
    back.type='button';
    back.className='btn';
    back.textContent='← Proveedores';
    back.addEventListener('click',()=>{
      window[TAB_KEY]='suppliers';
      if(typeof window.renderSuppliers==='function')window.renderSuppliers();
    });
    root.querySelector('.head .actions')?.prepend(back);
    root.querySelector('[data-vap-new]')?.addEventListener('click',openPayableModal);
    root.querySelector('[data-vap-search]')?.addEventListener('input',applyFilters);
    root.querySelector('[data-vap-filter-state]')?.addEventListener('change',applyFilters);
    root.querySelector('[data-vap-clear]')?.addEventListener('click',()=>{
      const q=root.querySelector('[data-vap-search]'),s=root.querySelector('[data-vap-filter-state]');
      if(q)q.value='';if(s)s.value='';applyFilters();
    });
    root.querySelectorAll('[data-vap-abono]').forEach(b=>b.addEventListener('click',()=>openPaymentModal(b.getAttribute('data-vap-abono'))));
    root.querySelectorAll('[data-vap-payall]').forEach(b=>b.addEventListener('click',()=>payAll(b.getAttribute('data-vap-payall'))));
    root.querySelectorAll('[data-vap-view]').forEach(b=>b.addEventListener('click',()=>viewPayable(b.getAttribute('data-vap-view'))));
    root.querySelectorAll('[data-vap-status]').forEach(s=>s.addEventListener('change',()=>changeStatus(s.getAttribute('data-vap-status'),s.value)));
  }

  function applyFilters(){
    const root=document.getElementById(ROOT_ID);if(!root)return;
    const q=String(root.querySelector('[data-vap-search]')?.value||'').trim().toLowerCase();
    const st=String(root.querySelector('[data-vap-filter-state]')?.value||'');
    const d=ensureArray();if(!d)return;
    root.querySelectorAll('[data-vap-body] tr').forEach(tr=>{
      const text=(tr.textContent||'').toLowerCase();
      const select=tr.querySelector('[data-vap-status]');
      const okQ=!q||text.includes(q);
      const okS=!st||select?.value===st;
      tr.style.display=okQ&&okS?'':'none';
    });
  }

  function openPayableModal(){
    const d=ensureArray();if(!d)return;
    const opts=suppliers().map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name||s.nombre||s.razonSocial||s.id)+'</option>').join('');
    const html='<h2>Nueva cuenta por pagar</h2>'+
      '<p class="muted">Registra la factura como una obligación total con el proveedor, sin necesidad de ingresar productos.</p>'+
      '<div class="form">'+
      '<div class="field"><label>Proveedor</label><select id="vap_supplier"><option value="">Selecciona un proveedor</option>'+opts+'</select></div>'+
      '<div class="field"><label>Factura / referencia</label><input id="vap_invoice" placeholder="Ej. FAC-1258"></div>'+
      '<div class="field"><label>Fecha de factura</label><input id="vap_date" type="date" value="'+today()+'"></div>'+
      '<div class="field"><label>Fecha de vencimiento</label><input id="vap_due" type="date"></div>'+
      '<div class="field full"><label>Total de la factura</label><input id="vap_total" type="number" min="0" step="1" inputmode="numeric" placeholder="500000"></div>'+
      '</div>'+
      '<div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button type="button" class="btn primary" id="vap_save">Guardar cuenta</button></div>';
    if(typeof window.openModal==='function')window.openModal(html);else return;
    document.getElementById('vap_save')?.addEventListener('click',savePayable);
  }

  function savePayable(){
    const d=ensureArray();if(!d)return;
    const supplierId=document.getElementById('vap_supplier')?.value||'';
    const invoice=String(document.getElementById('vap_invoice')?.value||'').trim();
    const fecha=document.getElementById('vap_date')?.value||today();
    const due=document.getElementById('vap_due')?.value||'';
    const total=Math.max(0,Number(document.getElementById('vap_total')?.value||0));
    if(!supplierId)return notify('Selecciona un proveedor.');
    if(!invoice)return notify('Escribe el número de factura o referencia.');
    if(!fecha)return notify('Indica la fecha de la factura.');
    if(!due)return notify('Indica la fecha de vencimiento.');
    if(total<=0)return notify('El total debe ser mayor que cero.');
    d.accountsPayable.unshift({id:id('cp'),supplierId,invoice,fecha,vencimiento:due,total,abonado:0,abonos:[],estado:'Pendiente',createdAt:new Date().toISOString(),createdBy:window.currentUser?.id||null,supplierBalanceTracked:true});
    const supplier=suppliers().find(s=>String(s?.id)===String(supplierId));
    if(supplier)supplier.balance=Number(supplier.balance||0)+total;
    if(!persist())return;
    closeModalSafe();
    renderPayables();
    notify('Cuenta por pagar registrada.');
  }

  function find(idv){return ensureArray()?.accountsPayable.find(r=>String(r.id)===String(idv))||null}
  function closeModalSafe(){try{if(typeof window.closeModal==='function')window.closeModal()}catch(_){}}

  function openPaymentModal(idv){
    const r=find(idv);if(!r)return;
    normalizeRecord(r);
    const saldo=pending(r);
    if(saldo<=0)return notify('Esta factura ya está pagada.');
    const html='<h2>Registrar abono</h2>'+
      '<div class="card" style="margin-bottom:14px;background:#f8fafc"><div class="muted">Proveedor</div><b>'+esc(supplierName(r.supplierId))+'</b><div style="display:flex;justify-content:space-between;margin-top:10px"><span>Saldo actual</span><b>'+money(saldo)+'</b></div></div>'+
      '<div class="form">'+
      '<div class="field full"><label>¿Cuánto desea abonar?</label><input id="vap_payment_amount" type="number" min="1" max="'+esc(saldo)+'" step="1" inputmode="numeric" value="'+esc(saldo)+'"></div>'+
      '<div class="field"><label>Fecha de pago</label><input id="vap_payment_date" type="date" value="'+today()+'"></div>'+
      '<div class="field"><label>Método de pago</label><select id="vap_payment_method"><option>Efectivo</option><option>Transferencia</option><option>Consignación</option><option>Cheque</option><option>Otro</option></select></div>'+
      '</div>'+
      '<div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn" id="vap_pay_cancel">Cancelar</button><button type="button" class="btn success" id="vap_pay_save">Registrar abono</button></div>';
    if(typeof window.openModal!=='function')return;
    window.openModal(html);
    document.getElementById('vap_pay_cancel')?.addEventListener('click',closeModalSafe);
    document.getElementById('vap_pay_save')?.addEventListener('click',()=>registerPayment(idv));
  }

  function registerPayment(idv){
    const r=find(idv);if(!r)return;
    normalizeRecord(r);
    const saldo=pending(r);
    const amount=Number(document.getElementById('vap_payment_amount')?.value||0);
    const date=document.getElementById('vap_payment_date')?.value||today();
    const method=document.getElementById('vap_payment_method')?.value||'Efectivo';
    if(amount<=0)return notify('El abono debe ser mayor que cero.');
    if(amount>saldo)return notify('El abono no puede superar el saldo pendiente de '+money(saldo)+'.');
    r.abonos.push({id:id('ab'),fecha:date,importe:amount,metodo:method,createdBy:window.currentUser?.id||null});
    r.abonado=Math.min(r.total,paid(r)+amount);
    const supplier=suppliers().find(s=>String(s?.id)===String(r.supplierId));
    if(supplier && r.supplierBalanceTracked!==false)supplier.balance=Math.max(0,Number(supplier.balance||0)-amount);
    r.estado=calcState(r);
    if(!persist())return;
    closeModalSafe();
    renderPayables();
    notify(r.estado==='Pagado'?'Factura pagada completamente.':'Abono registrado correctamente.');
  }

  function payAll(idv){
    const r=find(idv);if(!r)return;
    normalizeRecord(r);
    const saldo=pending(r);if(saldo<=0)return;
    if(!confirm('¿Registrar el pago total de '+money(saldo)+' de la factura '+(r.invoice||'')+'?'))return;
    r.abonos.push({id:id('ab'),fecha:today(),importe:saldo,metodo:'Pago total',createdBy:window.currentUser?.id||null});
    const supplier=suppliers().find(s=>String(s?.id)===String(r.supplierId));
    if(supplier && r.supplierBalanceTracked!==false)supplier.balance=Math.max(0,Number(supplier.balance||0)-saldo);
    r.abonado=r.total;r.estado='Pagado';
    if(!persist())return;
    renderPayables();
    notify('Factura marcada como pagada.');
  }

  function changeStatus(idv,newState){
    const r=find(idv);if(!r)return;
    normalizeRecord(r);
    const saldo=pending(r);
    if(newState==='Pagado'){
      if(saldo<=0){r.estado='Pagado';persist();renderPayables();return}
      if(confirm('Para marcar esta factura como Pagado se debe registrar el saldo completo de '+money(saldo)+'. ¿Deseas hacerlo ahora?'))payAll(idv);
      else renderPayables();
      return;
    }
    if(newState==='Pendiente'&&paid(r)>0){notify('Una factura con abonos no puede volver a Pendiente.');renderPayables();return}
    if(newState==='Abono parcial'&&paid(r)<=0){notify('Primero registra un abono para usar Abono parcial.');renderPayables();return}
    if(newState==='Vencido'&&!isPastDue(r)){notify('Vencido se determina cuando la fecha de vencimiento ya pasó y aún existe saldo.');renderPayables();return}
    r.estado=newState;
    persist();
    renderPayables();
  }

  function viewPayable(idv){
    const r=find(idv);if(!r)return;
    normalizeRecord(r);
    const abonos=r.abonos.length?
      r.abonos.map(a=>'<tr><td>'+esc(a.fecha||'')+'</td><td>'+esc(a.metodo||'')+'</td><td>'+money(a.importe)+'</td></tr>').join(''):
      '<tr><td colspan="3" class="empty">No hay abonos registrados.</td></tr>';
    const html='<h2>Detalle de cuenta por pagar</h2>'+
      '<div class="form">'+
      '<div class="field"><label>Proveedor</label><input value="'+esc(supplierName(r.supplierId))+'" disabled></div>'+
      '<div class="field"><label>Factura</label><input value="'+esc(r.invoice||'')+'" disabled></div>'+
      '<div class="field"><label>Fecha</label><input value="'+esc(r.fecha||'')+'" disabled></div>'+
      '<div class="field"><label>Vencimiento</label><input value="'+esc(r.vencimiento||'Sin fecha')+'" disabled></div>'+
      '<div class="field"><label>Total</label><input value="'+esc(money(r.total))+'" disabled></div>'+
      '<div class="field"><label>Abonado</label><input value="'+esc(money(r.abonado))+'" disabled></div>'+
      '<div class="field"><label>Pendiente</label><input value="'+esc(money(pending(r)))+'" disabled></div>'+
      '<div class="field"><label>Estado</label><input value="'+esc(r.estado)+'" disabled></div>'+
      '</div>'+
      '<h3 style="margin-top:20px">Historial de abonos</h3>'+
      '<div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Método</th><th>Importe</th></tr></thead><tbody>'+abonos+'</tbody></table></div>'+
      '<div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cerrar</button>'+(pending(r)>0?'<button type="button" class="btn success" id="vap_detail_pay">Registrar abono</button>':'')+'</div>';
    if(typeof window.openModal!=='function')return;
    window.openModal(html);
    document.getElementById('vap_detail_pay')?.addEventListener('click',()=>{closeModalSafe();setTimeout(()=>openPaymentModal(idv),0)});
  }

  function boot(){
    installRenderHook();
    if(!window[TAB_KEY])window[TAB_KEY]='suppliers';
    const root=document.getElementById(ROOT_ID);
    if(root && root.classList.contains('active') && window[TAB_KEY]==='suppliers')renderSupplierPayablesButton(root);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});
  else setTimeout(boot,900);

  setInterval(installRenderHook,1200);

  window.ventaraAccountsPayable={render:renderPayables,openNew:openPayableModal,registerPayment:openPaymentModal,find};
})();
