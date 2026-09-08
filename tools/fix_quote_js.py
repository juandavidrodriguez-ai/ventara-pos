from pathlib import Path
import re

path = Path('index.html')
html = path.read_text(encoding='utf-8')

# Repair the note line-break conversion without relying on escaped regex syntax.
html = html.replace(
    "q.notes.replace(/\n/g,'<br>')",
    "q.notes.replaceAll(String.fromCharCode(10),'<br>')",
)

# Repair the WhatsApp phone normalization so Colombian numbers are handled correctly.
html = html.replace(
    "String(c.phone).replace(/\\\\D/g,'')",
    "String(c.phone).replace(/[^0-9]/g,'')",
)

# The quote text is intentionally built as an array to avoid fragile template-literal line escapes.
new_text = """function quoteText(q){let c=db.clients.find(x=>x.id===q.clientId);let lines=['COTIZACIÓN '+q.number,db.settings.business||'VENTARA POS','Cliente: '+(c?.name||'Consumidor final'),'Fecha: '+q.date,'Vigencia: '+(q.validity||'—'),'',(q.items||[]).map(i=>'• '+i.name+' x '+i.qty+': '+money(i.qty*i.price)).join(String.fromCharCode(10)),'','TOTAL: '+money(q.total)];if(q.notes)lines.push('',q.notes);return lines.join(String.fromCharCode(10))}\nfunction copyQuoteText"""
html, count = re.subn(r'function quoteText\(q\).*?function copyQuoteText', new_text, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit('No se encontró quoteText para reparar')

# Ensure the print popup contains a safe escaped closing script tag.
html = re.sub(r'<\\\\+/script>', r'<\/script>', html)

path.write_text(html, encoding='utf-8')
print('Quote JavaScript escaping repaired')
