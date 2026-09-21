/* VENTARA POS — Pedidos. Módulo aislado: #orders + window.db.orders. */
(()=>{'use strict';
const __creditFixSrc='ventara-credit-payment-fix.js?v=20260921-credit-v10';
if(!document.querySelector('script[data-ventara-credit-fix]')){const s=document.createElement('script');s.src=__creditFixSrc;s.dataset.ventaraCreditFix='1';s.defer=true;document.head.appendChild(s)}
const S=['Pendiente','Entregado','Cancelado'],q=s=>document.querySelector(s),root=()=>q('#orders');