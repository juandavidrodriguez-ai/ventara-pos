/* VENTARA POS — FASE 1: inyección visual aislada + consulta pasiva. */
(()=>{
  'use strict';
  const W=window;
  const getDb=()=>{try{return W.db||null}catch(e){return null}};
  const products=()=>{try{const d=getDb();return Array.isArray(d?.products)?d.products:[]}catch(e){return[]}};
  const suppliers=()=>{try{const d=getDb();return Array.isArray(d?.suppliers)?d.suppliers:[]}catch(e){return[]}};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const supplierName=id=>{try{const s=suppliers().find(x=>String(x?.id)===String(id));return String(s?.name||s?.businessName||s?.razonSocial||s?.company||'Sin Proveedor')}catch(e){return'Sin Proveedor'}};
  const productModal=()=>{try{return document.getElementById('productModal')||[...document.querySelectorAll('.modalbox')].find(m=>m.querySelector('#f_cat')||m.querySelector('#f_name'))||null}catch(e){return null}};

  function fillSupplierOptions(selected){try{
    const s=document.getElementById('productSupplier');if(!s)return;
    const current=selected!==undefined?String(selected):String(s.value||'');
    s.innerHTML='<option value="">Sin Proveedor</option>'+suppliers().map(x=>`<option value="${esc(x?.id)}">${esc(x?.name||x?.businessName||x?.razonSocial||x?.company||'Proveedor')}</option>`).join('');
    s.value=current;
  }catch(e){console.warn('[VENTARA] supplier options',e)}}

  function productIdFromModal(){try{
    const m=productModal();
    const b=[...(m?.querySelectorAll('.actions button')||[])].find(x=>/guardar/i.test(x.textContent||''));
    const raw=b?.getAttribute('onclick')||'';
    const match=raw.match(/saveProduct\(['"]([^'"]*)['"]\)/);
    return match?match[1]:'';
  }catch(e){return''}}

  function hydrate(){try{
    const p=products().find(x=>String(x?.id)===String(productIdFromModal()));
    const s=document.getElementById('productSupplier'),mn=document.getElementById('productMinStock'),mx=document.getElementById('productMaxStock');
    fillSupplierOptions(p?.supplierId??s?.value??'');
    if(!p)return;
    if(s)s.value=p.supplierId??'';
    if(mn)mn.value=Number.isFinite(+(p.stockMin??p.min))?(p.stockMin??p.min):0;
    if(mx)mx.value=Number.isFinite(+p.stockMax)?p.stockMax:0;
  }catch(e){console.warn('[VENTARA] hydrate',e)}}

  function injectFields(){try{
    const m=productModal();if(!m)return false;
    const category=document.getElementById('f_cat');
    const min=document.getElementById('f_min');
    if(!category&&!min)return false;

    if(!document.getElementById('productSupplier')){
      const host=category?.closest('.field')||m.querySelector('.form');
      if(host){
        const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='supplier';
        wrap.innerHTML='<label>Proveedor</label><select id="productSupplier" class="form-control"><option value="">Sin Proveedor</option></select>';
        host.insertAdjacentElement('afterend',wrap);
      }
    }
    fillSupplierOptions();

    if(!document.getElementById('productMaxStock')){
      const host=min?.closest('.field')||m.querySelector('.form');
      if(host){
        const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='max';
        wrap.innerHTML='<label>Stock Máximo / Objetivo</label><input id="productMaxStock" class="form-control" type="number" min="0" step="0.001" placeholder="0">';
        host.insertAdjacentElement('afterend',wrap);
      }
    }

    const visualMin=document.getElementById('productMinStock');
    if(!visualMin&&min){
      const wrap=document.createElement('div');wrap.className='field';wrap.dataset.ventaraPhase1='min';
      wrap.innerHTML='<label>Stock Mínimo para alerta</label><input id="productMinStock" class="form-control" type="number" min="0" step="0.001" placeholder="0">';
      min.closest('.field')?.insertAdjacentElement('afterend',wrap);
      const v=document.getElementById('productMinStock');if(v)v.value=min.value||'0';
    }
    hydrate();
    return !!document.getElementById('productSupplier')&&!!document.getElementById('productMaxStock');
  }catch(e){console.warn('[VENTARA] inject fields',e);return false}}

  function injectButton(){try{
    const root=document.getElementById('products');if(!root)return false;
    document.getElementById('ventaraPhase1AlertsBtn')?.remove();
    const old=document.getElementById('btnConsultAlerts');if(old)old.remove();
    const b=document.createElement('button');
    b.id='btnConsultAlerts';b.type='button';b.className='btn btn-warning';b.textContent='🔔 Consultar Alertas';
    b.addEventListener('click',()=>{try{showAlerts()}catch(e){console.warn('[VENTARA] alerts click',e)}});
    const actions=root.querySelector('.head .actions')||root.querySelector('.actions');
    if(!actions)return false;
    actions.appendChild(b);
    return true;
  }catch(e){console.warn('[VENTARA] inject button',e);return false}}

  function showAlerts(){try{
    const rows=products().filter(p=>{
      const stock=Number(p?.stockActual??p?.stock??0),min=Number(p?.stockMin??p?.min);
      return Number.isFinite(stock)&&Number.isFinite(min)&&min>0&&stock<=min;
    });
    const body=rows.length?rows.map(p=>{
      const stock=Number(p?.stockActual??p?.stock??0),min=Number(p?.stockMin??p?.min),max=Number(p?.stockMax??0),qty=Math.max(0,max-stock),name=String(p?.name||p?.description||'Producto sin nombre');
      return `<tr><td>${esc(name)}</td><td>${esc(supplierName(p?.supplierId))}</td><td>${stock}</td><td>${min}</td><td><b>${qty}</b></td></tr>`;
    }).join(''):`<tr><td colspan="5" class="empty">No hay alertas de stock pendiente.</td></tr>`;
    const html=`<h2>Alertas de Reabastecimiento de Inventario</h2><div class="card" style="box-shadow:none;background:#f8fafc"><table class="table"><thead><tr><th>Producto</th><th>Proveedor</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Cantidad Sugerida a Pedir</th></tr></thead><tbody>${body}</tbody></table></div><div class="actions" style="margin-top:15px"><button class="btn" type="button" onclick="window.closeModal()">Cerrar</button></div>`;
    if(typeof W.openModal==='function')W.openModal(html);else alert(rows.length?rows.map(p=>`${p?.name||'Producto'} — ${supplierName(p?.supplierId)} — actual: ${p?.stockActual??p?.stock??0} — mínimo: ${p?.stockMin??p?.min??0} — sugerido: ${Math.max(0,Number(p?.stockMax??0)-Number(p?.stockActual??p?.stock??0))}`).join('\n'):'No hay alertas de stock pendiente.');
  }catch(e){console.warn('[VENTARA] show alerts',e)}}

  function afterProductOpen(){try{setTimeout(()=>{try{injectFields()}catch(e){console.warn('[VENTARA] deferred fields',e)}},80)}catch(e){console.warn('[VENTARA] after open',e)}}

  function wireRoot(){try{
    const root=document.getElementById('products');if(!root||root.dataset.ventaraPhase1Root==='1')return;
    root.dataset.ventaraPhase1Root='1';
    root.addEventListener('click',e=>{try{
      const b=e.target?.closest?.('button');
      if(b&&/nuevo artículo|nuevo articulo/i.test(b.textContent||''))afterProductOpen();
      setTimeout(()=>{try{injectButton()}catch(err){console.warn('[VENTARA] deferred button',err)}},120);
    }catch(err){console.warn('[VENTARA] products listener',err)}});
  }catch(e){console.warn('[VENTARA] wire root',e)}}

  function wireNav(){try{
    document.querySelectorAll('.nav[data-page="products"],.nav[data-page="inventory"]').forEach(b=>{
      if(b.dataset.ventaraPhase1Nav==='1')return;
      b.dataset.ventaraPhase1Nav='1';
      b.addEventListener('click',()=>setTimeout(()=>{try{injectButton()}catch(e){console.warn('[VENTARA] nav button',e)}},250));
    });
  }catch(e){console.warn('[VENTARA] wire nav',e)}}

  function boot(){try{wireRoot();wireNav();injectButton();if(productModal())injectFields()}catch(e){console.warn('[VENTARA] phase1 boot',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
  W.ventaraPhase1={refresh:boot,consult:showAlerts};
})();