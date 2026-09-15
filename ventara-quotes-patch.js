/* VENTARA POS - Filtro visual quirúrgico de Cotizaciones. No modifica db.quotes ni acciones. */
(()=>{
  'use strict';
  const ROOT_ID='quotes', SEARCH_ATTR='data-vqp-search', DATE_ATTR='data-vqp-date', STATUS_ATTR='data-vqp-status', CLEAR_ATTR='data-vqp-clear', COUNT_ATTR='data-vqp-count';
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const text=v=>norm(v);
  const db=()=>window.db&&typeof window.db==='object'?window.db:null;
  const quotes=()=>Array.isArray(db()?.quotes)?db().quotes:[];
  const clients=()=>Array.isArray(db()?.clients)?db().clients:[];
  const val=(o,keys)=>{for(const k of keys){if(o&&o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='')return o[k]}return ''};
  const clientFor=q=>{const id=val(q,['clientId','customerId','clienteId','customer']); const name=text(val(q,['clientName','customerName','cliente','customerName','client'])); return clients().find(c=>text(c?.id)===text(id)||text(c?.name)===name||text(c?.fullName)===name||text(c?.nombre)===name)||null};
  const quoteDate=q=>val(q,['date','fecha','createdAt','created_at','quotationDate','quoteDate']);
  const dateKey=v=>{if(!v)return ''; const s=String(v); const m=s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''};
  const quoteStatus=q=>val(q,['status','estado','state']);
  const searchText=q=>{const c=clientFor(q); return [val(q,['number','quoteNumber','quotationNumber','numero','codigo','id']),val(q,['clientId','customerId','clienteId']),val(q,['clientName','customerName','cliente','customer']),c?.name,c?.fullName,c?.nombre,c?.businessName,c?.razonSocial,c?.razon_social,c?.doc,c?.identification,c?.identificacion,c?.nit,c?.taxId,c?.taxNumber].map(text).filter(Boolean).join(' ')};
  const rowQuote=(row,i)=>{const all=quotes(); const q=all[i]; if(q)return q; const rt=text(row?.innerText||''); return all.find(x=>{const n=text(val(x,['number','quoteNumber','quotationNumber','numero','codigo','id']));return n&&rt.includes(n)})||null};
  function install(){
    const root=document.getElementById(ROOT_ID); if(!root)return false;
    if(!root.querySelector(`[${SEARCH_ATTR}]`)){
      const bar=document.createElement('div'); bar.setAttribute('data-ventara-quote-filter','');
      bar.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px';
      bar.innerHTML='<input type="search" '+SEARCH_ATTR+' placeholder="Buscar cotización, cédula/NIT o cliente…" autocomplete="off" style="flex:1;min-width:260px;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px"><input type="date" '+DATE_ATTR+' title="Filtrar por día" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px"><select '+STATUS_ATTR+' style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px"><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="aprobada">Aprobada</option><option value="vencida">Vencida</option></select><button type="button" class="btn" '+CLEAR_ATTR+'>Limpiar Filtros</button><span '+COUNT_ATTR+' style="font-size:13px;color:#64748b"></span>';
      root.insertBefore(bar,root.firstChild);
      bar.querySelector(`[${SEARCH_ATTR}]`).addEventListener('input',apply);
      bar.querySelector(`[${DATE_ATTR}]`).addEventListener('change',apply);
      bar.querySelector(`[${STATUS_ATTR}]`).addEventListener('change',apply);
      bar.querySelector(`[${CLEAR_ATTR}]`).addEventListener('click',()=>{bar.querySelector(`[${SEARCH_ATTR}]`).value='';bar.querySelector(`[${DATE_ATTR}]`).value='';bar.querySelector(`[${STATUS_ATTR}]`).value='';apply()});
    }
    apply(); return true;
  }
  function apply(){
    const root=document.getElementById(ROOT_ID); if(!root)return;
    const bar=root.querySelector(`[${SEARCH_ATTR}]`)?.closest('[data-ventara-quote-filter]'); if(!bar)return;
    const qText=text(root.querySelector(`[${SEARCH_ATTR}]`)?.value); const day=root.querySelector(`[${DATE_ATTR}]`)?.value||''; const status=text(root.querySelector(`[${STATUS_ATTR}]`)?.value||'');
    const rows=[...root.querySelectorAll('table tbody tr')]; let visible=0;
    rows.forEach((row,i)=>{if(row.querySelector('td[colspan]'))return; const q=rowQuote(row,i); const hay=q?searchText(q):text(row.innerText||''); const okText=!qText||hay.includes(qText); const okDate=!day||dateKey(q?quoteDate(q):'')===day; const st=text(q?quoteStatus(q):row.innerText||''); const okStatus=!status||st===status||st.includes(status); const ok=okText&&okDate&&okStatus; row.style.display=ok?'':'none'; if(ok)visible++});
    const count=root.querySelector(`[${COUNT_ATTR}]`); if(count)count.textContent=`${visible} resultado${visible===1?'':'s'}`;
  }
  let wrapped=false;
  function boot(){install();if(!wrapped&&typeof window.renderQuotes==='function'){const original=window.renderQuotes;window.renderQuotes=function(){const r=original.apply(this,arguments);setTimeout(install,0);setTimeout(apply,80);return r};wrapped=true}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  new MutationObserver(()=>{if(document.getElementById(ROOT_ID))boot()}).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(document.getElementById(ROOT_ID))boot()},1000);
})();
