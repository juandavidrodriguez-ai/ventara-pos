/* VENTARA POS — parche único de Pedidos. Compatible con referencias antiguas. */
(()=>{'use strict';
if(window.__ventaraOrdersUnifiedPatch)return;
window.__ventaraOrdersUnifiedPatch=true;
console.log("PARCHE PEDIDOS UNIFICADO APLICADO CORRECTAMENTE");

const appActive=()=>{
  const login=document.getElementById('loginScreen'),main=document.getElementById('mainApp');
  return !!main&&main.style.display!=='none'&&(!login||login.style.display==='none');
};

const clean=()=>{
  if(!appActive())return;
  const scope=document.querySelector('#orders');
  if(!scope)return;
  const selectors='.orders-search-filter, .filter-bar-container, .orders-filter-bar, .order-filters, .search-filter, .filters-bar';
  const bars=Array.from(scope.querySelectorAll(selectors));
  if(bars.length>1)bars.slice(1).forEach(el=>el.remove());
  Array.from(scope.querySelectorAll('input[type="search"]'))
    .filter(x=>x.id!=='ventaraOrderFilterText')
    .forEach(input=>{
      const box=input.closest('.field')?.parentElement||input.parentElement?.parentElement;
      if(box&&box!==scope)box.remove();
      else input.style.display='none';
    });
  Array.from(scope.querySelectorAll('label')).filter(x=>x.textContent.trim()==='Buscar').forEach(label=>{
    const box=label.closest('.field')?.parentElement||label.parentElement?.parentElement;
    if(box&&box!==scope&&!box.querySelector('#ventaraOrderFilterText'))box.remove();
  });
};

const closeAndRefresh=()=>{
  if(!appActive())return;
  document.getElementById('ventaraOrderModal')?.remove();
  if(window.ventaraOrders&&typeof window.ventaraOrders.render==='function')window.ventaraOrders.render();
};

const watchForms=()=>{
  if(!appActive())return;
  const form=document.getElementById('ventaraOrderForm');
  if(!form||form.__ventaraUnifiedWrapped)return;
  form.__ventaraUnifiedWrapped=true;
  form.addEventListener('submit',()=>{
    if(!appActive())return;
    const before=(()=>{try{
      const d=typeof db!=='undefined'?db:window.db;
      return Array.isArray(d?.orders)?d.orders.length:0;
    }catch{return 0}})();
    setTimeout(()=>{
      if(!appActive())return;
      const after=(()=>{try{
        const d=typeof db!=='undefined'?db:window.db;
        return Array.isArray(d?.orders)?d.orders.length:0;
      }catch{return 0}})();
      if(after>before){
        closeAndRefresh();
        console.log("PEDIDO GUARDADO Y MODAL CERRADO");
      }
    },50);
  },true);
};

const run=()=>{if(!appActive())return;clean();watchForms();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
})();