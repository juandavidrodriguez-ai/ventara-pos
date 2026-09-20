/* VENTARA POS - Hardware bridge for thermal ESC/POS + cash drawer.
   Isolated module. Does not replace the existing sale/database logic.
   Uses QZ Tray as the local bridge between the browser and the USB printer. */
(function(){
  'use strict';

  const QZ_VERSION='2.3.0';
  const QZ_SRC='https://cdn.jsdelivr.net/npm/qz-tray@'+QZ_VERSION+'/qz-tray.js';
  const PRINTER_KEY='ventara.qzPrinter';
  const DRAWER_PULSE='\x1B\x70\x00\x3C\x78'; // Same pulse already used by Ventara's serial drawer command.

  let qzLoadPromise=null;
  let connectPromise=null;
  let printerPromise=null;

  function notify(message){
    try{
      if(typeof window.toast==='function') window.toast(message);
      else console.info('[VENTARA HARDWARE]',message);
    }catch(e){ console.info('[VENTARA HARDWARE]',message); }
  }

  function loadQz(){
    if(window.qz) return Promise.resolve(window.qz);
    if(qzLoadPromise) return qzLoadPromise;
    qzLoadPromise=new Promise(function(resolve,reject){
      const existing=document.querySelector('script[data-ventara-qz-library]');
      if(existing){
        existing.addEventListener('load',()=>resolve(window.qz),{once:true});
        existing.addEventListener('error',()=>reject(new Error('No se pudo cargar QZ Tray.')),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=QZ_SRC;
      script.async=true;
      script.dataset.ventaraQzLibrary='1';
      script.onload=()=>window.qz?resolve(window.qz):reject(new Error('QZ Tray cargó sin exponer su API.'));
      script.onerror=()=>reject(new Error('No se pudo cargar el conector QZ Tray.'));
      document.head.appendChild(script);
    });
    return qzLoadPromise;
  }

  function connect(){
    return loadQz().then(function(qz){
      if(qz.websocket.isActive()) return qz;
      if(connectPromise) return connectPromise;
      connectPromise=qz.websocket.connect({retries:2,delay:1}).then(()=>qz);
      return connectPromise;
    });
  }

  function selectPrinter(qz){
    const saved=String(localStorage.getItem(PRINTER_KEY)||'').trim();
    if(saved) return qz.printers.find(saved);
    return qz.printers.find('TP80NC').then(function(found){
      if(found) return found;
      return qz.printers.find('StarPos').then(function(star){
        if(star) return star;
        return qz.printers.getDefault();
      });
    }).then(function(found){
      if(found) localStorage.setItem(PRINTER_KEY,String(found));
      return found;
    });
  }

  function getPrinter(){
    if(printerPromise) return printerPromise;
    printerPromise=connect().then(selectPrinter).then(function(printer){
      if(!printer) throw new Error('No se encontró una impresora disponible para VENTARA.');
      return printer;
    }).catch(function(err){
      printerPromise=null;
      throw err;
    });
    return printerPromise;
  }

  function db(){
    try{return typeof window.db!=='undefined'?window.db:null}catch(e){return null}
  }

  function money(v){
    try{
      return typeof window.money==='function'?window.money(v):'$ '+Number(v||0).toLocaleString('es-CO');
    }catch(e){return '$ '+Number(v||0).toLocaleString('es-CO')}
  }

  function clean(v){
    return String(v??'').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function line(text,width){
    text=clean(text);
    if(text.length<=width) return text;
    return text.slice(0,width-1)+'…';
  }

  function twoCol(left,right,width){
    left=clean(left); right=clean(right);
    const room=Math.max(1,width-right.length-1);
    return line(left,room)+' '.repeat(Math.max(1,width-room-right.length))+line(right,right.length);
  }

  function ticketData(sale){
    const data=db()||{};
    const settings=data.settings||{};
    const clients=Array.isArray(data.clients)?data.clients:[];
    const client=clients.find(c=>String(c.id)===String(sale.clientId))||{name:'Consumidor final',doc:''};
    const W=48;
    let out='\x1B\x40';
    out+='\x1B\x61\x01';
    out+='\x1B\x45\x01';
    out+=line(settings.business||'VENTARA POS',W)+'\n';
    out+='\x1B\x45\x00';
    if(settings.legal) out+=line(settings.legal,W)+'\n';
    if(settings.nit) out+='NIT: '+line(settings.nit,W-5)+'\n';
    if(settings.city) out+=line(settings.city,W)+'\n';
    if(settings.phone) out+='Tel: '+line(settings.phone,W-5)+'\n';
    out+='\x1B\x61\x00';
    out+='-----------------------------------------------\n';
    out+='FACTURA POS '+line(sale.number||'',W-12)+'\n';
    out+='Fecha: '+clean((sale.date||'')+' '+(sale.time||''))+'\n';
    out+='Cajero: '+line(sale.cashier||'Administrador',W-8)+'\n';
    out+='-----------------------------------------------\n';
    out+='CLIENTE\n';
    out+=line(client.name||'Consumidor final',W)+'\n';
    if(client.doc) out+='Documento: '+line(client.doc,W-11)+'\n';
    out+='-----------------------------------------------\n';
    out+=twoCol('Cant. Producto','Total',W)+'\n';

    (sale.items||[]).forEach(function(item){
      const qty=clean(item.qty);
      const total=money(Number(item.qty||0)*Number(item.price||0));
      const name=clean(item.name||'Producto');
      const left=(qty+' '+name);
      out+=twoCol(left,total,W)+'\n';
    });

    out+='-----------------------------------------------\n';
    const subtotal=(sale.items||[]).reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0);
    out+=twoCol('Subtotal',money(subtotal),W)+'\n';
    if(Number(sale.discount||0)>0) out+=twoCol('Descuento',money(sale.discount),W)+'\n';
    if(Number(sale.iva||0)>0) out+=twoCol('IVA',money(sale.iva),W)+'\n';
    out+='\x1B\x45\x01';
    out+=twoCol('TOTAL',money(sale.total),W)+'\n';
    out+='\x1B\x45\x00';
    out+=twoCol('Pago',sale.method||'Efectivo',W)+'\n';
    if(sale.paymentDetail) out+=twoCol('Detalle',sale.paymentDetail,W)+'\n';
    out+=twoCol('Recibido',money(sale.received||sale.total),W)+'\n';
    out+=twoCol('Cambio',money(sale.change||0),W)+'\n';
    out+='-----------------------------------------------\n';
    out+='\x1B\x61\x01';
    out+=line(settings.footer||'Gracias por su compra',W)+'\n';
    out+='VENTARA POS\n';
    out+='\n\n\n';
    out+='\x1D\x56\x01'; // Partial cut.
    out+=DRAWER_PULSE;     // Open drawer connected to printer.
    return out;
  }

  async function printSale(sale){
    if(!sale) throw new Error('No hay datos de venta para imprimir.');
    const qz=await connect();
    const printer=await getPrinter();
    const config=qz.configs.create(printer,{
      encoding:'ISO-8859-1',
      jobName:'VENTARA '+String(sale.number||'Ticket')
    });
    await qz.print(config,[{
      type:'raw',
      format:'command',
      flavor:'plain',
      data:ticketData(sale),
      options:{language:'ESCPOS'}
    }]);
    return {printer};
  }

  async function openDrawer(){
    const qz=await connect();
    const printer=await getPrinter();
    const config=qz.configs.create(printer,{encoding:'ISO-8859-1',jobName:'VENTARA Apertura Cajon'});
    await qz.print(config,[{
      type:'raw',
      format:'command',
      flavor:'plain',
      data:DRAWER_PULSE,
      options:{language:'ESCPOS'}
    }]);
    return {printer};
  }

  async function test(){
    return printSale({
      number:'PRUEBA',
      date:new Date().toLocaleDateString('es-CO'),
      time:new Date().toLocaleTimeString('es-CO'),
      cashier:'VENTARA',
      clientId:'',
      items:[{qty:1,name:'PRUEBA IMPRESORA',price:1000}],
      total:1000,
      method:'Efectivo',
      received:1000,
      change:0
    });
  }

  window.VentaraHardware={
    version:'1.0.0',
    connect,
    getPrinter,
    printSale,
    openDrawer,
    test,
    setPrinter:function(name){
      const value=String(name||'').trim();
      if(!value)localStorage.removeItem(PRINTER_KEY);
      else localStorage.setItem(PRINTER_KEY,value);
      printerPromise=null;
      return value;
    },
    getConfiguredPrinter:function(){return String(localStorage.getItem(PRINTER_KEY)||'')}
  };

  console.info('[VENTARA] Puente QZ hardware disponible.');
})();
