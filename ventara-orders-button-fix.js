/* Compatibilidad con referencias antiguas de Pedidos. */
(()=>{'use strict';
if(window.__ventaraOrdersButtonFixLoaded)return;
window.__ventaraOrdersButtonFixLoaded=true;
const appActive=()=>{
  const login=document.getElementById('loginScreen'),main=document.getElementById('mainApp');
  return !!main&&main.style.display!=='none'&&(!login||login.style.display==='none');
};
if(!appActive())return;
if(!window.__ventaraOrdersUnifiedPatch){
  const s=document.createElement('script');
  s.src='./ventara-orders-dom-fix.js';
  s.onload=()=>console.log('Parche unificado de Pedidos cargado desde compatibilidad');
  document.head.appendChild(s);
}
})();