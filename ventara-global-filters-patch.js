/* VENTARA POS — Filtros globales quirúrgicos. Solo cambia display de filas; no toca db ni eventos de acciones. */
(()=>{
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const MARK='data-ventara-global-filter';
const STYLE='display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:0 0 12px;padding:12px;border:1px solid #ddd;border-radius:8px';
const configs=[
 {key:'cash',terms:['caja','movimientos de caja','arqueo'],search:'Usuario o cajero',quick:'cash'},
 {key:'expenses',terms:['gastos'],search:'Descripcion, categoria o monto',quick:'none'},
 {key:'reports',terms:['reportes','informes'],search:'Tipo de reporte o concepto',quick:'none'},
 {key:'users',terms:['roles','usuarios'],search:'Nombre de usuario o rol',quick:'roles'},
 {key:'catalog',terms:['catalogo digital','catalogo'],search:'Nombre o categoria',quick:'none'}
];
function text(el){try{return norm(el?.innerText||el?.textContent||'')}catch(e){return ''}}
function visible(el){try{return !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)}catch(e){return false}}
function findRoot(cfg){try{const tables=[...document.querySelectorAll('table')].filter(visible);let best=null,bestScore=0;for(const t of tables){let p=t.parentElement,depth=0;while(p&&depth<5){const tx=text(p);let score=0;for(const term of cfg.terms)if(tx.includes(norm(term)))score+=4;if(p.id&&cfg.terms.some(term=>norm(p.id).includes(norm(term))))score+=8;if(p.className&&cfg.terms.some(term=>norm(p.className).includes(norm(term))))score+=3;if(score>bestScore){best=p;bestScore=score}p=p.parentElement;depth++}}return bestScore>=4?best:null}catch(e){console.error('[VENTARA] localizar modulo '+cfg.key,e);return null}}
function makeControls(cfg){const b=document.createElement('div');b.setAttribute(MARK,cfg.key);b.style.cssText=STYLE;let quick='';if(cfg.quick==='cash')quick='<label><span>Tipo</span><select data-gf-quick><option value="todos">Todos</option><option>Ingreso</option><option>Egreso</option><option>Apertura/Cierre</option></select></label>';if(cfg.quick==='roles')quick='<label><span>Rol</span><select data-gf-quick><option value="todos">Todos</option><option>Administrador</option><option>Cajero</option><option>Vendedor</option></select></label>';b.innerHTML='<label style="flex:1;min-width:220px"><span>🔎 Buscar</span><input type="search" data-gf-q placeholder="'+esc(cfg.search)+'" style="display:block;width:100%;box-sizing:border-box"></label>'+quick+'<button type="button" data-gf-clear class="btn sm">Limpiar Filtros</button>';return b}
function rowMatches(tr,cfg,b){const q=norm(b.querySelector('[data-gf-q]')?.value);const quick=norm(b.querySelector('[data-gf-quick]')?.value||'todos');const tx=text(tr);if(q&&!tx.includes(q))return false;if(quick!=='todos'&&!tx.includes(quick))return false;return true}
function filter(root,b,cfg){try{const table=root?.querySelector('table');const body=table?.querySelector('tbody');if(!body)return;let shown=0;[...body.querySelectorAll('tr')].forEach(tr=>{if(tr.hasAttribute('data-ventara-empty'))return;const ok=rowMatches(tr,cfg,b);tr.style.display=ok?'table-row':'none';if(ok)shown++});let empty=body.querySelector('[data-ventara-empty]');if(!empty){empty=document.createElement('tr');empty.setAttribute('data-ventara-empty','1');empty.innerHTML='<td colspan="30" style="text-align:center;padding:14px">No hay registros que coincidan con los filtros.</td>';body.appendChild(empty)}empty.style.display=shown?'none':'table-row'}catch(e){console.error('[VENTARA] filtro '+cfg.key,e)}}
function install(root,cfg){try{if(!root||root.querySelector('['+MARK+'="'+cfg.key+'"]'))return;const table=root.querySelector('table');if(!table)return;const b=makeControls(cfg);table.parentNode?.insertBefore(b,table);const run=()=>filter(root,b,cfg);b.querySelector('[data-gf-q]')?.addEventListener('input',run);b.querySelector('[data-gf-quick]')?.addEventListener('change',run);b.querySelector('[data-gf-clear]')?.addEventListener('click',()=>{b.querySelector('[data-gf-q]').value='';const q=b.querySelector('[data-gf-quick]');if(q)q.value='todos';run()});run()}catch(e){console.error('[VENTARA] instalar filtro '+cfg.key,e)}}
function boot(){try{configs.forEach(cfg=>{try{const root=findRoot(cfg);if(root)install(root,cfg)}catch(e){console.error('[VENTARA] boot '+cfg.key,e)}})}catch(e){console.error('[VENTARA] filtros globales',e)}}
function start(){try{boot();[1200,2500,5000].forEach(ms=>setTimeout(boot,ms))}catch(e){console.error('[VENTARA] inicio filtros globales',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1200),{once:true});else setTimeout(start,1200);
})();
