/* VENTARA runtime guard
   Evita que un renderer ausente rompa toda la navegación. También deja una
   recuperación explícita cuando un módulo todavía no está disponible. */
(function(){
  'use strict';

  function getRenderer(name){
    try {
      var fn = window[name];
      return typeof fn === 'function' ? fn : null;
    } catch(e){ return null; }
  }

  function safeRender(page){
    var names={
      dashboard:'renderDashboard',
      pos:'renderPOS',
      sales:'renderSales',
      orders:'renderOrders',
      products:'renderProducts',
      inventory:'renderInventory',
      purchases:'renderPurchases',
      suppliers:'renderSuppliers',
      clients:'renderClients',
      receivables:'renderReceivables',
      quotes:'renderQuotes',
      cash:'renderCash',
      expenses:'renderExpenses',
      reports:'renderReports',
      users:'renderUsers',
      catalog:'renderCatalog',
      settings:'renderSettings'
    };
    var fn=getRenderer(names[page]);
    if(fn){
      try { return fn(); }
      catch(e){
        console.error('VENTARA render error:',e);
        var el=document.getElementById(page);
        if(el) el.innerHTML='<div class="card" style="margin:20px"><h2>No se pudo cargar este módulo</h2><p class="muted">La sesión sigue activa, pero este módulo encontró un error. Revisa la consola para ver el detalle.</p><button class="btn primary" onclick="window.showPage && window.showPage(\'dashboard\')">Volver al inicio</button></div>';
        return;
      }
    }
    var el=document.getElementById(page);
    if(el) el.innerHTML='<div class="card" style="margin:20px"><h2>Módulo temporalmente no disponible</h2><p class="muted">El módulo <b>'+page+'</b> no está disponible en esta versión cargada. La navegación no se bloqueará.</p><button class="btn primary" onclick="window.showPage && window.showPage(\'dashboard\')">Volver al inicio</button></div>';
  }

  function patchNavigation(){
    if(typeof window.showPage==='function' && !window.__ventaraShowPagePatched){
      var originalShowPage=window.showPage;
      window.showPage=function(page){
        try{
          if(window.currentUser && typeof window.canAccess==='function' && !window.canAccess(page)){
            if(typeof window.toast==='function') window.toast('Tu rol no tiene permiso para este módulo');
            return;
          }
          document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active')});
          var target=document.getElementById(page);
          if(target) target.classList.add('active');
          document.querySelectorAll('.nav').forEach(function(x){x.classList.toggle('active',x.dataset.page===page)});
          safeRender(page);
        }catch(e){
          console.error('VENTARA navigation error:',e);
          try{ originalShowPage(page); }catch(_){ }
        }
      };
      window.__ventaraShowPagePatched=true;
    }
  }

  function patchRender(){
    window.render=function(page){safeRender(page)};
    window.__ventaraSafeRender=true;
  }

  // Las declaraciones de index.html ya existen cuando este archivo se ejecuta.
  patchRender();
  patchNavigation();

  // Si el orden de carga cambia, volvemos a aplicar el parche sin bloquear la UI.
  var tries=0;
  var timer=setInterval(function(){
    tries++;
    patchRender();
    patchNavigation();
    if(tries>=20) clearInterval(timer);
  },250);
})();
