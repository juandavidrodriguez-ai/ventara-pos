/* VENTARA POS - Filtro quirúrgico del módulo Proveedores.
   Solo modifica la representación visual de #suppliers.
   No modifica index.html, db.suppliers ni los botones existentes. */
(()=>{
  'use strict';
  const MARK='data-ventara-suppliers-filter';
  const EMPTY='data-ventara-suppliers-empty';
  let wrapped=null;
  let observer=null;
  let busy=false;

  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const root=()=>document.getElementById('suppliers');

  function supplierForRow(tr,index){
    const list=Array.isArray(window.db?.suppliers)?window.db.suppliers:[];
    return list[index]||null;
  }

  function supplierText(s,tr){
    const values=[];
    if(s){
      values.push(s.name,s.businessName,s.razonSocial,s.razon_social,s.nombre,s.commercialName);
      values.push(s.nit,s.doc,s.identification,s.document,s.documento,s.taxId);
      values.push(s.phone,s.telephone,s.telefono,s.mobile,s.celular);
      values.push(s.contact,s.contactName,s.contacto,s.contactoPrincipal,s.contactPerson);
    }
    values.push(tr?.innerText||'');
    return norm(values.filter(v=>v!==undefined&&v!==null).join(' '));
  }

  function inject(r){
    if(!r)return null;
    const table=r.querySelector('table');
    if(!table||!table.parentNode)return null;
    let bar=r.querySelector(`[${MARK}]`);
    if(bar)return bar;
    bar=document.createElement('div');
    bar.setAttribute(MARK,'1');
    bar.style.cssText='margin:0 0 16px;padding:14px 16px;border:1px solid var(--border,#dbe3ea);border-radius:10px;background:#f8fafc';
    bar.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b>🔎 Buscar proveedores</b><div class="muted" style="margin-top:3px">Nombre, razón social, NIT/cédula, teléfono o contacto</div></div><span id="ventaraSuppliersCount" class="muted"></span></div><div class="field" style="margin:10px 0 0"><input id="ventaraSuppliersSearch" type="search" autocomplete="off" placeholder="Ej. Proveedor ABC, 900123456, 3001234567, Carlos"></div>';
    table.parentNode.insertBefore(bar,table);
    bar.querySelector('#ventaraSuppliersSearch')?.addEventListener('input',apply);
    return bar;
  }

  function apply(){
    if(busy)return;
    const r=root();
    if(!r)return;
    const table=r.querySelector('table'),body=table?.querySelector('tbody');
    if(!table||!body)return;
    const bar=inject(r);
    if(!bar)return;
    const q=norm(bar.querySelector('#ventaraSuppliersSearch')?.value||'');
    const rows=Array.from(body.querySelectorAll('tr')).filter(tr=>!tr.hasAttribute(EMPTY));
    let visible=0;
    busy=true;
    try{
      rows.forEach((tr,i)=>{
        const show=!q||supplierText(supplierForRow(tr,i),tr).includes(q);
        tr.style.display=show?'':'none';
        if(show)visible++;
      });
      let empty=body.querySelector(`[${EMPTY}]`);
      if(!visible&&rows.length){
        if(!empty){
          empty=document.createElement('tr');
          empty.setAttribute(EMPTY,'1');
          empty.innerHTML='<td colspan="20" class="empty">No se encontraron proveedores con ese criterio</td>';
          body.appendChild(empty);
        }
        empty.style.display='';
      }else if(empty)empty.style.display='none';
      const count=bar.querySelector('#ventaraSuppliersCount');
      if(count)count.textContent=`${visible} proveedor${visible===1?'':'es'} encontrado${visible===1?'':'s'}`;
    }finally{busy=false}
  }

  function install(){
    const fn=window.renderSuppliers;
    if(typeof fn!=='function'||fn===wrapped)return;
    const original=fn;
    const wrappedFn=function(){
      const result=original.apply(this,arguments);
      setTimeout(apply,0);
      setTimeout(apply,100);
      return result;
    };
    wrappedFn.__ventaraSuppliersFilter=true;
    wrapped=wrappedFn;
    window.renderSuppliers=wrappedFn;
    setTimeout(apply,0);
  }

  function boot(){
    install();
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{
      if(busy)return;
      if(window.renderSuppliers!==wrapped)install();
      const r=root();
      if(r?.querySelector('table'))setTimeout(apply,0);
    });
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    [250,750,1500,3000,5000].forEach(ms=>setTimeout(install,ms));
    setInterval(install,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
