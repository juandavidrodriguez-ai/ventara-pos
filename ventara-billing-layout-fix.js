(()=>{ 
  'use strict';

  const STYLE_ID = 'ventara-billing-layout-fix';

  function installBillingLayout() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* VENTARA: redistribución visual exclusiva de Facturación. */
      .pos-shell{
        grid-template-columns:minmax(0,40fr) minmax(0,60fr)!important;
        align-items:start;
      }

      .pos-products,
      .pos-cart{
        min-width:0;
        width:100%;
        max-width:none;
      }

      .pos-cart .card,
      .pos-cart .checkout,
      .pos-cart .payment-grid,
      .pos-cart .quick-actions,
      .pos-cart .totals,
      .pos-cart .tablewrap{
        width:100%;
        max-width:100%;
      }

      .pos-cart input,
      .pos-cart select,
      .pos-cart textarea,
      .pos-cart button{
        max-width:100%;
      }

      .pos-cart .cart-list{
        min-width:0;
        width:100%;
      }

      @media(max-width:1100px){
        .pos-shell{
          grid-template-columns:1fr!important;
        }
        .pos-cart{
          position:static;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installBillingLayout, {once:true});
  } else {
    installBillingLayout();
  }
})();