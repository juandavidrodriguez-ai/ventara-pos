/* VENTARA POS — Alertas de stock mínimo y reorden por proveedor. Módulo aislado. */
(()=>{
'use strict';
const TAG='[VENTARA][STOCK]';
const getDb=()=>{try{return typeof db!=='undefined'?db:(window.db||null)}catch(e){return window.db||null}};
const products=()=>{try{const d=getDb();return d&&Array.isArray(d.products)?d.products:[]}catch(e){console.warn(TAG,e);return[]}};
const suppliers=()=>{try{const d=getDb();return d&&Array.isArray(d.suppliers)?d.suppliers:[]}catch(e){console.warn(TAG,e);return[]}};
const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const stock=p=>Math.max(0,num(p?.stock??p?.stockActual??p?.quantity??p?.existencia));
const min=p=>Math.max(0,num(p?.stockMin??p?.minStock??p?.minimumStock??p?.stockMinimum));
const max=p=>Math.max(min(p),num(p?.stockMax??p?.maxStock??p?.maximumStock??p?.stockDesired));
const supplierId=s=>norm(s?.id??s?.supplierId??s?.supplier_id??s?.code??'');
const supplierName=s=>norm(s?.name??s?.businessName??s?.razonSocial??s?.razon_social??s?.commercialName??s?.nombre??supplierId(s));
const supplierFor=p=>{try{const id=norm(p?.supplierId??p?.supplier_id??'');if(!id)return null;return suppliers().find(s=>supplierId(s)===id)||null}catch(e){return null}};
const critical=()=>products().map(p=>({p,stock:stock(p),min:min(p),max:max(p)})).filter(x=>x.stock<=x.min);

function normalizeDefaults(){try{products().forEach(p=>{if(!p||typeof p!=='object')return;if(!Object.prototype.hasOwnProperty.call(p,'stockMin'))p.stockMin=0;if(!Object.prototype.hasOwnProperty.call(p,'stockMax'))p.stockMax=0;if(!Object.prototype.hasOwnProperty.call(p,'supplierId'))p.supplierId='';});}catch(e){console.warn(TAG+' defaults',e)}}
function supplierOptions(selected){try{return '<option value="">-- Sin proveedor --</option>'+suppliers().map(s=>{const id=supplierId(s);return id?`<option value="${esc(id)}" ${id===String(selected||'')?'selected':''}>${esc(supplierName(s))}</option>`:''}).join('')}catch(e){console.warn(TAG+' supplier options',e);return'<option value="">-- Sin proveedor --</option>'}}

function injectProductFields(){try{
 const modal=document.querySelector('.modalbox,#modalbox,#modal,.modal');if(!modal)return;
 if(document.getElementById('productSupplier'))return;
 const form=modal.querySelector('form');if(!form)return;
 const anchor=document.getElementById('f_cat')?.closest('.field')||form.querySelector('.actions')||form.lastElementChild;if(!anchor)return;
 const wrap=document.createElement('div');wrap.className='form';wrap.dataset.ventaraStockFields='1';wrap.style.cssText='margin-top:12px;grid-template-columns:repeat(3,minmax(0,1fr))';
 const id=window._editingProductId??window.editingProductId??window.currentProductId??'';const p=products().find(x=>String(x?.id)===String(id));
 wrap.innerHTML=`<div class="field"><label>Proveedor</label><select id="productSupplier">${supplierOptions(p?.supplierId)}</select></div><div class="field"><label>Stock Mínimo</label><input id="productMinStock" type="number" min="0" step="1" value="${min(p||{})}"></div><div class="field"><label>Stock Óptimo / Máximo</label><input id="productMaxStock" type="number" min="0" step="1" value="${max(p||{})}"></div>`;
 form.insertBefore(wrap,anchor);return true;
}catch(e){console.warn(TAG+' fields',e);return false}}

function persistAfterSubmit(){try{
 const sid=document.getElementById('productSupplier')?.value;const mn=document.getElementById('productMinStock')?.value;const mx=document.getElementById('productMaxStock')?.value;
 if(sid===undefined&&mn===undefined&&mx===undefined)return;
 const d=getDb();if(!d||!Array.isArray(d.products))return;
 const id=window._editingProductId??window.editingProductId??window.currentProductId??'';
 const code=norm(document.querySelector('#f_code,[name="code"],[name="sku"]')?.value||'');
 const name=norm(document.querySelector('#f_name,[name="name"]')?.value||'');
 let p=d.products.find(x=>id&&String(x?.id)===String(id));
 if(!p&&code)p=d.products.find(x=>norm(x?.code??x?.sku??x?.barcode)===code);
 if(!p&&name)p=d.products.find(x=>norm(x?.name)===name);
 if(!p)return;
 p.supplierId=norm(sid||'');p.stockMin=Math.max(0,num(mn));p.stockMax=Math.max(p.stockMin,num(mx));
 try{if(typeof window.save==='function')window.save()}catch(e){console.warn(TAG+' save',e)}
}catch(e){console.warn(TAG+' persist',e)}}

function installSubmitObserver(){try{
 if(window._ventaraStockSubmitObserver)return;
 document.addEventListener('submit',()=>setTimeout(persistAfterSubmit,80),true);
 window._ventaraStockSubmitObserver=true;
}catch(e){console.warn(TAG+' submit observer',e)}}

function renderPanel(){try{
 const root=document.getElementById('products');if(!root)return;
 let panel=document.getElementById('ventaraStockAlerts');if(!panel){panel=document.createElement('div');panel.id='ventaraStockAlerts';panel.className='card';panel.style.cssText='margin:14px 0;padding:16px;border:1px solid #f59e0b;background:#fffbeb';root.prepend(panel)}
 const rows=critical();
 panel.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><h3 style="margin:0">⚠️ Alertas de Inventario</h3><p class="muted" style="margin:5px 0">Productos con stock actual ≤ stock mínimo.</p></div><span class="badge ${rows.length?'red':'green'}">${rows.length} crítico${rows.length===1?'':'s'}</span></div><div style="margin-top:10px">${rows.length?rows.map(x=>{const s=supplierFor(x.p),sn=s?supplierName(s):'Sin proveedor';const qty=Math.max(0,x.max-x.stock);return `<div style="padding:10px 0;border-top:1px solid #fde68a"><b>${esc(x.p?.name||'Producto')}</b> — Stock actual: <b>${x.stock}</b> · Mínimo: ${x.min} · Óptimo/Máximo: ${x.max}<br>Proveedor: <b>${esc(sn)}</b> · Cantidad sugerida: <b>${qty}</b><br><span>Pendiente pedir a <b>${esc(sn)}</b> <b>${qty}</b> unidades de <b>${esc(x.p?.name||'Producto')}</b>.</span></div>`}).join(''):'<div class="muted" style="padding:10px 0">No hay productos en nivel crítico.</div>'}</div>`;
}catch(e){console.warn(TAG+' panel',e)}}

function installCriticalFilter(){try{
 const root=document.getElementById('products');if(!root||document.getElementById('ventaraCriticalStockFilter'))return;
 const b=document.createElement('button');b.id='ventaraCriticalStockFilter';b.type='button';b.className='btn sm';b.textContent='⚠️ Solo nivel crítico';b.style.cssText='margin:8px 0';let active=false;
 b.onclick=()=>{try{active=!active;b.textContent=active?'📋 Ver todo':'⚠️ Solo nivel crítico';const names=new Set(critical().map(x=>norm(x.p?.name).toLowerCase()).filter(Boolean));root.querySelectorAll('table tbody tr').forEach(tr=>{const hit=[...names].some(n=>norm(tr.textContent).toLowerCase().includes(n));tr.style.display=!active||hit?'table-row':'none'})}catch(e){console.warn(TAG+' filter',e)}};
 (root.querySelector('.page-head,.toolbar,.filters,.actions')||root.firstElementChild)?.appendChild(b);
}catch(e){console.warn(TAG+' filter install',e)}}

function sync(){try{normalizeDefaults();injectProductFields();renderPanel();installCriticalFilter();installSubmitObserver()}catch(e){console.warn(TAG+' sync',e)}}
function boot(){try{sync();const root=document.body;if(!root)return;const mo=new MutationObserver(()=>{try{sync()}catch(e){console.warn(TAG+' observer',e)}});mo.observe(root,{childList:true,subtree:true});[600,1400,3000,5000].forEach(ms=>setTimeout(sync,ms))}catch(e){console.warn(TAG+' boot',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();