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
      container:$('trailGallery'),
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
    const grid = $('segmentCards');
    grid.innerHTML = segments.map(segment => {
      const n = Number(segment.segment_number);
      const cover = segmentCoverUrl(segment);
      const stops = list(segment.stops);
      const region = plainText(segment.region, 'השביל');
      const distance = Number(segment.length_km);
      const distanceText = Number.isFinite(distance) && distance > 0 ? distance.toLocaleString('he-IL') : '';
      const difficulty = plainText(segment.difficulty).trim();
      const photo = cover
        ? '<img src="' + safe(cover) + '" alt="תמונת מקטע ' + n + '" loading="lazy" class="w-full h-48 object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null;this.parentElement.classList.add(\'bg-indigo-50\');this.style.display=\'none\'">'
        : '<div class="w-full h-48 flex items-center justify-center text-sm text-slate-400">תמונת המקטע תתווסף בקרוב</div>';
      const difficultyChip = difficulty
        ? '<span class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><span>' + safe(difficulty) + '</span><i class="fa-solid fa-triangle-exclamation text-amber-500 text-[11px]" aria-hidden="true"></i></span>'
        : '';
      const distanceChip = distanceText
        ? '<span class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><span>' + safe(distanceText) + ' ק״מ</span><i class="fa-solid fa-ruler-horizontal text-slate-400 text-[11px]" aria-hidden="true"></i></span>'
        : '';
      const stopsChip = '<span class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><span>' + stops.length + ' תחנות</span><i class="fa-solid fa-location-dot text-indigo-400 text-[11px]" aria-hidden="true"></i></span>';
      return '<article class="trail-route-card bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:border-indigo-400 transition flex flex-col justify-between overflow-hidden group" data-segment="' + n + '">' +
        '<div>' +
          '<div class="relative mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">' + photo + '</div>' +
          '<div class="flex items-center justify-between gap-2 mb-2">' +
            '<span class="bg-purple-50 text-purple-900 text-xs font-bold px-3 py-1 rounded-xl border border-purple-200/60">' + safe(region) + '</span>' +
            '<span class="text-[11px] font-bold text-slate-400 whitespace-nowrap">מקטע ' + n + ' מתוך 6</span>' +
          '</div>' +
          '<h3 class="font-extrabold text-slate-900 text-xl mb-2 group-hover:text-indigo-600 transition tracking-tight">' + safe(segment.title) + '</h3>' +
          '<p title="' + safe(segment.short_description) + '" class="text-xs md:text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed font-medium min-h-[2.75rem]">' + safe(segment.short_description) + '</p>' +
          '<div class="flex flex-wrap items-center gap-2 mb-5 text-xs font-bold">' + difficultyChip + distanceChip + stopsChip +
            '<button type="button" data-action="details" data-id="' + n + '" aria-controls="segmentDetailsPanel" aria-expanded="false" class="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 hover:underline font-black px-1 py-1 transition">' +
              '<i class="fa-solid fa-list-ul text-xs" aria-hidden="true"></i><span>פרטי המקטע והתחנות</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="w-full border-2 border-indigo-800 text-indigo-900 hover:bg-indigo-900 hover:text-white font-extrabold py-3.5 px-4 rounded-2xl text-center text-sm transition flex items-center justify-center gap-2 tracking-tight" data-action="offroad" data-id="' + n + '"' +
          ' aria-label="פתיחת מקטע ' + n + ' באופרוד">' +
          '<i class="fa-solid fa-map-location-dot text-base" aria-hidden="true"></i><span>למסלול המלא באופרוד</span>' +
        '</button>' +
      '</article>';
    }).join('');

    $('allGpxButton').disabled = segments.length !== 6 || segments.some(s => !validUrl(s.gpx_url));
    grid.querySelectorAll('[data-action="details"]').forEach(button => button.addEventListener('click', () => {
      const segment = segments.find(s => Number(s.segment_number) === Number(button.dataset.id));
      if (segment) showSegmentDetails(segment);
    }));
    grid.querySelectorAll('[data-action="offroad"]').forEach(button => button.addEventListener('click', () => {
      const segment = segments.find(s => Number(s.segment_number) === Number(button.dataset.id));
      if (!segment) return;
      if (validUrl(segment.offroad_url)) {
        openGate({type:'offroad',segment});
      } else {
        showOffroadUnavailable(segment);
      }
    }));
  }
  function showOffroadUnavailable(segment) {
    const notice = $('offroadNotice');
    notice.textContent = 'קישור האופרוד של מקטע ' + segment.segment_number + ' עדיין לא הוזן. לאחר הוספתו ב־Admin הכפתור יפתח את המסלול, בכפוף לאישור תנאי השימוש.';
    notice.classList.remove('hide');
    notice.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function stopMarkup(stops) {
    if (!stops.length) return '<p class="text-slate-500 text-sm">עדיין לא הוזנו תחנות למקטע הזה.</p>';
    return '<ol class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 list-decimal list-inside">' +
      stops.map(x => '<li class="text-slate-700 font-medium leading-relaxed">' +
        safe(typeof x === 'string' ? x : x?.name || '') + '</li>').join('') + '</ol>';
  }
  function showSegmentDetails(segment) {
    const panel=$('segmentDetailsPanel');
    const n=Number(segment.segment_number);
    if (!panel || !Number.isInteger(n)) return;
    $('segmentDetailsTitle').textContent=plainText(segment.title);
    $('segmentDetailsEyebrow').textContent='מקטע ' + n + ' מתוך 6 · ' + plainText(segment.region,'שביל המזרח הקרוב');
    const text=String(segment.full_description || segment.short_description || '').trim();
    const notes=String(segment.operational_notes || '').trim();
    const stops=list(segment.stops);
    const tags=list(segment.tags).filter(Boolean);
    const gpx=validUrl(segment.gpx_url);
    const offroad=validUrl(segment.offroad_url);
    const stats=[
      Number(segment.length_km)>0 ? Number(segment.length_km).toLocaleString('he-IL')+' ק״מ' : '',
      segment.difficulty,segment.duration_text
    ].filter(Boolean);
    const media=list(segment.media).filter(m => validUrl(m?.url));
    const mediaMarkup=media.length ? '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' +
      media.map(m=>{
        const url=validUrl(m.url);
        return m.type==='video'
          ? '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer" class="text-violet-700 underline rounded-xl border border-violet-100 p-3 font-bold">צפייה בסרטון <i class="fa-solid fa-play mr-1" aria-hidden="true"></i></a>'
          : '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer" class="rounded-xl border border-slate-200 overflow-hidden block"><img src="'+safe(url)+'" alt="'+safe(m.alt||'תמונת המקטע')+'" loading="lazy" class="w-full h-32 object-cover"></a>';
      }).join('')+'</div>' : '';
    $('segmentDetailsBody').innerHTML =
      (stats.length ? '<div class="flex flex-wrap gap-2">'+stats.map(v=>'<span class="bg-violet-50 text-violet-800 rounded-xl px-3 py-1.5 text-xs font-bold border border-violet-100">'+safe(v)+'</span>').join('')+'</div>' : '') +
      (text ? '<p class="text-slate-700 whitespace-pre-line leading-relaxed">'+safe(text)+'</p>' : '') +
      (tags.length ? '<div class="flex flex-wrap gap-2">'+tags.map(t=>'<span class="bg-slate-100 text-slate-700 rounded-lg px-2 py-1 text-xs font-medium">'+safe(t)+'</span>').join('')+'</div>' : '') +
      '<div class="border-t border-slate-100 pt-4"><h4 class="text-base font-black text-slate-900 mb-3">התחנות לאורך המקטע ('+stops.length+')</h4>'+stopMarkup(stops)+'</div>' +
      (notes ? '<div class="rounded-xl border border-amber-200 bg-amber-50 p-3"><h4 class="font-black text-amber-950 mb-1">הערות למטייל</h4><p class="whitespace-pre-line">'+safe(notes)+'</p></div>' : '') +
      (mediaMarkup ? '<div class="border-t border-slate-100 pt-4"><h4 class="text-base font-black mb-3">תמונות וסרטונים מהמקטע</h4>'+mediaMarkup+'</div>' : '') +
      '<div class="flex flex-wrap gap-2 border-t border-slate-100 pt-4">' +
        (gpx ? '<button type="button" id="segmentDetailsGpx" class="btn text-xs"><i class="fa-solid fa-download" aria-hidden="true"></i> הורדת GPX למקטע</button>'
             : '<span class="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">קובץ GPX טרם הועלה למקטע</span>') +
        (offroad ? '<button type="button" id="segmentDetailsOffroad" class="btn btn-outline text-xs">פתיחה באופרוד</button>'
                 : '<span class="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">קישור אופרוד טרם הוזן למקטע</span>') +
        (gpx ? '<button type="button" id="segmentDetailsMap" class="btn btn-outline text-xs">מפת GPX של המקטע</button>' : '') +
      '</div>';
    if (gpx) {
      $('segmentDetailsGpx').addEventListener('click',()=>openGate({type:'gpx',segment}));
      $('segmentDetailsMap').addEventListener('click',()=>openWholeTrailMap(n));
    }
    if (offroad) $('segmentDetailsOffroad').addEventListener('click',()=>openGate({type:'offroad',segment}));
    panel.classList.remove('hide');
    $('segmentCards').querySelectorAll('[data-action="details"]').forEach(button=>
      button.setAttribute('aria-expanded',String(Number(button.dataset.id)===n)));
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    panel.focus({preventScroll:true});
  }
  function closeSegmentDetails() {
    $('segmentDetailsPanel').classList.add('hide');
    $('segmentCards').querySelectorAll('[data-action="details"]').forEach(button=>
      button.setAttribute('aria-expanded','false'));
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
  async function openWholeTrailMap(targetSegmentNumber = null) {
    if (typeof L === 'undefined') { alert('רכיב המפה עדיין לא נטען, נסה שוב בעוד רגע.'); return; }
    const overlay=$('wholeTrailMapOverlay'),status=$('wholeTrailMapStatus');
    overlay.classList.remove('hidden');overlay.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    $('closeWholeTrailMap').focus();
    const isSingle=Number.isInteger(targetSegmentNumber);
    const validSegments=segments.filter(s=>validUrl(s.gpx_url) &&
      (!isSingle || Number(s.segment_number)===targetSegmentNumber));
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
    status.textContent=isSingle
      ? (loaded ? 'מוצג תוואי GPX של מקטע '+targetSegmentNumber+'. יש לבדוק מגבלות שטח לפני יציאה.' : 'תוואי מקטע '+targetSegmentNumber+' לא נטען.')
      : (loaded===6 ? 'כל ששת המקטעים מוצגים לפי קובצי GPX. יש לבדוק הגבלות שטח לפני יציאה.' :
          'מוצגים '+loaded+' מתוך 6 מקטעים. תוואי מלא יהיה זמין לאחר העלאת קובצי GPX תקינים לכל השישה.');
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
      // A navigable GPX map is unavailable until at least one real track is uploaded.
      const hasTrack=segments.some(segment=>validUrl(segment.gpx_url));
      $('wholeTrailMapButton').disabled=!hasTrack;
      $('wholeTrailMapButton').title=hasTrack ? 'מפת ניווט על בסיס קובצי GPX' : 'מפת הניווט תהיה זמינה לאחר העלאת קובצי GPX';
    } catch(e) { displayStatus('לא ניתן לטעון את השביל: ' + errorText(e),true); }
  }
  $('allGpxButton').addEventListener('click', () => openGate({type:'zip'}));
  $('shareTrailButton').addEventListener('click',shareWholeTrail);
  $('wholeTrailMapButton').addEventListener('click',()=>openWholeTrailMap());
  $('closeSegmentDetails').addEventListener('click',closeSegmentDetails);
  $('closeWholeTrailMap').addEventListener('click',closeWholeTrailMap);
  $('gateConfirm').addEventListener('click',executePending);
  $('gateCancel').addEventListener('click',closeGate);
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if($('wholeTrailMapOverlay').classList.contains('flex'))closeWholeTrailMap();
      else if($('gateOverlay').classList.contains('active'))closeGate();
      else if(!$('segmentDetailsPanel').classList.contains('hide'))closeSegmentDetails();
    }
  });
  boot();
})();