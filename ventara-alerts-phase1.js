/* VENTARA POS — FASE 1: proveedor + umbrales + alertas bajo demanda. */
(()=>{
  'use strict';
  const W=window;
  const getDb=()=>{try{return W.db||null}catch(e){return null}};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const suppliers=()=>{try{const d=getDb();return Array.isArray(d?.suppliers)?d.suppliers:[]}catch(e){return[]}};
  const products=()=>{try{const d=getDb();return Array.isArray(d?.products)?d.products:[]}catch(e){return[]}};
  const supplierName=id=>{try{const s=suppliers().find(x=>String(x?.id)===String(id));return String(s?.name||s?.businessName||s?.razonSocial||s?.company||'Sin Proveedor')}catch(e){return'Sin Proveedor'}};
  const modal=()=>document.querySelector('.modalbox');

  function addFields(){try{
    const m=modal();
    if(!m)return false;
    const form=m.querySelector('.form');
    if(!form)return false;
    const existingMin=document.getElementById('f_min');
    if(!document.getElementById('productSupplier')){
      const wrap=document.createElement('div');
      wrap.className='field';wrap.dataset.ventaraPhase1='supplier';
      wrap.innerHTML=`<label>Proveedor</label><select id="productSupplier"><option value="">Sin Proveedor</option>${suppliers().map(s=>`<option value="${esc(s?.id)}">${esc(s?.name||s?.businessName||s?.razonSocial||'Proveedor')}</option>`).join('')}</select>`;
      form.appendChild(wrap);
    }
    if(!document.getElementById('productMinStock')){
      const wrap=document.createElement('div');
      wrap.className='field';wrap.dataset.ventaraPhase1='min';
      wrap.innerHTML='<label>Stock Mínimo para alerta</label><input id="productMinStock" type="number" min="0" step="0.001" value="0" placeholder="Ej. 5">';
      form.appendChild(wrap);
    }
    if(!document.getElementById('productMaxStock')){
      const wrap=document.createElement('div');
      wrap.className='field';wrap.dataset.ventaraPhase1='max';
      wrap.innerHTML='<label>Stock Máximo / Objetivo</label><input id="productMaxStock" type="number" min="0" step="0.001" value="0" placeholder="Ej. 20">';
      form.appendChild(wrap);
    }
    const min=document.getElementById('productMinStock');
    if(min&&existingMin&&!min.dataset.synced){
      min.dataset.synced='1';
      min.value=existingMin.value||'0';
      min.addEventListener('input',()=>{try{existingMin.value=min.value}catch(e){}});
    }
    hydrate();
    attachSaveHook();
    return true;
  }catch(e){console.warn('[VENTARA] phase1 fields',e);return false}}

  function productIdFromModal(){try{
    const b=[...document.querySelectorAll('.modalbox .actions button')].find(x=>/guardar/i.test(x.textContent||''));
    const raw=b?.getAttribute('onclick')||'';
    const match=raw.match(/saveProduct\(['"]([^'"]*)['"]\)/);
    return match?match[1]:'';
  }catch(e){return''}}

  function hydrate(){try{
    const id=productIdFromModal();
    const p=products().find(x=>String(x?.id)===String(id));
    const s=document.getElementById('productSupplier'),mn=document.getElementById('productMinStock'),mx=document.getElementById('productMaxStock');
    if(!p)return;
    if(s)s.value=p.supplierId??'';
    if(mn)mn.value=Number.isFinite(+((p.stockMin??p.min)))?((p.stockMin??p.min)):0;
    if(mx)mx.value=Number.isFinite(+p.stockMax)?p.stockMax:0;
  }catch(e){console.warn('[VENTARA] phase1 hydrate',e)}}

  function attachSaveHook(){try{
    const m=modal();
    const b=[...document.querySelectorAll('.modalbox .actions button')].find(x=>/guardar/i.test(x.textContent||''));
    if(!m||!b||b.dataset.ventaraPhase1Save==='1')return;
    b.dataset.ventaraPhase1Save='1';
    b.addEventListener('click',()=>{
      try{
        const id=productIdFromModal();
        const code=document.getElementById('f_code')?.value||'';
        const name=document.getElementById('f_name')?.value||'';
        const supplierId=document.getElementById('productSupplier')?.value||'';
        const min=Number(document.getElementById('productMinStock')?.value||0);
        const max=Number(document.getElementById('productMaxStock')?.value||0);
        setTimeout(()=>persistAfterNativeSave({id,code,name,supplierId,min,max}),350);
      }catch(e){console.warn('[VENTARA] phase1 save hook',e)}
    },{capture:true});
  }catch(e){console.warn('[VENTARA] phase1 attach save',e)}}

  function persistAfterNativeSave(x){try{
    const d=getDb();if(!d||!Array.isArray(d.products))return;
    let p=x.id?d.products.find(v=>String(v?.id)===String(x.id)):null;
    if(!p&&x.code)p=d.products.find(v=>String(v?.code||'')===String(x.code));
    if(!p&&x.name)p=d.products.find(v=>String(v?.name||'').trim()===String(x.name).trim());
    if(!p)return;
    p.supplierId=x.supplierId||'';
    p.stockMin=Number.isFinite(x.min)&&x.min>0?x.min:0;
    p.stockMax=Number.isFinite(x.max)&&x.max>0?x.max:0;
    p.min=p.stockMin;
    if(typeof W.save==='function')W.save();
    if(typeof W.cloudSave==='function')Promise.resolve(W.cloudSave()).catch(e=>console.warn('[VENTARA] phase1 cloud save',e));
  }catch(e){console.warn('[VENTARA] phase1 persistence',e)}}

  function injectButton(){try{
    const root=document.getElementById('products');
    if(!root||document.getElementById('ventaraPhase1AlertsBtn'))return false;
    const b=document.createElement('button');
    b.id='ventaraPhase1AlertsBtn';b.type='button';b.className='btn';b.textContent='🔔 Consultar Alertas';
    b.addEventListener('click',showAlerts);
    const head=root.querySelector('.actions');
    (head||root.firstElementChild||root).appendChild(b);
    return true;
  }catch(e){console.warn('[VENTARA] phase1 button',e);return false}}

  function showAlerts(){try{
    const rows=products().filter(p=>{
      const min=Number(p?.stockMin??p?.min);
      const stock=Number(p?.stockActual??p?.stock??0);
      return Number.isFinite(min)&&min>0&&stock<=min;
    });
    const body=rows.length?rows.map(p=>{
      const stock=Number(p?.stockActual??p?.stock??0),min=Number(p?.stockMin??p?.min||0),max=Math.max(Number(p?.stockMax||0),min),qty=Math.max(0,max-stock),name=String(p?.name||p?.description||'Producto sin nombre'),prov=supplierName(p?.supplierId);
      return `<tr><td><b>${esc(name)}</b><br><span class="muted">⚠️ Quedan ${stock} unidades de ${esc(name)}.</span></td><td>${esc(prov)}</td><td>${stock} / ${min}</td><td><b>${qty}</b></td></tr>`;
    }).join(''):`<tr><td colspan="4" class="empty">✅ No hay artículos por debajo del stock mínimo configurado.</td></tr>`;
    const html=`<h2>🔔 Alertas de Stock</h2><p class="muted">Consulta realizada bajo demanda. El cálculo solo se ejecuta al pulsar este botón.</p><table class="table"><thead><tr><th>Producto</th><th>Proveedor</th><th>Actual / Mínimo</th><th>Sugerido a pedir</th></tr></thead><tbody>${body}</tbody></table><div class="actions" style="margin-top:15px"><button class="btn" type="button" onclick="window.closeModal()">Cerrar</button></div>`;
    if(typeof W.openModal==='function')W.openModal(html);else alert(rows.length?rows.map(p=>`${p?.name||'Producto'} — ${supplierName(p?.supplierId)} — ${p?.stockActual??p?.stock??0} unidades`).join('\n'):'No hay alertas');
  }catch(e){console.warn('[VENTARA] phase1 alerts',e)}}

  function wireProductsRoot(){try{
    const root=document.getElementById('products');
    if(!root||root.dataset.ventaraPhase1Root==='1')return;
    root.dataset.ventaraPhase1Root='1';
    root.addEventListener('click',()=>setTimeout(()=>{try{addFields();injectButton()}catch(e){console.warn('[VENTARA] phase1 deferred',e)}},120));
  }catch(e){console.warn('[VENTARA] phase1 root',e)}}

  function boot(){try{wireProductsRoot();addFields();injectButton()}catch(e){console.warn('[VENTARA] phase1 boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
  W.ventaraPhase1={refresh:boot,consult:showAlerts};
})();
