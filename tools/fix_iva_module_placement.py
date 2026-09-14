from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
# The IVA module was accidentally inserted inside the printTicket() HTML template.
# That makes the browser terminate the outer script at </script>, breaking login.
start=s.find('<script id="ventara-iva-module">')
if start < 0:
    print('IVA module not found; nothing to move')
    raise SystemExit(0)
end=s.find('</script>', start)
if end < 0:
    raise SystemExit('IVA module closing tag not found')
end += len('</script>')
module=s[start:end]
s=s[:start]+s[end:]
# Remove any duplicate correctly placed copy before adding the canonical module.
s=re.sub(r'<script id="ventara-iva-module">.*?</script>\s*','',s,flags=re.S)
# Recreate the module as a real top-level script, outside all JS template strings.
module='''<script id="ventara-iva-module">
(()=>{
  const rates=[0,1,2,4,5,8,10,12,15,16,18,19,20,21,22,25,30,35];
  const pct=n=>Number(n||0);
  window.ventaraIvaRates=rates;
  window.ventaraPriceWithIva=(price,iva)=>Math.round(Number(price||0)*(1+pct(iva)/100)*100)/100;
  window.ventaraIvaAmount=(price,iva)=>Math.round(Number(price||0)*pct(iva)/100*100)/100;
  function modal(){return document.querySelector('.modal, .modal-content, [role="dialog"]')}
  function isProductModal(m){let t=(m?.innerText||'').toLowerCase();return t.includes('precio de venta')||t.includes('precio de costo')||t.includes('crear producto')||t.includes('editar producto')||t.includes('nuevo artículo')||t.includes('nuevo articulo')}
  function findPriceInput(m){let inputs=[...m.querySelectorAll('input')];return inputs.find(i=>/precio.*venta|venta/i.test((i.parentElement?.innerText||'')+' '+(i.previousElementSibling?.innerText||'')))||inputs.find(i=>/price/i.test(i.id||i.name||''))||null}
  function addField(m){if(!isProductModal(m)||m.querySelector('#ventaraProductIva'))return;let price=findPriceInput(m);let field=document.createElement('div');field.className='field';field.style.cssText='margin-top:10px';field.innerHTML='<label>IVA</label><select id="ventaraProductIva">'+rates.map(function(r){return '<option value="'+r+'">'+r+'%</option>'}).join('')+'<option value="custom">Personalizado</option></select><small class="muted">Selecciona el IVA que corresponde al producto.</small><div id="ventaraIvaPreview" class="muted" style="margin-top:6px"></div>';let host=price?.closest('.field')?.parentElement||m.querySelector('.form')||m;host.appendChild(field);let sel=field.querySelector('#ventaraProductIva');let prev=field.querySelector('#ventaraIvaPreview');let update=function(){let iva=sel.value==='custom'?0:Number(sel.value);if(sel.value==='custom'){prev.innerHTML='<input id="ventaraCustomIva" type="number" min="0" max="100" step="0.01" placeholder="% IVA personalizado">';let ci=prev.querySelector('#ventaraCustomIva');if(ci)ci.oninput=update;iva=Number(ci?.value||0)}let base=Number(price?.value||0);prev.textContent=base?'Precio final con IVA: '+new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(window.ventaraPriceWithIva(base,iva)):''};sel.onchange=update;if(price)price.addEventListener('input',update);update();window.__ventaraCurrentIva=()=>sel.value==='custom'?Number(prev.querySelector('#ventaraCustomIva')?.value||0):Number(sel.value||0)}
  function saveIvaAfterAction(){let iva=Number(window.__ventaraCurrentIva?.()||0);let m=modal();if(!m||!isProductModal(m))return;let inputs=[...m.querySelectorAll('input')];let name=inputs.find(i=>/name|nombre/i.test(i.id||i.name||''))?.value?.trim();setTimeout(function(){if(!window.db?.products)return;let p=name?db.products.find(x=>x.name===name):null;if(p){p.iva=iva;p.taxRate=iva;p.priceWithIva=window.ventaraPriceWithIva(p.price,iva);if(typeof save==='function')save()}},300)}
  document.addEventListener('click',function(e){let b=e.target.closest('button');if(!b)return;let txt=(b.innerText||'').toLowerCase();if(/guardar|actualizar|crear|save/.test(txt)&&isProductModal(modal()))saveIvaAfterAction()},true);
  new MutationObserver(function(){let m=modal();if(m)addField(m)}).observe(document.documentElement,{subtree:true,childList:true});
  setInterval(function(){let m=modal();if(m)addField(m)},700);
  function normalizeCart(){if(!window.db?.products||!Array.isArray(window.cart))return;window.cart.forEach(function(i){let p=db.products.find(function(x){return x.id===i.id});if(p&&p.iva!=null&&!i.__ventaraIvaApplied){i.basePrice=i.price;i.price=window.ventaraPriceWithIva(p.price,p.iva);i.iva=p.iva;i.__ventaraIvaApplied=true}})}
  setInterval(normalizeCart,700);
})();
</script>'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('body closing tag not found')
s=s[:pos]+module+'\n'+s[pos:]

# Surgical payment-modal repair. Keep finishSale(), inventory, IVA, categories and ticket code untouched.
start=s.index('function openPaymentModalPOS(){')
end=s.index('function finishSale(',start)
payment=r'''function openPaymentModalPOS(){if(!cart.length)return toast('Agrega productos a la venta');let subtotal=cart.reduce((a,i)=>a+i.qty*i.price,0),discount=+(document.getElementById('posDiscount')?.value||0),total=Math.max(0,subtotal-discount);let clients=(db.clients||[]).filter(c=>String(c.name||'').trim().toLowerCase()!=='consumidor final'&&c.id!=='c1');openModal(`<h2>💰 Cobrar VENTA</h2><p class="muted">Caja registradora · Total a cobrar</p><div style="text-align:center;background:#f4fbfd;padding:15px;border-radius:12px"><div class="muted">TOTAL</div><div style="font-size:38px;font-weight:900;color:#005f73">${money(total)}</div></div><h3>Forma de pago</h3><div class="payment-grid"><button id="pm-Efectivo" class="selected" onclick="selectPay('Efectivo')">💵 Efectivo</button><button id="pm-Tarjeta" onclick="selectPay('Tarjeta')">💳 Tarjeta</button><button id="pm-Transferencia" onclick="selectPay('Transferencia')">📲 Transferencia</button><button id="pm-Mixto" onclick="selectPay('Mixto')">🔀 Mixto</button><button id="pm-Crédito" onclick="selectPay('Crédito')">🧾 Crédito</button></div><div id="cashFields" style="margin-top:15px"><div class="field"><label>EFECTIVO RECIBIDO</label><input id="cashReceived" type="number" min="0" value="${total}" oninput="calcChange(${total})" onkeydown="if(event.key==='Enter')confirmPayment(${total},event)"></div><div class="totalline" style="font-size:18px;margin-top:10px"><span>Cambio</span><b id="cashChange">${money(0)}</b></div></div><div id="cardFields" style="display:none;margin-top:15px"><div class="field"><label>TIPO DE TARJETA</label><select id="cardType" required><option value="">-- Selecciona --</option><option value="Débito">Débito</option><option value="Crédito Visa">Crédito Visa</option><option value="Crédito Mastercard">Crédito Mastercard</option><option value="Otra">Otra</option></select></div></div><div id="transferFields" style="display:none;margin-top:15px"><div class="field"><label>BANCO / BILLETERA</label><select id="transferBank" required><option value="">-- Selecciona --</option><option value="Nequi">Nequi</option><option value="Daviplata">Daviplata</option><option value="Bancolombia">Bancolombia</option><option value="Otros">Otros</option></select></div></div><div id="creditFields" style="display:none;margin-top:15px"><div class="field"><label>CLIENTE PARA VENTA A CRÉDITO</label><select id="creditClientSelect"><option value="">-- Selecciona un cliente --</option>${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><p id="creditWarning" class="muted" style="color:#9f1239">Selecciona un cliente para vender a crédito</p></div><div id="mixedFields" style="display:none;margin-top:15px"><div class="form"><div class="field"><label>Efectivo</label><input id="mixCash" type="number" value="0" oninput="calcMixed(${total})"></div><div class="field"><label>Tarjeta/Transferencia</label><input id="mixOther" type="number" value="${total}" oninput="calcMixed(${total})"></div></div><p id="mixStatus" class="muted"></p></div><div class="actions" style="margin-top:18px"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn success" style="padding:13px 22px" onclick="confirmPayment(${total},event)">✓ CONFIRMAR Y REGISTRAR VENTA</button></div>`)}
let selectedPay='Efectivo';function selectPay(method){selectedPay=method;document.querySelectorAll('.payment-grid button').forEach(b=>b.classList.remove('selected'));let active=document.getElementById('pm-'+method);if(active)active.classList.add('selected');let panels={Efectivo:'cashFields',Tarjeta:'cardFields',Transferencia:'transferFields',Mixto:'mixedFields','Crédito':'creditFields'};Object.values(panels).forEach(id=>{let el=document.getElementById(id);if(el)el.style.display='none'});let panel=document.getElementById(panels[method]);if(panel)panel.style.display='block';let cash=document.getElementById('cashFields');if(cash)cash.style.display=method==='Efectivo'?'block':'none';let mixed=document.getElementById('mixedFields');if(mixed)mixed.style.display=method==='Mixto'?'block':'none'}
function calcChange(total){let r=+(document.getElementById('cashReceived')?.value||0);let el=document.getElementById('cashChange');if(el)el.textContent=money(Math.max(0,r-total))}
function calcMixed(total){let a=+(document.getElementById('mixCash')?.value||0),b=+(document.getElementById('mixOther')?.value||0),d=a+b-total;let el=document.getElementById('mixStatus');if(el)el.textContent=d>=0?'Pago completo · Cambio '+money(d):'Faltan '+money(Math.abs(d))}
function confirmPayment(total,e){if(e){e.preventDefault();e.stopPropagation()}try{if(!cart.length)return toast('Agrega productos a la venta');if(selectedPay==='Efectivo'){let r=+(document.getElementById('cashReceived')?.value||0);if(r<total)return toast('El efectivo recibido es menor al total')}if(selectedPay==='Mixto'){let a=+(document.getElementById('mixCash')?.value||0),b=+(document.getElementById('mixOther')?.value||0);if(a+b!==total)return toast('El pago mixto debe ser exactamente igual al total')}if(selectedPay==='Crédito'){let creditSelect=document.getElementById('creditClientSelect');if(!creditSelect||!creditSelect.value)return alert('Selecciona un cliente para vender a crédito');posClient=creditSelect.value}let sale=finishSale(selectedPay,total);if(!sale)return;offerTicket(sale.id)}catch(error){console.error('Error al procesar la venta:',error);alert('Ocurrió un error al registrar la venta: '+(error?.message||String(error)))}}
'''
s=s[:start]+payment+s[end:]
p.write_text(s,encoding='utf-8')
print('IVA module repaired and payment selector patch applied')
