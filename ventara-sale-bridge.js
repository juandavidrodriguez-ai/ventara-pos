(()=>{
  try{
    Object.defineProperty(window,'db',{configurable:true,get:()=>typeof db!=='undefined'?db:null,set:v=>{if(typeof db!=='undefined')db=v}});
    Object.defineProperty(window,'cart',{configurable:true,get:()=>typeof cart!=='undefined'?cart:[],set:v=>{if(typeof cart!=='undefined')cart=v}});
    Object.defineProperty(window,'posClient',{configurable:true,get:()=>typeof posClient!=='undefined'?posClient:'c1',set:v=>{if(typeof posClient!=='undefined')posClient=v}});
  }catch(e){console.error('[VENTARA] bridge globals',e)}
  const s=document.createElement('script');s.src='ventara-sale-safe.js';s.defer=false;document.head.appendChild(s);
})();