/* JDJ-78 — Near East Trail public client. Preview-only branch 1.029.
 * RLS-backed TEST content. No browser credentials beyond the publishable key.
 * No POST/PUT/PATCH/DELETE and no production analytics.
 */
(() => {
  'use strict';
  const ENV = window.JDJ_ENV || {};
  const root = document.getElementById('trailContent');
  const status = document.getElementById('loadStatus');
  let client, page, segments = [];
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
    assignText('pageTitle', [p.title,p.subtitle].filter(Boolean).join(': '));
    assignText('storyHeading',p.story_heading||'הדרך שמחברת את המרחב');
    assignText('storySubtitle',p.story_subtitle||'שישה מקטעים מצפון הבקעה ועד ספר מדבר יהודה');
    assignText('pageIntro', p.intro);
    assignText('authorName', p.author_name);
    assignText('authorRole', p.author_role);
    assignText('authorBio', p.author_bio);
    const og = validUrl(p.og_image_url) || validUrl(p.hero_desktop_url) || 'https://jdj.co.il/og-image.jpg';
    $('trailOgTitle').content = plainText(p.seo_title,p.title);
    $('trailOgDesc').content = plainText(p.seo_description,p.intro);
    $('trailOgImage').content = og;
    const authorImageUrl = validUrl(p.author_photo_url);
    $('authorPhoto').classList.toggle('hide', !authorImageUrl);
    $('authorPhotoPlaceholder').classList.toggle('hide', !!authorImageUrl);
    if (authorImageUrl) $('authorPhoto').src = authorImageUrl;
    assignText('groupTitle',p.group_cta_title || 'הצטרפו לקבוצת הטיולים בשומרון');
    assignText('groupSubtitle',p.group_cta_subtitle || 'מסלולי ג׳יפים, טיולים ועדכונים מהשטח.');
    const inviteUrl = validUrl(p.group_invite_url);
    const groupLink = $('joinGroupLink');
    if (inviteUrl && new URL(inviteUrl).hostname === 'chat.whatsapp.com') {
      groupLink.href=inviteUrl;groupLink.textContent='הצטרפו לקבוצה';groupLink.removeAttribute('aria-disabled');groupLink.classList.remove('opacity-50','pointer-events-none');
    } else {
      groupLink.removeAttribute('href');groupLink.textContent='הצטרפו לקבוצה';groupLink.setAttribute('aria-disabled','true');groupLink.classList.add('opacity-50','pointer-events-none');
    }
    document.title = plainText(p.seo_title, p.title);
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = plainText(p.seo_description, p.intro);
    const recs = [
      {rows:list(p.lodging_stops),box:'lodgingBox',target:'lodgingList',icon:'fa-solid fa-bed'},
      {rows:list(p.food_stops),box:'foodBox',target:'foodList',icon:'fa-solid fa-mug-hot'}
    ];
    recs.forEach(r => {
      $(r.box).classList.toggle('hide',!r.rows.length);
      $(r.target).innerHTML = r.rows.map(item => {
        const name=String(typeof item==='string' ? item : (item?.name||'')).trim();
        if (!name) return '';
        const explicit=validUrl(typeof item==='object'?item.url:'');
        const destination=explicit || ('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name));
        const hint=explicit?'פתיחת הקישור':'חיפוש המקום במפות Google';
        return '<li class="min-w-0"><a target="_blank" rel="noopener noreferrer" title="'+safe(hint)+'" href="'+safe(destination)+'" class="flex gap-2 items-center rounded-lg hover:bg-indigo-50 hover:text-indigo-800 py-1.5 px-1 transition"><i class="'+r.icon+' text-indigo-500 w-4 shrink-0" aria-hidden="true"></i><span>'+safe(name)+'</span><i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400 mr-auto" aria-hidden="true"></i></a></li>';
      }).join('');
    });
    $('travelNotesBox').classList.toggle('hide',!p.travel_notes);
    assignText('travelNotesText',p.travel_notes);
    $('trailRecommendations').classList.toggle('hide',!recs.some(r => r.rows.length) && !p.travel_notes);
    // The Preview HTML always remains noindex. Publication/SEO integration is release-gated.
  }

  function renderTrailGallery() {
    const gallery=window.JDJMediaGallery;
    if (!gallery) { console.warn('JDJMediaGallery is unavailable'); return; }
    const pageMedia=list(page?.gallery_media).filter(m => !!mediaUrl(m));
    // Initial preview uses existing local route photography until the dedicated trail gallery is populated.
    const fallback=segments.map((segment,i)=>({type:'image',url:segmentCoverUrl(segment),sort_order:(i+1)*10})).filter(m=>m.url);
    const media=pageMedia.length ? pageMedia : fallback;
    const main=validUrl(page?.hero_desktop_url);
    gallery.render({
      container:$('#trailGallery'),
      galleryId:'nearEastTrailGallery',
      mainImage:main,
      media,
      includeMainInMosaic:true,
      includeMainInViewer:true,
      maxVisible:5,
      altBase:'תמונות מאזור שביל המזרח הקרוב',
      title:'גלריית שביל המזרח הקרוב'
    });
  }
  function segmentCoverUrl(segment) {
    const primary = validUrl(segment.hero_image_url);
    if (primary) return primary;
    const image = list(segment.media).find(m => (typeof m === 'string' || m.type === 'image') && mediaUrl(m));
    return image ? mediaUrl(image) : '';
  }
  function drawCards() {
    $('segmentCards').innerHTML = segments.map(s => {
      const n=Number(s.segment_number),stops=list(s.stops),cover=segmentCoverUrl(s);
      const hasOffroad=!!validUrl(s.offroad_url);
      const region=plainText(s.region,'השביל');
      const image=cover
        ? '<img src="'+safe(cover)+'" alt="תמונת מקטע '+n+'" loading="lazy" class="segment-cover" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'segment-cover-placeholder\');this.parentElement.textContent=\'תמונת שער תעודכן בקרוב\'">'
        : '<div class="segment-cover-placeholder">תמונת שער תעודכן בקרוב</div>';
      return '<article class="surface seg flex flex-col" data-segment="'+n+'">' +
        '<div class="segment-cover-shell">'+image+'</div>' +
        '<div class="segment-body flex flex-col flex-1">' +
        '<div class="flex justify-between gap-2 items-center mb-3"><span class="card-region">'+safe(region)+'</span><span class="text-xs font-black text-indigo-400">מקטע '+n+' / 6</span></div>' +
        '<h3 class="font-black text-xl md:text-[22px] leading-snug text-slate-950 mb-2">'+safe(s.title)+'</h3>' +
        '<p class="card-text text-slate-600 text-sm md:text-base leading-relaxed mb-3">'+safe(s.short_description)+'</p>' +
        '<div class="flex gap-3 flex-wrap items-center text-xs font-bold text-slate-500 mt-auto mb-4">' +
        '<span><i class="fa-solid fa-ruler-horizontal ml-1" aria-hidden="true"></i>'+safe(s.length_km || '—')+' ק״מ</span>' +
        '<details class="group"><summary class="cursor-pointer hover:text-indigo-700"> '+stops.length+' תחנות בדרך <i class="fa-solid fa-chevron-down text-[9px] mr-1" aria-hidden="true"></i></summary><div class="mt-2 rounded-xl bg-slate-50 p-3 max-h-52 overflow-auto text-right min-w-48">'+stopMarkup(stops)+'</div></details>' +
        '</div><button class="card-cta" data-action="offroad" data-id="'+n+'"'+(hasOffroad?'':' disabled title="נדרש קישור אופרוד במערכת הניהול"')+'><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>למסלול המלא באופרוד</button>' +
        '</div></article>';
    }).join('');
    $('allGpxButton').disabled = segments.length!==6 || segments.some(s=>!validUrl(s.gpx_url));
    $('segmentCards').querySelectorAll('[data-action="offroad"]').forEach(btn=>btn.addEventListener('click',()=>{
      const segment=segments.find(s=>Number(s.segment_number)===Number(btn.dataset.id));
      if(segment && validUrl(segment.offroad_url))openGate({type:'offroad',segment});
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
    const response = await fetch(url, {credentials:'omit'});
    if (!response.ok) throw new Error('קובץ GPX אינו זמין (HTTP ' + response.status + ')');
    const blob = await response.blob();
    if (blob.size > 12_000_000) throw new Error('קובץ GPX גדול מדי');
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl; a.download = 'near-east-trail-segment-' + s.segment_number + '.gpx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl),30000);
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
  function shareWholeTrail() {
    const url = location.origin + location.pathname;
    const text = 'שביל המזרח הקרוב | שישה מקטעי ג׳יפים, כ־340 ק״מ' + '\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text),'_blank','noopener,noreferrer');
  }
  let wholeTrailMap = null;
  function closeWholeTrailMap() {
    $('wholeTrailMapOverlay').classList.add('hidden');
    $('wholeTrailMapOverlay').classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
    if (wholeTrailMap) { wholeTrailMap.remove(); wholeTrailMap=null; }
    $('wholeTrailMapButton').focus();
  }
  async function openWholeTrailMap() {
    if (typeof L === 'undefined') { alert('רכיב המפה עדיין לא נטען, נסה שוב בעוד רגע.'); return; }
    const overlay=$('wholeTrailMapOverlay'),status=$('wholeTrailMapStatus');
    overlay.classList.remove('hidden');overlay.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    $('closeWholeTrailMap').focus();
    const validSegments=segments.filter(s=>validUrl(s.gpx_url));
    status.textContent='טוענים מפה ותוואים...';
    wholeTrailMap=L.map('wholeTrailMapCanvas',{scrollWheelZoom:false}).setView([32.04,35.35],10);
    const topo=L.tileLayer('https://israelhiking.osm.org.il/Hebrew/Tiles/{z}/{x}/{y}.png',{maxZoom:16,minZoom:7,attribution:'Israel Hiking Map'});
    const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:'Esri'});
    topo.addTo(wholeTrailMap);
    L.control.layers({'מפת סימון שבילים':topo,'תצלום לוויין':satellite},null,{position:'topright'}).addTo(wholeTrailMap);
    const allTracks=L.featureGroup().addTo(wholeTrailMap),palette=['#4338ca','#0f766e','#b45309','#be185d','#1d4ed8','#7c3aed'];
    let loaded=0;
    for(const s of validSegments){
      if(!wholeTrailMap) return;
      try {
        const r=await fetch(validUrl(s.gpx_url),{credentials:'omit'});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const body=await r.text();
        if(body.length>12000000)throw Error('GPX גדול מדי');
        const xml=new DOMParser().parseFromString(body,'application/xml');
        if(xml.querySelector('parsererror'))throw Error('GPX אינו תקין');
        let painted=0;
        const series=[...xml.querySelectorAll('trkseg,rte')];
        if(!series.length)series.push(xml.documentElement);
        for(const part of series){
          const coords=[...part.querySelectorAll('trkpt,rtept')]
            .map(pt=>[Number(pt.getAttribute('lat')),Number(pt.getAttribute('lon'))])
            .filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180);
          if(coords.length>1){
            L.polyline(coords,{color:palette[(Number(s.segment_number)-1)%palette.length],weight:4,opacity:.9})
              .bindPopup('מקטע '+s.segment_number+': '+safe(s.title)).addTo(allTracks);
            painted++;
          }
        }
        if(painted)loaded++;
      } catch(e) { console.warn('Trail segment map unavailable',s.segment_number,e); }
    }
    if(!wholeTrailMap)return;
    if(loaded)wholeTrailMap.fitBounds(allTracks.getBounds(),{padding:[30,30]});
    status.textContent=loaded===6?'כל ששת המקטעים מוצגים לפי קובצי GPX. יש לבדוק הגבלות שטח לפני יציאה.':
      'מוצגים '+loaded+' מתוך 6 מקטעים. תוואי מלא יהיה זמין לאחר העלאת קובצי GPX תקינים לכל השישה.';
    wholeTrailMap.invalidateSize();
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
      applyPage(page); drawCards(); renderTrailGallery();
      status.classList.add('hide'); root.classList.remove('hide');
      $('wholeTrailMapButton').disabled=false;
    } catch(e) { displayStatus('לא ניתן לטעון את השביל: ' + errorText(e),true); }
  }
  $('allGpxButton').addEventListener('click', () => openGate({type:'zip'}));
  $('shareTrailButton').addEventListener('click',shareWholeTrail);
  $('wholeTrailMapButton').addEventListener('click',openWholeTrailMap);
  $('closeWholeTrailMap').addEventListener('click',closeWholeTrailMap);
  $('gateConfirm').addEventListener('click',executePending);
  $('gateCancel').addEventListener('click',closeGate);
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if($('wholeTrailMapOverlay').classList.contains('flex'))closeWholeTrailMap();
      else if($('gateOverlay').classList.contains('active'))closeGate();
    }
  });
  boot();
})();