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
    if (!pid) return;
    const card = document.createElement('div');
    card.className = 'eb-qr-card eb-qr-print';
    card.innerHTML = '<div><b style="color:#075c3b">EDUBRIDGE — DIGITAL TEACHER ID</b><h2>' +
      esc(t.teacher_name || 'Teacher') + '</h2><p><b>PID:</b> ' + esc(pid) +
      '</p><p><b>Designation:</b> ' + esc(t.designation || 'Not available') +
      '</p><p><b>School:</b> ' + esc(t.school_name || 'Not available') +
      '</p><p><b>SEMIS:</b> ' + esc(t.semis_id || '—') +
      '</p><small>Public basic profile • Taluka Moro</small></div><img alt="QR Code" src="' +
      esc(qrUrl(profileUrl(pid))) + '">';
    document.body.appendChild(card);
    setTimeout(() => { window.print(); card.remove(); }, 400);
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
      if (/^\\d+$/.test(q)) found = found.map(t => Object.assign({}, t, { pid: pidOf(t) || q }));
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