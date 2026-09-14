from pathlib import Path
import re

path = Path('index.html')
html = path.read_text(encoding='utf-8')

html = html.replace(
    "q.notes.replace(/\n/g,'<br>')",
    "q.notes.replaceAll(String.fromCharCode(10),'<br>')",
)

html = html.replace(
    "String(c.phone).replace(/\\\\D/g,'')",
    "String(c.phone).replace(/[^0-9]/g,'')",
)

new_text = """function quoteText(q){let c=db.clients.find(x=>x.id===q.clientId);let lines=['COTIZACIÓN '+q.number,db.settings.business||'VENTARA POS','Cliente: '+(c?.name||'Consumidor final'),'Fecha: '+q.date,'Vigencia: '+(q.validity||'—'),'',(q.items||[]).map(i=>'• '+i.name+' x '+i.qty+': '+money(i.qty*i.price)).join(String.fromCharCode(10)),'','TOTAL: '+money(q.total)];if(q.notes)lines.push('',q.notes);return lines.join(String.fromCharCode(10))}\nfunction copyQuoteText"""
html, count = re.subn(r'function quoteText\(q\).*?function copyQuoteText', new_text, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit('No se encontró quoteText para reparar')

html = re.sub(r'<\\\\+/script>', r'<\/script>', html)

clients_start = html.index('function renderClients(){')
clients_end = html.index('function openClientModal', clients_start)
clients_fn = """function renderClients(){document.getElementById('clients').innerHTML=pageHead('Clientes','Clientes, línea de crédito y condiciones de pago',`<button class=\"btn primary\" onclick=\"openClientModal()\">+ Cliente</button>`)+`<div class=\"card\">${table(['Cliente','Documento','Teléfono','Crédito','Saldo','Estado','Acciones'],db.clients.map(c=>`<tr><td>${c.name}</td><td>${c.doc}</td><td>${c.phone}</td><td>${money(c.credit)}</td><td>${money(c.balance)}</td><td>${c.balance>0?'<span class=\"badge warn\">Pendiente</span>':'<span class=\"badge green\">Al día</span>'}</td><td><button class=\"btn sm\" onclick=\"openClientModal('${c.id}')\">Editar</button>${c.id!=='c1'&&String(c.name||'').trim().toLowerCase()!=='consumidor final'?` <button class=\"btn sm danger\" onclick=\"deleteClient('${c.id}')\">Eliminar</button>`:''}</td></tr>`).join(''))}</div>`}\n"""
html = html[:clients_start] + clients_fn + html[clients_end:]

recv_start = html.index('function renderReceivables(){')
recv_end = html.index('function openPaymentModal', recv_start)
recv_fn = """function renderReceivables(){let debtors=db.clients.filter(c=>c.balance>0);let total=debtors.reduce((a,c)=>a+c.balance,0);document.getElementById('receivables').innerHTML=pageHead('Fiados / Crédito','La libreta de fiados digital de VENTARA',`<button class=\"btn primary\" onclick=\"openClientModal()\">+ Nueva línea de crédito</button><button class=\"btn\" onclick=\"exportCreditReport()\">Exportar cartera</button>`)+`<div class=\"grid cols3\"><div class=\"card kpi\"><div class=\"label\">Total fiado</div><div class=\"value\">${money(total)}</div></div><div class=\"card kpi\"><div class=\"label\">Clientes con saldo</div><div class=\"value\">${debtors.length}</div></div><div class=\"card kpi\"><div class=\"label\">Líneas habilitadas</div><div class=\"value\">${db.clients.filter(c=>c.creditEnabled).length}</div></div></div><div class=\"card\" style=\"margin-top:16px\">${table(['Cliente','Límite','Saldo','Disponible','Plazo','Acción'],db.clients.filter(c=>c.creditEnabled||c.balance>0).map(c=>`<tr><td><b>${c.name}</b><br><small class=\"muted\">${c.doc||''}</small></td><td>${money(c.credit)}</td><td>${money(c.balance)}</td><td>${money(Math.max(0,(c.credit||0)-(c.balance||0)))}</td><td>${c.creditDays??0} días</td><td><button class=\"btn sm\" onclick=\"openPaymentModal('${c.id}')\">Abonar</button> <button class=\"btn sm\" onclick=\"openClientModal('${c.id}')\">Editar</button> <button class=\"btn sm danger\" onclick=\"deleteCreditLine('${c.id}')\">Eliminar</button></td></tr>`).join(''),'No hay líneas de crédito configuradas')}</div>`}\n"""
html = html[:recv_start] + recv_fn + html[recv_end:]

helpers = """function deleteClient(id){let c=db.clients.find(x=>x.id===id);if(!c)return;if(c.id==='c1'||String(c.name||'').trim().toLowerCase()==='consumidor final')return toast('Consumidor final no se puede eliminar');if(!confirm('¿Estás seguro de eliminar este cliente?'))return;db.clients=db.clients.filter(x=>x.id!==id);if(posClient===id)posClient='c1';save();renderClients();toast('Cliente eliminado')}\nfunction deleteCreditLine(id){let c=db.clients.find(x=>x.id===id);if(!c)return;let pending=Number(c.balance||0);let message=pending>0?'Este cliente tiene saldo pendiente de '+money(pending)+'. Al eliminar la línea también se eliminará el cliente y el saldo registrado. ¿Deseas continuar?':'¿Eliminar la línea de crédito correspondiente a este cliente?';if(!confirm(message))return;db.clients=db.clients.filter(x=>x.id!==id);if(posClient===id)posClient='c1';save();renderReceivables();toast('Línea de crédito eliminada')}\n"""
html = html.replace(helpers, '')
insert_at = html.index('function renderReceivables(){')
html = html[:insert_at] + helpers + html[insert_at:]

path.write_text(html, encoding='utf-8')
print('Quote JavaScript escaping and client deletion UI repaired idempotently')
