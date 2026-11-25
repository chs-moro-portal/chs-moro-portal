/* EduBridge Public QR Teacher ID — public fields only */
(function () {
  'use strict';
  if (window.__ebPublicQrId) return;
  window.__ebPublicQrId = true;

  const API = 'https://khyrdadphbyhypxjsgsa.supabase.co/rest/v1/rpc/search_public_teacher_directory';
  const KEY = 'sb_publishable_bVWItFd5UqS_HYJeh8YpbQ_5wbIr046';
  const BASE = 'https://chs-moro-portal.github.io/chs-moro-portal/';
  let found = [];

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pidOf = t => String(t.pid || t.PID || t.personal_id || t.employee_id || t.payroll || '').trim();
  const profileUrl = pid => BASE + '?teacherid=' + encodeURIComponent(pid);
  const qrUrl = url => 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=' + encodeURIComponent(url);

  async function lookup(term) {
    const r = await fetch(API, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ search_term: String(term) }),
      cache: 'no-store'
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Public directory request failed.');
    return Array.isArray(data) ? data : [];
  }

  function render(t, i) {
    const pid = pidOf(t), url = pid ? profileUrl(pid) : '';
    return '<article class="eb-qr-card"><div><h3>' + esc(t.teacher_name || 'Teacher') + '</h3>' +
      '<p><b>PID:</b> ' + esc(pid || 'Not available') + '</p>' +
      '<p><b>Designation:</b> ' + esc(t.designation || 'Not available') + '</p>' +
      '<p><b>School:</b> ' + esc(t.school_name || 'Not available') + '</p>' +
      '<p><b>SEMIS:</b> ' + esc(t.semis_id || '—') + '</p>' +
      (pid ? '<div class="eb-qr-actions"><button type="button" onclick="ebPrintTeacherId(' + i + ')">🪪 Print / Save ID</button></div>' : '') +
      '<p class="eb-qr-note">Public profile only. CNIC, DOB and contact details are hidden.</p></div>' +
      (url ? '<img alt="Teacher QR Code" src="' + esc(qrUrl(url)) + '">' : '') + '</article>';
  }

  window.ebPrintTeacherId = function (i) {
    const t = found[i], pid = t && pidOf(t);
    if (!t || !pid) return;
    const w = window.open('', '_blank', 'width=720,height=520');
    if (!w) {
      alert('Please allow pop-ups to print the Teacher ID card.');
      return;
    }
    const qr = qrUrl(profileUrl(pid));
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Teacher ID Card</title>' +
      '<style>@page{size:85.6mm 54mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:85.6mm;height:54mm;font-family:Arial,sans-serif;color:#17332a}' +
      '.card{width:85.6mm;height:54mm;position:relative;overflow:hidden;border:1.2mm solid #075c3b;border-radius:3mm;padding:3mm;background:linear-gradient(135deg,#fff 0%,#f0faf4 100%)}' +
      '.head{background:#075c3b;color:white;margin:-3mm -3mm 2.5mm;padding:2mm 3mm;font-size:11pt;font-weight:bold;letter-spacing:.4px}' +
      '.sub{font-size:6.5pt;color:#d8f5e5;font-weight:normal;margin-top:1mm}.body{display:flex;gap:3mm;align-items:center;height:35mm}.details{flex:1;min-width:0}.name{font-size:12pt;font-weight:bold;color:#075c3b;margin:0 0 2mm;overflow-wrap:anywhere}' +
      '.line{font-size:7.5pt;margin:1.2mm 0;line-height:1.15}.line b{color:#075c3b}.qr{width:28mm;height:28mm;object-fit:contain;background:#fff;padding:1mm;border:.3mm solid #cbded2;border-radius:1.5mm}' +
      '.foot{position:absolute;left:3mm;right:3mm;bottom:1.6mm;border-top:.25mm solid #cbded2;padding-top:1mm;font-size:5.8pt;color:#64748b;display:flex;justify-content:space-between}' +
      '@media screen{body{margin:18px auto;box-shadow:0 2px 18px #999}.card{print-color-adjust:exact;-webkit-print-color-adjust:exact}}' +
      '</style></head><body><main class="card"><header class="head">EDUBRIDGE · TEACHER ID<div class="sub">CLUSTER HEAD SCHOOL · TALUKA MORO</div></header>' +
      '<section class="body"><div class="details"><h2 class="name">' + esc(t.teacher_name || 'Teacher') + '</h2>' +
      '<p class="line"><b>PID:</b> ' + esc(pid) + '</p><p class="line"><b>Designation:</b> ' + esc(t.designation || 'Not available') +
      '</p><p class="line"><b>School:</b> ' + esc(t.school_name || 'Not available') + '</p><p class="line"><b>SEMIS:</b> ' + esc(t.semis_id || '—') +
      '</p></div><img class="qr" src="' + esc(qr) + '" alt="Teacher profile QR code"></section>' +
      '<footer class="foot"><span>Scan QR for public teacher profile</span><span>Developed by Faisal Jan</span></footer></main>' +
      '<script>window.onload=function(){var q=document.querySelector(".qr");if(q.complete){setTimeout(function(){window.focus();window.print()},350)}else{q.onload=function(){window.focus();window.print()};q.onerror=function(){window.focus();window.print()}}};<\/script></body></html>';
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  window.searchFrontTeacherComplete = async function () {
    const input = document.getElementById('frontTeacherSearchInput');
    const box = document.getElementById('frontTeacherSearchResult');
    if (!input || !box) return;
    const q = String(input.value || '').trim();
    if (!q) { box.textContent = 'Enter a PID or Teacher Name.'; return; }
    box.textContent = 'Searching central teacher directory…';
    try {
      found = await lookup(q);
      if (/^\d+$/.test(q)) found = found.map(t => Object.assign({}, t, { pid: pidOf(t) || q }));
      box.innerHTML = found.length ? found.map(render).join('') : 'No matching teacher found.';
    } catch (e) { box.textContent = 'Directory error: ' + e.message; }
  };

  async function openQrProfile() {
    const pid = new URLSearchParams(location.search).get('teacherid');
    if (!pid) return;
    const box = document.getElementById('frontTeacherSearchResult');
    if (!box) return;
    const input = document.getElementById('frontTeacherSearchInput');
    if (input) input.value = pid;
    box.textContent = 'Loading public Teacher ID…';
    try {
      found = await lookup(pid);
      found = found.map(t => Object.assign({}, t, { pid: pidOf(t) || pid }));
      const exact = found.filter(t => pidOf(t) === pid);
      if (exact.length) found = exact;
      box.innerHTML = found.length ? found.map(render).join('') : 'Teacher profile not found.';
    } catch (e) { box.textContent = 'Could not load profile: ' + e.message; }
  }

  const style = document.createElement('style');
  style.textContent = '.eb-qr-card{display:grid;grid-template-columns:1fr 140px;gap:12px;align-items:center;margin:12px 0;padding:14px;border:1px solid #cfe1d8;border-radius:14px;background:#fff}.eb-qr-card h3{margin:0 0 8px;color:#075c3b}.eb-qr-card p{margin:4px 0;color:#475569;font-size:13px}.eb-qr-card img{width:132px;height:132px;object-fit:contain}.eb-qr-actions{margin-top:9px}.eb-qr-note{font-size:11px!important;color:#64748b!important}@media(max-width:520px){.eb-qr-card{grid-template-columns:1fr 100px}.eb-qr-card img{width:96px;height:96px}}@media print{body *{visibility:hidden!important}.eb-qr-print,.eb-qr-print *{visibility:visible!important}.eb-qr-print{position:absolute!important;left:0!important;top:0!important;width:100%!important;box-shadow:none!important}}';
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openQrProfile, { once: true });
  else openQrProfile();
})();