/* VENTARA POS — FASE 1: proveedor + umbrales + alertas bajo demanda. */
(()=>{
  'use strict';
  const W=window;
  const db=()=>{try{return typeof window.db!=='undefined'?window.db:null}catch(e){return null}};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const suppliers=()=>{try{const d=db();return Array.isArray(d?.suppliers)?d.suppliers:[]}catch(e){return[]}};
  const products=()=>{try{const d=db();return Array.isArray(d?.products)?d.products:[]}catch(e){return[]}};
  const supplierName=id=>{try{const s=suppliers().find(x=>String(x?.id)===String(id));return String(s?.name||s?.businessName||s?.razonSocial||s?.company||'Sin Proveedor')}catch(e){return'Sin Proveedor'}};
  function addFields(){try{
    const form=document.getElementById('productForm');
    if(!form)return false;
    const anchor=document.getElementById('f_cat')?.closest('.field')||form.querySelector('.field');
    if(!anchor)return false;
    if(!document.getElementById('productSupplier')){
      const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='supplier';
      wrap.innerHTML=`<label>Proveedor</label><select id="productSupplier"><option value="">Sin Proveedor</option>${suppliers().map(s=>`<option value="${esc(s?.id)}">${esc(s?.name||s?.businessName||s?.razonSocial||'Proveedor')}</option>`).join('')}</select>`;
      anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
    }
    if(!document.getElementById('productMinStock')){
      const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='min';wrap.innerHTML='<label>Stock Mínimo</label><input id="productMinStock" type="number" min="0" step="1" value="0" placeholder="Ej. 5">';anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
    }
    if(!document.getElementById('productMaxStock')){
      const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='max';wrap.innerHTML='<label>Stock Máximo / Objetivo</label><input id="productMaxStock" type="number" min="0" step="1" value="0" placeholder="Ej. 20">';anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
    }
    return true;
  }catch(e){console.warn('[VENTARA] phase1 fields',e);return false}}
  function hydrate(){try{const id=document.querySelector('#productForm [name="id"]')?.value||document.getElementById('productId')?.value||'';const p=products().find(x=>String(x?.id)===String(id));if(!p)return;const s=document.getElementById('productSupplier'),mn=document.getElementById('productMinStock'),mx=document.getElementById('productMaxStock');if(s)s.value=p.supplierId??'';if(mn)mn.value=Number.isFinite(+p.stockMin)?p.stockMin:0;if(mx)mx.value=Number.isFinite(+p.stockMax)?p.stockMax:0}catch(e){console.warn('[VENTARA] phase1 hydrate',e)}}
  function injectButton(){try{const root=document.getElementById('products')||document.getElementById('inventory');if(!root||document.getElementById('ventaraPhase1AlertsBtn'))return false;const b=document.createElement('button');b.id='ventaraPhase1AlertsBtn';b.type='button';b.className='btn';b.textContent='🔔 Consultar Alertas';b.addEventListener('click',showAlerts);(root.querySelector('.actions')||root.firstElementChild||root).appendChild(b);return true}catch(e){console.warn('[VENTARA] phase1 button',e);return false}}
  function showAlerts(){try{const rows=products().filter(p=>{const min=Number(p?.stockMin);const stock=Number(p?.stockActual??p?.stock??0);return Number.isFinite(min)&&min>0&&stock<=min;});const body=rows.length?rows.map(p=>{const stock=Number(p?.stockActual??p?.stock??0),min=Number(p?.stockMin||0),max=Math.max(Number(p?.stockMax||0),min),qty=Math.max(0,max-stock),name=String(p?.name||p?.description||'Producto sin nombre'),prov=supplierName(p?.supplierId);return `<tr><td><b>${esc(name)}</b><br><span class="muted">⚠️ Quedan ${stock} unidades de ${esc(name)}.</span></td><td>${esc(prov)}</td><td>${stock} / ${min}</td><td><b>${qty}</b></td></tr>`}).join(''):`<tr><td colspan="4" class="empty">✅ No hay artículos por debajo del stock mínimo configurado.</td></tr>`;const html=`<h2>🔔 Alertas de Stock</h2><p class="muted">Consulta realizada bajo demanda. No se ejecuta automáticamente.</p><table class="table"><thead><tr><th>Producto</th><th>Proveedor</th><th>Actual / Mínimo</th><th>Sugerido a pedir</th></tr></thead><tbody>${body}</tbody></table><div class="actions" style="margin-top:15px"><button class="btn" type="button" onclick="window.closeModal()">Cerrar</button></div>`;if(typeof W.openModal==='function')W.openModal(html);else alert(rows.length?rows.map(p=>`${p?.name||'Producto'} — ${supplierName(p?.supplierId)} — ${p?.stockActual??p?.stock??0} unidades`).join('\n'):'No hay alertas');}catch(e){console.warn('[VENTARA] phase1 alerts',e)}}
  function boot(){try{addFields();hydrate();injectButton()}catch(e){console.warn('[VENTARA] phase1 boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200),{once:true});else setTimeout(boot,1200);
  W.ventaraPhase1={refresh:boot,consult:showAlerts};
})();
