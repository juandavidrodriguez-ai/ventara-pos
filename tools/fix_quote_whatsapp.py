from pathlib import Path
import re

path = Path('index.html')
html = path.read_text(encoding='utf-8')

old = "function quoteWhatsApp(id){let q=quoteFor(id);if(!q)return;let c=db.clients.find(x=>x.id===q.clientId);if(!c?.phone)return toast('El cliente no tiene teléfono registrado');if(q.status==='Borrador'){q.status='Enviada';save();renderQuotes()}let phone=String(c.phone).replace(/[^0-9]/g,'');if(phone.length===10)phone='57'+phone;window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(quoteText(q)),'_blank');toast('Cotización preparada para WhatsApp')}"
new = "function quoteWhatsApp(id){let q=quoteFor(id);if(!q)return;let c=db.clients.find(x=>x.id===q.clientId);let savedPhone=String(c?.phone||'').replace(/[^0-9]/g,'');if(savedPhone.length===10)savedPhone='57'+savedPhone;if(q.status==='Borrador'){q.status='Enviada';save();renderQuotes()}if(!savedPhone){openModal(`<h2>Enviar cotización por WhatsApp</h2><p class=\"muted\">El cliente no tiene un teléfono registrado. Ingresa el número de WhatsApp para enviar esta cotización.</p><div class=\"field\"><label>Número de WhatsApp</label><input id=\"quote_wa_phone\" type=\"tel\" inputmode=\"numeric\" placeholder=\"3001234567\" autofocus></div><div style=\"display:flex;justify-content:flex-end;gap:10px;margin-top:15px\"><button class=\"btn\" onclick=\"closeModal()\">Cancelar</button><button class=\"btn primary\" onclick=\"sendQuoteWhatsAppFromModal('${q.id}')\">Abrir WhatsApp</button></div>`);return}let w=window.open('https://wa.me/'+savedPhone+'?text='+encodeURIComponent(quoteText(q)),'_blank');if(!w)return toast('El navegador bloqueó WhatsApp. Permite ventanas emergentes para VENTARA POS');toast('Cotización preparada para WhatsApp')}\nfunction sendQuoteWhatsAppFromModal(id){let q=quoteFor(id);if(!q)return;let phone=String(v('quote_wa_phone')||'').replace(/[^0-9]/g,'');if(phone.length===10)phone='57'+phone;if(phone.length<11)return toast('Ingresa un número de WhatsApp válido');let w=window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(quoteText(q)),'_blank');if(!w)return toast('El navegador bloqueó WhatsApp. Permite ventanas emergentes para VENTARA POS');closeModal();toast('Cotización preparada para WhatsApp')}"

if old not in html:
    raise SystemExit('No se encontró la función quoteWhatsApp actual')

path.write_text(html.replace(old, new, 1), encoding='utf-8')
print('WhatsApp quotation action fixed')
