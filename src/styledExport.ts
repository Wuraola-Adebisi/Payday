export type ExportRow = Record<string, string>;
export type ExportSection = {
  title: string;
  description?: string;
  rows?: ExportRow[];
  columns?: { key: string; label: string; align?: 'left' | 'right' }[];
  paragraphs?: string[];
};
export type StyledExport = {
  title: string;
  subtitle: string;
  type: string;
  currency?: string;
  generatedAt?: string;
  summary?: { label: string; value: string; detail?: string }[];
  sections: ExportSection[];
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char] as string));

export function openStyledExport(report: StyledExport) {
  const generated = report.generatedAt || new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const summary = (report.summary || []).map(item => `
    <article class="metric"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ''}</article>`).join('');
  const sections = report.sections.map(section => {
    const paragraphs = (section.paragraphs || []).map(p => `<p class="note">${escapeHtml(p)}</p>`).join('');
    const table = section.rows?.length && section.columns?.length ? `
      <div class="table-wrap"><table><thead><tr>${section.columns.map(col => `<th class="${col.align === 'right' ? 'right' : ''}">${escapeHtml(col.label)}</th>`).join('')}</tr></thead>
      <tbody>${section.rows.map(row => `<tr>${section.columns!.map(col => `<td class="${col.align === 'right' ? 'right' : ''}">${escapeHtml(row[col.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="empty">Nothing has been recorded here yet.</p>';
    return `<section class="section"><div class="section-head"><div><span class="eyebrow">SOMA REPORT</span><h2>${escapeHtml(section.title)}</h2>${section.description ? `<p>${escapeHtml(section.description)}</p>` : ''}</div></div>${paragraphs}${table}</section>`;
  }).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.title)} · Soma</title>
<style>
:root{color-scheme:light;--ink:#211b35;--muted:#77718d;--line:#e7e0f3;--violet:#6246ea;--lime:#d9ff55;--paper:#fffdfb}
*{box-sizing:border-box}html{background:#f1edfa}body{margin:0;padding:32px 18px;font-family:Arial,Helvetica,sans-serif;color:var(--ink);font-size:12px;line-height:1.55}.sheet{max-width:900px;margin:0 auto;background:white;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 18px 60px #211b3512}.masthead{padding:30px 36px 25px;background:var(--ink);color:white;position:relative;overflow:hidden}.masthead:after{content:"";position:absolute;width:210px;height:210px;border-radius:50%;background:var(--violet);right:-65px;top:-105px;opacity:.8}.brand{position:relative;z-index:1;display:flex;align-items:center;gap:10px;font-size:19px;font-weight:800;letter-spacing:-.04em}.mark{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:var(--lime);color:var(--ink);font-weight:900}.brand .dot{color:var(--lime)}.report-type{margin:27px 0 8px;color:var(--lime);font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;position:relative;z-index:1}.masthead h1{position:relative;z-index:1;font-size:clamp(27px,4vw,39px);letter-spacing:-.055em;line-height:1.08;margin:0;max-width:650px}.masthead .subtitle{position:relative;z-index:1;color:#d8d2eb;font-size:12px;max-width:600px;margin:11px 0 0}.report-meta{display:flex;gap:8px 20px;flex-wrap:wrap;margin-top:22px;position:relative;z-index:1;color:#bdb5d5;font-size:10px}.body{padding:28px 36px 24px}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:26px}.metric{border:1px solid var(--line);background:#fbfaff;border-radius:12px;padding:14px;min-width:0;break-inside:avoid}.metric span,.metric small{display:block;color:var(--muted);font-size:10px}.metric strong{display:block;font-size:clamp(16px,2.4vw,23px);letter-spacing:-.04em;margin:10px 0 5px;overflow-wrap:anywhere}.metric small{line-height:1.45}.section{margin:25px 0 0;break-inside:auto}.section-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:12px}.eyebrow{display:block;color:var(--violet);font-size:8px;font-weight:800;letter-spacing:.16em}.section h2{font-size:18px;letter-spacing:-.04em;margin:5px 0 3px}.section-head p{color:var(--muted);font-size:10px;margin:0}.table-wrap{width:100%;overflow:visible;border:1px solid var(--line);border-radius:10px}table{width:100%;border-collapse:collapse;font-size:10px}thead{display:table-header-group}th{text-align:left;text-transform:uppercase;letter-spacing:.07em;font-size:8px;color:#6e6685;background:#f3efff;padding:11px 10px;border-bottom:1px solid var(--line)}td{padding:11px 10px;border-bottom:1px solid #f0ecf7;vertical-align:top;overflow-wrap:anywhere}tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#fffefd}.right{text-align:right}.note{border-left:3px solid var(--lime);padding:10px 13px;background:#fbfaff;color:#514967;border-radius:0 8px 8px 0}.empty{color:var(--muted);padding:18px;border:1px dashed var(--line);border-radius:10px}.footer{padding:18px 36px;background:#f6f3fc;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:flex-end;color:var(--muted);font-size:9px}.footer strong{display:block;color:var(--ink);font-size:11px;margin-bottom:3px}.footer-note{max-width:400px;text-align:right}.toolbar{max-width:900px;margin:0 auto 14px;display:flex;justify-content:flex-end;gap:8px}.toolbar button,.toolbar a{border:0;border-radius:9px;background:var(--violet);color:white;padding:11px 14px;font-size:11px;font-weight:700;text-decoration:none;cursor:pointer}.toolbar .download{background:white;border:1px solid var(--line);color:var(--ink)}@media(max-width:600px){body{padding:12px 8px}.masthead{padding:23px 20px}.body{padding:22px 17px}.footer{padding:16px 18px;flex-direction:column;align-items:flex-start}.footer-note{text-align:left}.summary{grid-template-columns:1fr 1fr}.table-wrap{overflow-x:auto}table{min-width:500px}}@page{size:A4;margin:14mm}@media print{html,body{background:white!important;padding:0!important;margin:0!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none!important}.sheet{max-width:none;border:0;border-radius:0;box-shadow:none}.masthead,.metric,th,.footer{print-color-adjust:exact;-webkit-print-color-adjust:exact}.masthead{padding:22px 25px}.body{padding:20px 25px}.footer{padding:15px 25px}.section{break-inside:auto}.metric,.section-head,.note{break-inside:avoid}table{font-size:9px}th,td{padding:8px}.section h2{font-size:16px}a{color:inherit;text-decoration:none}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button><a class="download" href="#" id="download-report">Download styled report</a></div>
<main class="sheet"><header class="masthead"><div class="brand"><span class="mark">p.</span><span>soma<span class="dot">.</span></span></div><div class="report-type">${escapeHtml(report.type)}</div><h1>${escapeHtml(report.title)}</h1><p class="subtitle">${escapeHtml(report.subtitle)}</p><div class="report-meta"><span>Generated ${escapeHtml(generated)}</span><span>Currency: ${escapeHtml(report.currency || 'As shown in report')}</span><span>Your money, more clearly.</span></div></header><div class="body">${summary ? `<div class="summary">${summary}</div>` : ''}${sections}</div><footer class="footer"><div><strong>soma<span style="color:var(--violet)">.</span></strong><span>Personal money, made clearer.</span></div><div class="footer-note">Prepared from information recorded in Soma. This report is for personal record-keeping and is not a bank statement or financial advice.</div></footer></main>
<script>
const download = document.getElementById('download-report');
download.addEventListener('click', event => { event.preventDefault(); const clone = document.documentElement.cloneNode(true); clone.querySelector('.toolbar')?.remove(); clone.querySelector('#download-report')?.remove(); clone.querySelectorAll('script').forEach(node => node.remove()); const source = '<!doctype html>\\n' + clone.outerHTML; const blob = new Blob([source], {type:'text/html;charset=utf-8'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'soma-${escapeHtml(report.type.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}-${new Date().toISOString().slice(0,10)}.html'; link.click(); URL.revokeObjectURL(url); });
</script></body></html>`;
  const popup = window.open('', '_blank');
  if (!popup) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soma-report-${new Date().toISOString().slice(0,10)}.html`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
