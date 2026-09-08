from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Add a real IVA field to the product form if it is not already present.
old = '''<div class="field"><label>Precio venta</label><input id="f_price" type="number" step="0.01" value="${p.price}"></div><div class="field"><label>Costo</label><input id="f_cost" type="number" step="0.01" value="${p.cost}"></div>'''
new = '''<div class="field"><label>Precio venta (sin IVA)</label><input id="f_price" type="number" step="0.01" min="0" value="${p.price}"></div><div class="field"><label>IVA</label><select id="f_iva"><option value="0" ${Number(p.iva||0)===0?'selected':''}>0%</option><option value="1" ${Number(p.iva)===1?'selected':''}>1%</option><option value="2" ${Number(p.iva)===2?'selected':''}>2%</option><option value="4" ${Number(p.iva)===4?'selected':''}>4%</option><option value="5" ${Number(p.iva)===5?'selected':''}>5%</option><option value="8" ${Number(p.iva)===8?'selected':''}>8%</option><option value="10" ${Number(p.iva)===10?'selected':''}>10%</option><option value="12" ${Number(p.iva)===12?'selected':''}>12%</option><option value="15" ${Number(p.iva)===15?'selected':''}>15%</option><option value="16" ${Number(p.iva)===16?'selected':''}>16%</option><option value="18" ${Number(p.iva)===18?'selected':''}>18%</option><option value="19" ${Number(p.iva)===19?'selected':''}>19%</option><option value="20" ${Number(p.iva)===20?'selected':''}>20%</option><option value="21" ${Number(p.iva)===21?'selected':''}>21%</option><option value="22" ${Number(p.iva)===22?'selected':''}>22%</option><option value="25" ${Number(p.iva)===25?'selected':''}>25%</option><option value="30" ${Number(p.iva)===30?'selected':''}>30%</option><option value="35" ${Number(p.iva)===35?'selected':''}>35%</option><option value="custom">Personalizado</option></select><small class="muted">Precio final: <b id="f_price_final">${money(window.ventaraPriceWithIva?window.ventaraPriceWithIva(p.price,p.iva||0):p.price)}</b></small></div><div class="field"><label>Costo</label><input id="f_cost" type="number" step="0.01" min="0" value="${p.cost}"></div>'''
if old in s:
    s=s.replace(old,new,1)
else:
    print('IVA field anchor not found; it may already be patched')

# Make saveProduct include IVA and make cloud failure non-fatal to local product creation.
pat=r"async function saveProduct\(id\)\{.*?\n\}"
m=re.search(pat,s,re.S)
if not m:
    raise SystemExit('saveProduct function not found')
fn='''async function saveProduct(id){let p=db.products.find(x=>x.id===id);let old=p?.stock||0;let iva=+(v('f_iva')||0);let data={name:v('f_name').trim(),code:v('f_code').trim(),category:v('f_cat').trim()||'General',image:v('f_image'),unit:v('f_unit'),presentation:v('f_presentation').trim(),content:+v('f_content')||1,contentUnit:v('f_contentUnit'),price:Math.max(0,+v('f_price')||0),cost:Math.max(0,+v('f_cost')||0),stock:Math.max(0,+v('f_stock')||0),min:Math.max(0,+v('f_min')||0),iva:Math.max(0,iva),taxRate:Math.max(0,iva),priceWithIva:Math.round((Math.max(0,+v('f_price')||0))*(1+Math.max(0,iva)/100)*100)/100,active:true};if(!data.name)return toast('Escribe el nombre del producto');const file=document.getElementById('f_image_file')?.files?.[0];if(file&&cloudReady&&currentCompanyId){if(file.size>5*1024*1024)return toast('La imagen debe pesar máximo 5 MB');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const productId=id||uid('p');const path=`${currentCompanyId}/${productId}.${ext}`;const {error:upError}=await supabaseClient.storage.from('product-images').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});if(upError)return toast('No se pudo subir la imagen: '+upError.message);data.image=supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl;data.id=productId}if(p)Object.assign(p,data);else{data.id=data.id||uid('p');db.products.push(data);if(data.stock)db.kardex.unshift({id:uid('k'),date:today(),type:'Entrada inicial',ref:'',productId:data.id,qty:data.stock,balance:data.stock,cost:data.cost})}if(p&&old!==data.stock)db.kardex.unshift({id:uid('k'),date:today(),type:'Ajuste',ref:'',productId:p.id,qty:data.stock-old,balance:data.stock,cost:data.cost});log(id?'Artículo editado':'Artículo creado',data.name);localSave();closeModal();renderProducts();toast('Artículo guardado');try{await cloudSave()}catch(e){console.error(e);toast('Artículo guardado localmente; pendiente de sincronizar en la nube')}}'''
s=s[:m.start()]+fn+s[m.end():]

# Prevent Backspace/Delete from navigating/submitting while editing product fields.
needle="function v(id){return document.getElementById(id)?.value||''}"
insert="""document.addEventListener('keydown',function(e){const t=e.target;if((e.key==='Backspace'||e.key==='Delete')&&(t.matches('input,textarea,select'))){e.stopPropagation();return}if(e.key==='Backspace'&&document.querySelector('.modal.show')&&!t.matches('input,textarea,select')){e.preventDefault();e.stopPropagation()}} ,true);\n"""
if insert not in s:
    s=s.replace(needle,insert+needle,1)

p.write_text(s,encoding='utf-8')
print('Product creation/save and IVA persistence patched')
