/* Compatibilidad con referencias antiguas de Pedidos.
   La lógica real vive en ventara-orders-dom-fix.js. */
(()=>{'use strict';
if(window.__ventaraOrdersButtonFixLoaded)return;
window.__ventaraOrdersButtonFixLoaded=true;
if(!window.__ventaraOrdersUnifiedPatch){
  const s=document.createElement('script');
  s.src='./ventara-orders-dom-fix.js';
  s.onload=()=>console.log('Parche unificado de Pedidos cargado desde compatibilidad');
  document.head.appendChild(s);
}
})();