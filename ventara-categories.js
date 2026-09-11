/* VENTARA POS - Categorías + compatibilidad global + ticket POS */
(()=>{
  const getDb=()=>{try{return typeof db!=='undefined'?db:(window.db||null)}catch(e){return window.db||null}};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const notify=m=>{try{if(typeof window.toast==='function')window.toast(m);else alert(m)}catch(e){console.log('[VENTARA]',m)}};
  if(typeof window.toast!=='function')window.toast=function(message){try{let el=document.getElementById('ventara-toast');if(!el){el=document.createElement('div');el.id='ventara-toast';el.style.cssText='position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;padding:12px 18px;border-radius:10px;background:#111827;color:#fff;font:600 14px Arial,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.22);max-width:90vw;text-align:center';document.body.appendChild(el)}el.textContent=String(message??'');el.style.display='block';clearTimeout(el._timer);el._timer=setTimeout(()=>el.style.display='none',2800)}catch(e){console.log('[VENTARA]',message)}};
  if(typeof window.log!=='function')window.log=function(action,detail=''){try{const d=window.db;if(!d){console.log('[VENTARA]',action,detail);return}d.activityLog=Array.isArray(d.activityLog)?d.activityLog:[];d.activityLog.unshift({id:typeof window.uid==='function'?window.uid('a'):'a_'+Date.now(),date:new Date().toISOString(),action:String(action||''),detail:String(detail||''),user:window.currentUser?.name||'Administrador'});if(d.activityLog.length>500)d.activityLog.length=500}catch(e){console.warn('[VENTARA] log',e)}};
  function ensureCategories(){const d=getDb();if(!d)return false;d.categories=Array.isArray(d.categories)?d.categories:[];const names=new Set(d.categories.map(c=>String(c||'').trim()).filter(Boolean));(d.products||[]).forEach(p=>{const n=String(p.category||'').trim();if(n)names.add(n)});if(!names.size)names.add('General');d.categories=[...names];return true}
  function categoryOptions(selected=''){const d=getDb();if(!d)return '<option value=\"General\">General</option>';ensureCategories();return (d.categories||['General']).map(c=>`<option value=\"${esc(c)}\" ${String(c)===String(selected)?'selected':''}>${esc(c)}</option>`).join('')}
  function refreshProductCategory(selected){const d=getDb(),old=document.getElementById('f_cat');if(!d||!old)return;ensureCategories();const current=selected??old.value??'General';let field=old;if(field.tagName!=='SELECT'){const s=document.createElement('select');s.id='f_cat';s.name='category';s.className=field.className||'';s.style.cssText=field.style.cssText||'';field.replaceWith(s);field=s}const sig=(d.categories||[]).join('\\u0001');if(field.dataset.categorySignature!==sig){field.innerHTML=categoryOptions(current);field.dataset.categorySignature=sig}if((d.categories||[]).includes(current))field.value=current}
  function addQuick(){const f=document.getElementById('f_cat');if(!f)return;refreshProductCategory(f.value||'General');const s=document.getElementById('f_cat');if(!s||document.getElementById('ventaraCategoryQuickAdd'))return;const host=s.closest('.field');if(!host)return;const b=document.createElement('button');b.id='ventaraCategoryQuickAdd';b.type='button';b.className='btn sm';b.style.cssText='margin-top:7px;width:max-content';b.textContent='📂 Nueva categoría';b.onclick=()=>window.openCategoriesModal();host.appendChild(b)}
  function cleanOutside(){document.querySelectorAll('.nav,button').forEach(b=>{const t=(b.innerText||b.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();if(!t.includes('categor'))return;const article=!!b.closest('#products,[data-page=\"products\"],#modalbox #f_cat');const productModal=!!b.closest('#modalbox')&&!!document.getElementById('f_cat');if(article||productModal)return;if(b.closest('#pos,[data-page=\"pos\"]')||b.classList.contains('nav'))b.remove()})}
  window.openCategoriesModal=function(){if(!ensureCategories())return notify('Los datos todavía no están listos.');if(typeof window.openModal!=='function')return notify('No se pudo abrir Categorías.');renderModal()};
  function renderModal(message=''){const d=getDb();if(!d||typeof window.openModal!=='function')return;ensureCategories();const rows=(d.categories||[]).map((n,i)=>{const used=(d.products||[]).filter(p=>String(p.category||'').trim()===n).length;return `<tr><td><b>${esc(n)}</b></td><td>${used}</td><td><button class=\"btn sm danger\" type=\"button\" onclick=\"window.deleteCategory(${i})\" ${used?'disabled title=\"Hay artículos usando esta categoría\"':''}>Eliminar</button></td></tr>`}).join('');const table=typeof window.table==='function'?window.table(['Categoría','Artículos','Acción'],rows,'Aún no hay categorías'):`<table class=\"table\"><thead><tr><th>Categoría</th><th>Artículos</th><th>Acción</th></tr></thead><tbody>${rows||'<tr><td colspan=\"3\" class=\"empty\">Aún no hay categorías</td></tr>'}</tbody></table>`;window.openModal(`<h2>📂 Categorías</h2><p class=\"muted\">Administra las categorías que aparecen en Artículos.</p><form id=\"ventaraCategoryForm\"><div class=\"form\" style=\"margin-bottom:15px\"><div class=\"field\"><label>Nueva categoría</label><input id=\"newCategoryName\" type=\"text\" maxlength=\"60\" placeholder=\"Ej. Abarrotes\" autocomplete=\"off\"></div><div class=\"field\" style=\"align-self:end\"><button class=\"btn primary\" type=\"submit\">+ Crear categoría</button></div></div></form>${message?`<div class=\"badge green\" style=\"margin-bottom:12px\">${esc(message)}</div>`:''}<div class=\"card\" style=\"box-shadow:none;background:#f8fafc\">${table}</div><div class=\"actions\" style=\"margin-top:15px\"><button class=\"btn\" type=\"button\" onclick=\"window.closeModal()\">Cerrar</button></div>`);document.getElementById('ventaraCategoryForm')?.addEventListener('submit',e=>{e.preventDefault();window.createCategory()});document.getElementById('newCategoryName')?.focus()}
  window.createCategory=async function(){const d=getDb();if(!d)return notify('Los datos todavía no están listos.');ensureCategories();const name=(document.getElementById('newCategoryName')?.value||'').trim().replace(/\\s+/g,' ');if(!name)return notify('Escribe el nombre de la categoría.');if(name.length>60)return notify('La categoría no puede superar 60 caracteres.');if(d.categories.some(c=>String(c).toLowerCase()===name.toLowerCase()))return notify('Esa categoría ya existe.');d.categories.push(name);if(typeof window.save==='function')window.save();try{if(typeof window.cloudSave==='function')await window.cloudSave()}catch(e){console.warn('[VENTARA] cloud category save',e)}refreshProductCategory(name);renderModal('Categoría creada correctamente.');addQuick()};
  window.deleteCategory=function(i){const d=getDb();if(!d)return;ensureCategories();const n=d.categories[i];if(!n)return;if((d.products||[]).some(p=>String(p.category||'').trim()===n))return notify('No puedes eliminar una categoría que tiene artículos asignados.');if(!confirm(`¿Eliminar la categoría \"${n}\"?`))return;d.categories.splice(i,1);if(!d.categories.length)d.categories.push('General');if(typeof window.save==='function')window.save();refreshProductCategory();renderModal('Categoría eliminada.')};
  function observe(){ensureCategories();addQuick();cleanOutside()};
  const mo=new MutationObserver(observe);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observe();mo.observe(document.body,{subtree:true,childList:true})},{once:true});else{observe();mo.observe(document.body,{subtree:true,childList:true})}

  const moneySafe=v=>{try{return typeof window.money==='function'?window.money(v):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}};
  const dbRef=()=>{try{return window.db||null}catch(e){return null}};
  function getClient(s,d){return (d.clients||[]).find(c=>c.id===s.clientId)||{id:'c1',name:'Consumidor final',doc:'',code:'',phone:'',email:''}}
  function getPaymentAmounts(s){const method=String(s.method||'Efectivo');let received=Number(s.received);if(!Number.isFinite(received)||received<0){if(method==='Efectivo')received=Number(document.getElementById('cashReceived')?.value||s.total||0);else if(method==='Mixto')received=Number(document.getElementById('mixCash')?.value||0)+Number(document.getElementById('mixOther')?.value||0);else received=Number(s.total||0)}const change=Number.isFinite(Number(s.change))?Number(s.change):Math.max(0,received-Number(s.total||0));return {received,change}}
  function taxBreakdown(s,d){let gross=0,iva=0;(s.items||[]).forEach(i=>{const p=(d.products||[]).find(x=>x.id===i.id);const amount=Number(i.qty||0)*Number(i.price||0);gross+=amount;const rate=Number(i.iva??p?.iva??p?.taxRate??0);if(rate>0)iva+=amount-(amount/(1+rate/100))});const discount=Number(s.discount||0);const total=Number(s.total||Math.max(0,gross-discount));return {gross,iva,discount,subtotal:Math.max(0,total+discount-iva),total}}
  function ticketMarkup(s,d){const st=d.settings||{},c=getClient(s,d),pay=getPaymentAmounts(s),tax=taxBreakdown(s,d),logo=st.logo||window.VENTARA_LOGO||'';const cashier=s.cashier||((d.users||[]).find(u=>u.id===s.userId)?.name||'Administrador');const clientCode=c.code||c.clientCode||c.customerCode||c.id||'';const clientDoc=c.doc||c.nit||'';const address=st.address||st.city||'';const items=(s.items||[]).map(i=>`<div class=\"trow\"><span class=\"qty\">${esc(i.qty)}</span><span class=\"name\">${esc(i.name)}</span><span class=\"unit\">${moneySafe(i.price)}</span><span class=\"sum\">${moneySafe(Number(i.qty||0)*Number(i.price||0))}</span></div>`).join('');return `<div class=\"thermal-preview print-area\"><div class=\"tc\">${logo?`<img class=\"tlogo\" src=\"${esc(logo)}\" alt=\"Logo\">`:''}<div class=\"tbusiness\">${esc(st.business||'VENTARA POS')}</div>${st.legal?`<div>${esc(st.legal)}</div>`:''}${st.nit?`<div>NIT: ${esc(st.nit)}</div>`:''}${st.tax?`<div>${esc(st.tax)}</div>`:''}${address?`<div>${esc(address)}</div>`:''}${st.phone?`<div>Tel: ${esc(st.phone)}</div>`:''}${st.email?`<div>${esc(st.email)}</div>`:''}</div><div class=\"thr\"></div><div><b>FACTURA POS ${esc(s.number||'')}</b><br>Fecha: ${esc(s.date||'')} · ${esc(s.time||'')}<br>Cajero: ${esc(cashier)}</div><div class=\"thr\"></div><div><b>CLIENTE</b><br>${esc(c.name||'Consumidor final')}<br>Documento: ${esc(clientDoc||'Consumidor Final')}${clientCode?`<br>Código: ${esc(clientCode)}`:''}</div><div class=\"thr\"></div><div class=\"thead\"><span>Cant.</span><span>Producto</span><span>Unit.</span><span>Total</span></div>${items||'<div class=\"tc\">Sin productos</div>'}<div class=\"thr\"></div><div class=\"tright\"><div>Subtotal: <b>${moneySafe(tax.subtotal)}</b></div>${tax.iva>0?`<div>IVA: <b>${moneySafe(tax.iva)}</b></div>`:''}${tax.discount>0?`<div>Descuento: <b>${moneySafe(tax.discount)}</b></div>`:''}<div class=\"tgrand\">TOTAL: ${moneySafe(tax.total)}</div><div>Pago: ${esc(s.method||'Efectivo')}</div><div>Recibido: ${moneySafe(pay.received)}</div><div>Cambio: ${moneySafe(pay.change)}</div></div><div class=\"thr\"></div><div class=\"tc\">${esc(st.footer||'Gracias por su compra')}<br><b>${esc(st.business||'VENTARA POS')}</b><br><small>Documento generado por VENTARA POS</small></div></div>`}
  function ticketHtml(s){const d=dbRef();if(!d||!s)return '<!doctype html><html><body><h3>Ticket no disponible</h3></body></html>';return `<!doctype html><html><head><meta charset=\"utf-8\"><title>${esc(s.number||'Ticket POS')}</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{width:80mm;font-family:\"Courier New\",monospace;font-size:11px;line-height:1.22}.print-area{width:80mm}.thermal-preview{width:80mm;padding:3mm;background:#fff}.tc{text-align:center}.tlogo{display:block;max-width:48mm;max-height:22mm;margin:0 auto 3mm;object-fit:contain}.tbusiness{font-size:16px;font-weight:900}.thr{border-top:1px dashed #000;margin:6px 0}.thead,.trow{display:grid;grid-template-columns:10% 44% 21% 25%;gap:2px;align-items:start}.thead{font-weight:900;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:3px}.trow{margin:2px 0}.trow .name{word-break:break-word}.trow span:nth-child(n+3),.tright{text-align:right}.tgrand{font-size:15px;font-weight:900;margin:4px 0}.small{font-size:10px}@media print{body{width:80mm}.thermal-preview{width:80mm;padding:2.5mm}}</style></head><body>${ticketMarkup(s,d)}<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print()}catch(e){}},250)});<\\/script></body></html>`}
  window.printTicket=function(id){const d=dbRef(),s=d?.sales?.find(x=>x.id===id);if(!s)return;const amounts=getPaymentAmounts(s);s.received=amounts.received;s.change=amounts.change;if(typeof window.save==='function')window.save();let w=null;try{w=window.open('about:blank','_blank','width=460,height=850')}catch(e){}if(!w)return notify('El navegador bloqueó el ticket. Permite ventanas emergentes para VENTARA POS.');try{w.document.open();w.document.write(ticketHtml(s));w.document.close();setTimeout(()=>{try{if(!w.closed){w.focus();w.print()}}catch(e){}},650)}catch(e){console.warn('[VENTARA] ticket',e);notify('No se pudo preparar el ticket')}};
  window.offerTicket=function(id){const d=dbRef(),s=d?.sales?.find(x=>x.id===id);if(!s)return;const amounts=getPaymentAmounts(s);s.received=amounts.received;s.change=amounts.change;if(typeof window.save==='function')window.save();const html=ticketMarkup(s,d);if(typeof window.openModal==='function'){window.openModal(`<h2>✓ Venta registrada</h2><p class=\"muted\">Comprobante POS listo. La impresión se abrirá automáticamente.</p><div style=\"background:#eef2f7;border-radius:10px;padding:10px;display:flex;justify-content:center;overflow:auto\">${html}</div><div class=\"actions\" style=\"justify-content:flex-end;margin-top:15px\"><button class=\"btn\" onclick=\"window.closeModal()\">Cerrar</button><button class=\"btn primary\" onclick=\"window.printTicket('${esc(s.id)}')\">🖨 Imprimir ticket POS</button></div>`);setTimeout(()=>{try{window.printTicket(s.id)}catch(e){console.warn('[VENTARA] auto print',e)}},250)}else{window.printTicket(s.id)}};
  const originalFinishSale=window.finishSale;
  if(typeof originalFinishSale==='function'){
    window.finishSale=function(methodOverride,totalOverride,autoPrint=false){
      const before=new Set((window.db?.sales||[]).map(s=>s.id));
      const cashReceived=document.getElementById('cashReceived')?.value;
      const mixCash=document.getElementById('mixCash')?.value;
      const mixOther=document.getElementById('mixOther')?.value;
      const method=methodOverride||window.selectedPay||'Efectivo';
      try{originalFinishSale.call(window,methodOverride,totalOverride,false)}catch(e){console.error('[VENTARA] finishSale',e);notify('No se pudo registrar la venta. Revisa la consola para más detalles.');return}
      const d=dbRef();const sale=(d?.sales||[]).find(s=>!before.has(s.id))||d?.sales?.[0];if(!sale)return;
      if(method==='Efectivo')sale.received=Number(cashReceived||sale.total||0);else if(method==='Mixto')sale.received=Number(mixCash||0)+Number(mixOther||0);else sale.received=Number(sale.total||0);sale.change=Math.max(0,Number(sale.received||0)-Number(sale.total||0));if(typeof window.save==='function')window.save();setTimeout(()=>{try{window.offerTicket(sale.id)}catch(e){console.error('[VENTARA] offerTicket',e);notify('La venta se registró, pero no se pudo mostrar el ticket.')}},30);
    };
  }
})();

/* VENTARA POS - dynamic payment modal repair */
(()=>{
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const money=v=>{try{return typeof window.money==='function'?window.money(v):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}};
  const db=()=>{try{return window.db||null}catch(e){return null}};
  const notify=m=>{try{if(typeof window.toast==='function')window.toast(m);else alert(m)}catch(e){console.log('[VENTARA]',m)}};
  const setGlobalLexical=(name,value)=>{try{Function('value',name+'=value')(value);return true}catch(e){try{window[name]=value;return true}catch(_){return false}}};
  const originalOpen=window.openPaymentModalPOS;
  const originalFinish=window.finishSale;
  if(typeof originalOpen==='function'){
    window.openPaymentModalPOS=function(){
      try{originalOpen.call(window);setTimeout(injectPaymentFields,0)}catch(e){console.error('[VENTARA] payment modal',e);notify('No se pudo abrir el módulo de cobro.');}
    };
  }
  function injectPaymentFields(){
    const modal=document.getElementById('modalbox');
    if(!modal)return;
    const grid=modal.querySelector('.payment-grid');
    const actions=modal.querySelector('.actions');
    if(!grid||!actions)return;
    let extra=modal.querySelector('#ventaraDynamicPaymentFields');
    if(!extra){extra=document.createElement('div');extra.id='ventaraDynamicPaymentFields';extra.style.marginTop='15px';actions.parentNode.insertBefore(extra,actions)}
    const total=Number((modal.querySelector('#cashReceived')||{}).value||0)||Number((document.querySelector('.checkout-total strong')?.textContent||'').replace(/[^0-9,.-]/g,'').replace(/\\./g,'').replace(',','.'))||0;
    const current=window.__ventaraPaymentMethod||'Efectivo';
    renderPaymentFields(current,total);
    grid.querySelectorAll('button').forEach(btn=>{
      if(btn.dataset.ventaraBound==='1')return;btn.dataset.ventaraBound='1';btn.addEventListener('click',()=>{const m=String(btn.id||'').replace(/^pm-/,'');window.__ventaraPaymentMethod=m;setGlobalLexical('selectedPay',m);setTimeout(()=>renderPaymentFields(m,total),0)})
    });
    const confirm=actions.querySelector('button.success');
    if(confirm&&!confirm.dataset.ventaraBound){confirm.dataset.ventaraBound='1';confirm.onclick=function(e){e.preventDefault();e.stopPropagation();return window.confirmPayment(total,e)}}
    updateConfirmButton(total);
  }
  function renderPaymentFields(method,total){
    const extra=document.getElementById('ventaraDynamicPaymentFields');if(!extra)return;
    const d=db();const clients=(d?.clients||[]).filter(c=>c&&c.id&&c.id!=='c1');
    let html='';
    if(method==='Efectivo')html=`<div class="field"><label>EFECTIVO RECIBIDO</label><input id="cashReceived" type="number" min="0" step="0.01" value="${esc(total)}"><div class="totalline" style="font-size:18px;margin-top:10px"><span>Cambio</span><b id="cashChange">${money(0)}</b></div></div>`;
    else if(method==='Tarjeta')html=`<div class="form"><div class="field"><label>TIPO DE TARJETA *</label><select id="cardType"><option value="">Selecciona...</option><option value="Débito">Débito</option><option value="Crédito Visa">Crédito Visa</option><option value="Crédito Mastercard">Crédito Mastercard</option></select></div></div>`;
    else if(method==='Transferencia')html=`<div class="field"><label>BANCO / BILLETERA *</label><select id="transferProvider"><option value="">Selecciona...</option><option value="Nequi">Nequi</option><option value="Daviplata">Daviplata</option><option value="Bancolombia">Bancolombia</option><option value="Otros">Otros</option></select></div>`;
    else if(method==='Mixto')html=`<div class="form"><div class="field"><label>MONTO EN EFECTIVO *</label><input id="mixCash" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>MONTO TARJETA / TRANSFERENCIA *</label><input id="mixOther" type="number" min="0" step="0.01" value="${esc(total)}"></div></div><p id="mixStatus" class="muted">La suma debe ser exactamente ${money(total)}.</p>`;
    else if(method==='Crédito')html=`<div class="field"><label>CLIENTE PARA CRÉDITO *</label><select id="creditClient"><option value="">Selecciona un cliente...</option>${clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name||'Cliente')} · ${esc(c.doc||c.nit||'Sin documento')}</option>`).join('')}</select></div>`;
    extra.innerHTML=html;
    const cash=extra.querySelector('#cashReceived');if(cash)cash.addEventListener('input',()=>{const r=Number(cash.value||0);const ch=extra.querySelector('#cashChange');if(ch)ch.textContent=money(Math.max(0,r-total));updateConfirmButton(total)});
    ['cardType','transferProvider','creditClient'].forEach(id=>extra.querySelector('#'+id)?.addEventListener('change',()=>updateConfirmButton(total)));
    ['mixCash','mixOther'].forEach(id=>extra.querySelector('#'+id)?.addEventListener('input',()=>{const a=Number(extra.querySelector('#mixCash')?.value||0),b=Number(extra.querySelector('#mixOther')?.value||0),diff=a+b-total;const st=extra.querySelector('#mixStatus');if(st)st.textContent=Math.abs(diff)<0.005?'Pago completo · $ 0 de diferencia':diff>0?'Excede por '+money(diff):'Faltan '+money(Math.abs(diff));updateConfirmButton(total)}));
    updateConfirmButton(total);
  }
  function updateConfirmButton(total){
    const b=document.querySelector('#modalbox .actions button.success');if(!b)return;const m=window.__ventaraPaymentMethod||'Efectivo';let ok=true;
    if(m==='Efectivo')ok=Number(document.getElementById('cashReceived')?.value||0)>=total;
    if(m==='Tarjeta')ok=!!document.getElementById('cardType')?.value;
    if(m==='Transferencia')ok=!!document.getElementById('transferProvider')?.value;
    if(m==='Mixto')ok=Math.abs(Number(document.getElementById('mixCash')?.value||0)+Number(document.getElementById('mixOther')?.value||0)-total)<0.005;
    if(m==='Crédito')ok=!!document.getElementById('creditClient')?.value;
    b.disabled=!ok;b.style.opacity=ok?'1':'.55';b.title=ok?'':'Completa los datos obligatorios del método de pago';
  }
  window.confirmPayment=function(total,e){
    if(e&&typeof e.preventDefault==='function')e.preventDefault();
    if(e&&typeof e.stopPropagation==='function')e.stopPropagation();
    const m=window.__ventaraPaymentMethod||'Efectivo';const amount=Number(total||0);let meta={method:m};
    if(m==='Efectivo'){const received=Number(document.getElementById('cashReceived')?.value||0);if(received<amount)return notify('El efectivo recibido es menor al total.');meta.received=received;meta.change=received-amount}
    else if(m==='Tarjeta'){const type=document.getElementById('cardType')?.value;if(!type)return notify('Selecciona el tipo de tarjeta.');meta.cardType=type;meta.received=amount;meta.change=0}
    else if(m==='Transferencia'){const provider=document.getElementById('transferProvider')?.value;if(!provider)return notify('Selecciona el banco o billetera.');meta.transferProvider=provider;meta.received=amount;meta.change=0}
    else if(m==='Mixto'){const cash=Number(document.getElementById('mixCash')?.value||0),other=Number(document.getElementById('mixOther')?.value||0);if(Math.abs(cash+other-amount)>=0.005)return notify('En pago mixto, efectivo + tarjeta/transferencia debe ser exactamente igual al total.');meta.mixCash=cash;meta.mixOther=other;meta.received=amount;meta.change=0}
    else if(m==='Crédito'){const clientId=document.getElementById('creditClient')?.value;if(!clientId)return notify('Selecciona un cliente para vender a crédito.');setGlobalLexical('posClient',clientId);meta.creditClientId=clientId;meta.received=amount;meta.change=0}
    window.__ventaraPaymentMeta=meta;setGlobalLexical('selectedPay',m);
    if(typeof originalFinish==='function')return originalFinish.call(window,m,amount,true);
    return false;
  };
  const originalFinishWrapper=window.finishSale;
  if(typeof originalFinishWrapper==='function'){
    window.finishSale=function(methodOverride,totalOverride,autoPrint=false){
      const meta=window.__ventaraPaymentMeta||{};const result=originalFinishWrapper.call(window,methodOverride,totalOverride,autoPrint);setTimeout(()=>{const d=db(),s=d?.sales?.[0];if(s&&meta.method){s.paymentDetails={...meta};if(meta.creditClientId)s.clientId=meta.creditClientId;if(typeof window.save==='function')window.save()}window.__ventaraPaymentMeta=null},80);return result;
    };
  }
  const observer=new MutationObserver(()=>{if(document.getElementById('modalbox')?.querySelector('.payment-grid'))injectPaymentFields()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{subtree:true,childList:true}),{once:true});else observer.observe(document.body,{subtree:true,childList:true});
})();

/* VENTARA POS - final safe confirmation bridge */
(()=>{
  const wait=(fn,tries=80)=>{if(tries<=0)return;try{if(fn())return}catch(e){console.warn('[VENTARA] bridge',e)}setTimeout(()=>wait(fn,tries-1),100)};
  const notify=m=>{try{if(typeof window.toast==='function')window.toast(m);else alert(m)}catch(e){console.log('[VENTARA]',m)}};
  const getDb=()=>{try{return window.db||null}catch(e){return null}};
  const money=v=>{try{return typeof window.money==='function'?window.money(v):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}};
  function wire(){
    const modal=document.getElementById('modalbox');if(!modal)return false;
    const actions=modal.querySelector('.actions');if(!actions)return false;
    const buttons=[...actions.querySelectorAll('button')];const confirm=buttons.find(b=>/CONFIRMAR.*REGISTRAR VENTA/i.test((b.textContent||'').trim())||b.classList.contains('success'));if(!confirm)return false;
    if(confirm.dataset.ventaraFinalWire==='1')return true;
    confirm.dataset.ventaraFinalWire='1';confirm.type='button';confirm.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      const total=Number((modal.querySelector('#ventaraSaleTotal')?.value||document.querySelector('.checkout-total strong')?.textContent||'').replace(/[^0-9,.-]/g,'').replace(/\\./g,'').replace(',','.'))||Number(window.__ventaraSaleTotal||0);
      const method=window.__ventaraPaymentMethod||window.selectedPay||'Efectivo';
      try{
        if(typeof window.confirmPayment==='function'){
          const result=window.confirmPayment(total,e);
          if(result&&typeof result.then==='function')await result;
          return;
        }
        if(typeof window.finishSale==='function'){
          window.finishSale(method,total,true);return;
        }
        notify('No se encontró el controlador de confirmación de venta.');
      }catch(err){console.error('[VENTARA] confirm button',err);notify('No se pudo completar la venta.');}
    };
    return true;
  }
  wait(()=>wire());
  const observer=new MutationObserver(()=>wire());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{subtree:true,childList:true}),{once:true});else observer.observe(document.body,{subtree:true,childList:true});
})();

/* VENTARA POS - harden confirmation and force ticket after render */
(()=>{
  const notify=m=>{try{if(typeof window.toast==='function')window.toast(m);else alert(m)}catch(e){console.log('[VENTARA]',m)}};
  const db=()=>{try{return window.db||null}catch(e){return null}};
  const money=v=>{try{return typeof window.money==='function'?window.money(v):'$ '+Number(v||0).toLocaleString('es-CO')}catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}};
  let lastPrintedSaleId=null;
  function findConfirm(){const modal=document.getElementById('modalbox');if(!modal)return null;return [...modal.querySelectorAll('.actions button')].find(b=>/CONFIRMAR.*REGISTRAR VENTA/i.test((b.textContent||'').trim())||b.classList.contains('success'))||null}
  function parseTotal(){const modal=document.getElementById('modalbox');const raw=modal?.querySelector('#ventaraSaleTotal')?.value||document.querySelector('.checkout-total strong')?.textContent||window.__ventaraSaleTotal||0;const txt=String(raw).replace(/[^0-9,.-]/g,'').replace(/\\./g,'').replace(',','.');const n=Number(txt);return Number.isFinite(n)?n:0}
  function ensureTicketAutoPrint(saleId){const d=db();if(!d||!saleId||lastPrintedSaleId===saleId)return;const sale=d.sales?.find(s=>s.id===saleId);if(!sale)return;lastPrintedSaleId=saleId;try{if(typeof window.offerTicket==='function'){window.offerTicket(saleId);return}if(typeof window.printTicket==='function'){window.printTicket(saleId);return}}catch(e){console.error('[VENTARA] ticket auto',e);notify('La venta se registró, pero no se pudo abrir el ticket.')}}
  function wire(){
    const b=findConfirm();if(!b)return false;
    b.type='button';
    if(b.dataset.ventaraHardWire==='1')return true;
    b.dataset.ventaraHardWire='1';
    b.onclick=async function(e){
      if(e&&typeof e.preventDefault==='function')e.preventDefault();
      if(e&&typeof e.stopPropagation==='function')e.stopPropagation();
      const total=parseTotal();
      const method=window.__ventaraPaymentMethod||window.selectedPay||'Efectivo';
      const before=new Set((db()?.sales||[]).map(s=>s.id));
      try{
        if(typeof window.confirmPayment==='function'){
          const r=window.confirmPayment(total,e);
          if(r&&typeof r.then==='function')await r;
        }else if(typeof window.finishSale==='function'){
          window.finishSale(method,total,false);
        }else{throw new Error('confirmPayment/finishSale no disponible')}
        setTimeout(()=>{const d=db();const sale=(d?.sales||[]).find(s=>!before.has(s.id))||d?.sales?.[0];if(sale)ensureTicketAutoPrint(sale.id)},120);
      }catch(err){console.error('[VENTARA] hard confirmation',err);notify('No se pudo completar la venta.');}
    };
    return true;
  }
  const observer=new MutationObserver(()=>wire());
  const start=()=>{wire();observer.observe(document.body,{subtree:true,childList:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
