from pathlib import Path
import re

path = Path('index.html')
html = path.read_text(encoding='utf-8')
css = '''<style id="ventara-quote-styles">
.quote-doc{max-width:900px;margin:auto;color:#172033;background:#fff}.quote-head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #0ea5e9;padding-bottom:16px}.quote-head>div:first-child{display:flex;gap:14px;align-items:center}.quote-logo{width:150px;height:auto;max-height:70px;object-fit:contain}.quote-head h1{margin:0 0 5px;font-size:22px}.quote-meta{text-align:right;display:flex;flex-direction:column;gap:4px}.quote-meta b{color:#0284c7;font-size:19px}.quote-meta strong{font-size:17px}.quote-client{margin:18px 0;padding:14px;background:#f1f5f9;border-radius:8px}.quote-table{width:100%;border-collapse:collapse}.quote-table th,.quote-table td{border-bottom:1px solid #dbe3ea;padding:9px;text-align:left}.quote-table th{background:#0f172a;color:#fff}.quote-table th:nth-child(n+2),.quote-table td:nth-child(n+2){text-align:right}.quote-table tfoot td{font-weight:700;font-size:16px;border-top:2px solid #0f172a}.quote-notes{margin-top:20px;padding:14px;border-left:4px solid #0ea5e9;background:#f8fafc}.quote-footer{margin-top:24px;padding-top:10px;border-top:1px solid #dbe3ea;color:#64748b;font-size:11px}
</style>'''
html = re.sub(r'<style id="ventara-quote-styles">.*?</style>\s*', '', html, flags=re.I|re.S)
html = html.replace('</head>', css + '\n</head>', 1)
path.write_text(html, encoding='utf-8')
print('Quotation preview styles applied')
