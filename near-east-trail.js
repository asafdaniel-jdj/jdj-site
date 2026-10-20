/* JDJ-78 — Near East Trail public client. Preview-only branch 1.029.
 * RLS-backed TEST content. No browser credentials beyond the publishable key.
 * No POST/PUT/PATCH/DELETE and no production analytics.
 */
(() => {
  'use strict';
  const ENV = window.JDJ_ENV || {};
  const root = document.getElementById('trailContent');
  const status = document.getElementById('loadStatus');
  let client, page, segments = [], active = null, currentTab = 'about', leaflet = null;
  const $ = id => document.getElementById(id);
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';
    try {
      const u = new URL(raw, location.origin);
      if (!['https:', 'http:'].includes(u.protocol)) return '';
      if (u.protocol === 'http:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return '';
      return u.href;
    } catch (_) { return ''; }
  }
  const list = x => Array.isArray(x) ? x : [];
  const plainText = (s, fallback = '') => String(s || fallback);
  const errorText = e => String(e && e.message || e || 'שגיאה לא ידועה');
  const mediaUrl = x => validUrl(x?.url || x);
  function displayStatus(message, isError = false) {
    status.classList.remove('hide');
    status.textContent = message;
    status.classList.toggle('text-rose-700', isError);
  }
  function assignText(id, content) {
    const node = $(id); if (node) node.textContent = plainText(content);
  }
  function applyPage(p) {
    assignText('pageTitle', p.title);
    assignText('pageSubtitle', p.subtitle);
    assignText('pageIntro', p.intro);
    assignText('authorName', p.author_name);
    assignText('authorRole', p.author_role);
    assignText('authorBio', p.author_bio);
    if (validUrl(p.hero_desktop_url)) $('heroImg').src = validUrl(p.hero_desktop_url);
    if (validUrl(p.illustrated_map_url)) {
      $('mapIllustrationImage').src = validUrl(p.illustrated_map_url);
      $('mapIllustrationImage').classList.remove('hide');
      $('mapDrawing').classList.add('hide');
    }
    if (validUrl(p.author_photo_url)) {
      $('authorPhoto').src = validUrl(p.author_photo_url);
      $('authorPhotoBox').classList.remove('hidden');
    }
    const wa = String(p.author_whatsapp || '').replace(/\D/g, '');
    $('authorWhatsapp').href = wa ? 'https://wa.me/' + wa : '#';
    $('authorWhatsapp').classList.toggle('hide', !wa);
    document.title = plainText(p.seo_title, p.title);
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = plainText(p.seo_description, p.intro);
    // The Preview HTML always remains noindex. Publication/SEO integration is release-gated.
  }
  function drawCards() {
    $('segmentCards').innerHTML = segments.map(s => {
      const n = Number(s.segment_number);
      const tags = list(s.tags).slice(0, 3);
      const stops = list(s.stops);
      return '<article class="surface seg overflow-hidden p-5 md:p-6" data-segment="' + n + '">' +
        '<div class="flex items-start justify-between gap-2"><div class="segnum">' + n + '</div><span class="rounded-xl bg-indigo-50 text-indigo-800 text-xs font-black px-3 py-2">' + safe(s.length_km || '—') + ' ק״מ</span></div>' +
        '<div class="text-indigo-600 font-black text-xs mt-1">מקטע ' + n + ' מתוך שישה</div>' +
        '<h3 class="font-black text-xl mt-1">' + safe(s.title) + '</h3>' +
        '<p class="text-slate-500 text-xs mt-1">' + safe(s.region) + '</p>' +
        '<p class="text-slate-600 text-sm leading-relaxed my-3">' + safe(s.short_description) + '</p>' +
        '<div class="flex flex-wrap gap-1.5 mb-4">' + tags.map(t => '<span class="detail-pill">' + safe(t) + '</span>').join('') + '</div>' +
        '<div class="flex flex-wrap gap-2"><button class="btn btn-lite flex-1" data-action="stops" data-id="' + n + '" aria-expanded="false">הצגת ' + stops.length + ' תחנות</button>' +
        '<button class="btn flex-1" data-action="open" data-id="' + n + '">למסלול המלא</button></div>' +
        '<div class="hide pt-4" data-stops-container="' + n + '">' + stopMarkup(stops) + '</div>' +
        '</article>';
    }).join('');
    $('allGpxButton').disabled = segments.length !== 6 || segments.some(s => !validUrl(s.gpx_url));
    $('segmentCards').querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
      const n = Number(btn.dataset.id);
      if (btn.dataset.action === 'stops') toggleStops(n, btn);
      else openSegment(n);
    }));
  }
  function stopMarkup(stops) {
    if (!stops.length) return '<p class="text-slate-500 text-sm">עדיין לא הוזנו תחנות למקטע הזה.</p>';
    return '<ol class="stops-list">' + stops.map((x, i) => '<li><span>' + (i + 1) + '.</span><span class="!text-slate-700 !font-medium">' + safe(typeof x === 'string' ? x : x.name) + '</span></li>').join('') + '</ol>';
  }
  function toggleStops(n, btn) {
    const div = $('segmentCards').querySelector('[data-stops-container="' + n + '"]');
    const showing = div.classList.toggle('hide');
    btn.setAttribute('aria-expanded', String(!showing));
    btn.textContent = showing ? 'הצגת תחנות' : 'הסתרת תחנות';
  }
  function selectTab(tab) {
    if (!active) return;
    currentTab = tab;
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const panel = $('detailPanel');
    if (leaflet) { leaflet.remove(); leaflet = null; }
    if (tab === 'about') {
      const text = plainText(active.full_description, active.short_description);
      const notes = active.operational_notes ? '<h4 class="font-black mt-5 mb-2">מידע למטייל</h4><p class="text-slate-600 whitespace-pre-line">' + safe(active.operational_notes) + '</p>' : '';
      panel.innerHTML = '<p class="text-slate-600 leading-loose whitespace-pre-line">' + safe(text) + '</p>' +
        '<div class="flex flex-wrap gap-2 mt-4">' +
        (active.difficulty ? '<span class="detail-pill">עבירות: ' + safe(active.difficulty) + '</span>' : '') +
        (active.duration_text ? '<span class="detail-pill">משך: ' + safe(active.duration_text) + '</span>' : '') +
        '</div>' + notes + '<h4 class="font-black mt-5 mb-3">תחנות לאורך הדרך</h4>' + stopMarkup(list(active.stops));
    } else if (tab === 'gallery') {
      const media = list(active.media).filter(x => mediaUrl(x));
      panel.innerHTML = media.length ? '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 trail-media">' +
        media.map(x => {
          const url = mediaUrl(x);
          const type = typeof x === 'object' ? x.type : '';
          return type === 'video' ? '<video controls preload="metadata" class="w-full rounded-xl" src="' + safe(url) + '"></video>' :
            '<a target="_blank" rel="noopener" href="' + safe(url) + '"><img loading="lazy" alt="' + safe(x.alt || 'גלריית השביל') + '" src="' + safe(url) + '"></a>';
        }).join('') + '</div>' : '<p class="text-slate-500 p-5 bg-slate-50 rounded-xl">טרם הועלו תמונות או סרטונים למקטע.</p>';
    } else {
      const gpx = validUrl(active.gpx_url);
      if (!gpx) {
        panel.innerHTML = '<p class="text-slate-500 p-5 bg-slate-50 rounded-xl">מפת הניווט תופיע לאחר העלאת קובץ GPX מאומת דרך מנהל האתר.</p>';
      } else {
        panel.innerHTML = '<div id="trailMap" role="region" aria-label="מפת GPX של המקטע"></div><p id="mapStatus" class="text-xs text-slate-500 mt-2" role="status">טוענים את תוואי המסלול…</p>';
        setTimeout(() => drawMap(gpx), 80);
      }
    }
  }
  async function drawMap(url) {
    const st = $('mapStatus');
    if (!st) return;
    if (typeof L === 'undefined') { st.textContent = 'רכיב המפה אינו זמין כרגע.'; return; }
    try {
      const response = await fetch(url, {credentials:'omit'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.text();
      if (data.length > 12_000_000) throw new Error('קובץ GPX גדול מדי');
      const xml = new DOMParser().parseFromString(data, 'application/xml');
      if (xml.querySelector('parsererror')) throw new Error('מבנה GPX אינו תקין');
      const els = [...xml.querySelectorAll('trkpt, rtept')];
      const coords = els.map(el => [Number(el.getAttribute('lat')), Number(el.getAttribute('lon'))])
        .filter(([lat,lon]) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
      if (!coords.length) throw new Error('לא נמצאו נקודות מסלול בקובץ');
      const map = L.map('trailMap', {scrollWheelZoom:false}).setView(coords[0], 11);
      leaflet = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17, attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      const path = L.polyline(coords, {color:'#4f46e5',weight:5}).addTo(map);
      map.fitBounds(path.getBounds(),{padding:[18,18]});
      st.textContent = 'תוואי ניווט מקובץ GPX. אין להסתמך על המפה ללא בדיקת תנאי השטח.';
      setTimeout(() => map.invalidateSize(), 100);
    } catch(e) { if (st) st.textContent = 'לא ניתן להציג את המפה: ' + errorText(e); }
  }
  function openSegment(n) {
    const found = segments.find(s => Number(s.segment_number) === n);
    if (!found) return;
    active = found;
    $('segmentDetails').classList.remove('hide');
    assignText('detailNumber','מקטע ' + n + ' מתוך שישה');
    assignText('detailTitle',found.title);
    assignText('detailMeta', [found.region, found.length_km ? found.length_km + ' ק״מ' : ''].filter(Boolean).join(' · '));
    $('segmentGpxBtn').disabled = !validUrl(found.gpx_url);
    $('segmentOffroadBtn').disabled = !validUrl(found.offroad_url);
    selectTab('about');
    history.replaceState(null,'',location.pathname + location.search + '#segment=' + n);
    $('segmentDetails').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function closeSegment() {
    active = null;
    $('segmentDetails').classList.add('hide');
    if (leaflet) { leaflet.remove(); leaflet = null; }
    history.replaceState(null,'',location.pathname + location.search);
  }
  let pendingAction = null;
  async function openGate(action) {
    pendingAction = action;
    $('gateText').textContent = 'לפני היציאה לשטח יש לבדוק מזג אוויר, שטחי אש, הגבלות תנועה, שערים ודרגת עבירות. טעינת קובץ ניווט אינה אישור לכניסה לשטח.';
    try {
      const {data,error} = await client.from('pages').select('warning_text').eq('id','disclaimer').maybeSingle();
      if (!error && data?.warning_text) $('gateText').textContent = data.warning_text;
    } catch(_) {}
    $('gateOverlay').classList.add('active');
    $('gateConfirm').focus();
  }
  function closeGate() { pendingAction = null; $('gateOverlay').classList.remove('active'); }
  async function downloadSingle(s) {
    const url = validUrl(s?.gpx_url); if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = 'near-east-trail-segment-' + s.segment_number + '.gpx';
    a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  }
  async function downloadAll() {
    if (segments.length !== 6 || segments.some(s => !validUrl(s.gpx_url))) return;
    if (typeof JSZip === 'undefined') throw new Error('רכיב הורדת ZIP לא נטען');
    const zip = new JSZip();
    for (const s of segments) {
      const response = await fetch(validUrl(s.gpx_url), {credentials:'omit'});
      if (!response.ok) throw new Error('לא ניתן לטעון GPX למקטע ' + s.segment_number);
      const blob = await response.blob();
      if (blob.size > 12_000_000) throw new Error('GPX גדול מדי למקטע ' + s.segment_number);
      zip.file('segment-' + s.segment_number + '.gpx', blob);
    }
    const output = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'), url = URL.createObjectURL(output);
    a.href = url; a.download = 'near-east-trail-navigation.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function executePending() {
    const action = pendingAction; closeGate();
    if (!action) return;
    try {
      if (action.type === 'gpx') await downloadSingle(action.segment);
      if (action.type === 'zip') await downloadAll();
      if (action.type === 'offroad') {
        const url = validUrl(action.segment?.offroad_url);
        if (url) window.open(url,'_blank','noopener,noreferrer');
      }
    } catch(e) { alert('לא ניתן לבצע את הפעולה: ' + errorText(e)); }
  }
  async function share() {
    if (!active) return;
    const url = location.href;
    if (navigator.share) { try { await navigator.share({title:active.title,url}); return; } catch(_) {} }
    try { await navigator.clipboard.writeText(url); alert('הקישור למקטע הועתק'); }
    catch(_) { window.prompt('העתק את הקישור:',url); }
  }
  async function boot() {
    try {
      if (!ENV.supabaseUrl || !ENV.supabaseKey || !window.supabase) throw new Error('הגדרות האתר לא נטענו');
      if (ENV.environment === 'TEST' && !ENV.supabaseUrl.includes('sdekeyakrtdwmykvpbwq')) throw new Error('חיבור TEST אינו מכוון למסד TEST. הפעולה נעצרה.');
      client = window.supabase.createClient(ENV.supabaseUrl,ENV.supabaseKey);
      const {data:pageData,error:pageError} = await client.from('near_east_trail_pages').select('*').eq('id','main').eq('is_published',true).maybeSingle();
      if (pageError) throw pageError;
      if (!pageData) { displayStatus('דף שביל המזרח הקרוב אינו מפורסם בסביבה זו.'); return; }
      const {data:segData,error:segError} = await client.from('near_east_trail_segments').select('*').eq('is_visible',true).order('sort_order',{ascending:true});
      if (segError) throw segError;
      page = pageData; segments = segData || [];
      applyPage(page); drawCards();
      status.classList.add('hide'); root.classList.remove('hide');
      const match = location.hash.match(/^#segment=([1-6])$/);
      if (match) openSegment(Number(match[1]));
    } catch(e) { displayStatus('לא ניתן לטעון את השביל: ' + errorText(e),true); }
  }
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
  $('closeDetails').addEventListener('click', closeSegment);
  $('segmentGpxBtn').addEventListener('click', () => active && openGate({type:'gpx',segment:active}));
  $('segmentOffroadBtn').addEventListener('click', () => active && openGate({type:'offroad',segment:active}));
  $('allGpxButton').addEventListener('click', () => openGate({type:'zip'}));
  $('shareSegment').addEventListener('click', share);
  $('gateConfirm').addEventListener('click', executePending);
  $('gateCancel').addEventListener('click', closeGate);
  window.addEventListener('keydown', e => { if(e.key === 'Escape' && $('gateOverlay').classList.contains('active')) closeGate(); });
  window.addEventListener('hashchange', () => {const match=location.hash.match(/^#segment=([1-6])$/); if(match) openSegment(Number(match[1]));});
  boot();
})();