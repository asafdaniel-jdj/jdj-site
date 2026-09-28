(function () {
  'use strict';

  const state = { client: null, root: null, lastFocus: null, currentAuthorSlug: null };

  function ensureClient() {
    if (state.client) return state.client;
    const url = window.JDJ_ENV?.supabaseUrl;
    const key = window.JDJ_ENV?.supabaseKey;
    if (!url || !key || !window.supabase) throw new Error('Author modal environment is missing');
    state.client = window.supabase.createClient(url, key);
    return state.client;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function nl2p(value) {
    return String(value || '')
      .split(/\n\s*\n/)
      .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function iconFor(type, label) {
    const t = String(type || '').toLowerCase();
    if (t === 'instagram') return 'fa-brands fa-instagram';
    if (t === 'facebook') return 'fa-brands fa-facebook-f';
    if (t === 'whatsapp') return 'fa-brands fa-whatsapp';
    if (t === 'website') return 'fa-solid fa-globe';
    if (t === 'map' || /מפה/.test(label || '')) return 'fa-solid fa-map-location-dot';
    return 'fa-solid fa-arrow-up-right-from-square';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  }

  function isPublicStory(story) {
    if (!story?.early_access_until) return true;
    const ts = Date.parse(story.early_access_until);
    return !Number.isFinite(ts) || ts <= Date.now();
  }

  function ensureStyles() {
    if (document.getElementById('jdjAuthorModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'jdjAuthorModalStyles';
    style.textContent = `
      .jdj-author-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.72);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;transition:opacity .2s ease}
      .jdj-author-overlay.is-open{opacity:1;pointer-events:auto}
      .jdj-author-modal{direction:rtl;width:min(820px,100%);max-height:min(88vh,900px);overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:28px;box-shadow:0 30px 90px rgba(15,23,42,.35);transform:translateY(14px) scale(.985);transition:transform .2s ease;font-family:'Heebo',sans-serif;color:#0f172a}
      .jdj-author-overlay.is-open .jdj-author-modal{transform:none}
      .jdj-author-close,.jdj-author-share{position:absolute;top:16px;width:38px;height:38px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#475569;display:grid;place-items:center;cursor:pointer;z-index:2;transition:.15s}
      .jdj-author-close{left:16px}
      .jdj-author-share{left:62px}
      .jdj-author-close:hover,.jdj-author-share:hover{border-color:#818cf8;color:#4338ca;background:#eef2ff}
      .jdj-author-share.is-copied{border-color:#86efac;color:#15803d;background:#f0fdf4}
      .jdj-author-head{position:relative;padding:28px 28px 22px;background:linear-gradient(135deg,#fff7ed 0%,#fff 48%,#eef2ff 100%);border-bottom:1px solid #e2e8f0;display:flex;gap:20px;align-items:center}
      .jdj-author-photo{width:112px;height:112px;border-radius:28px;object-fit:cover;border:4px solid #fff;box-shadow:0 8px 24px rgba(15,23,42,.16);background:#f1f5f9;flex:none}
      .jdj-author-photo-fallback{width:112px;height:112px;border-radius:28px;background:#fef3c7;color:#92400e;display:grid;place-items:center;font-size:34px;border:4px solid #fff;box-shadow:0 8px 24px rgba(15,23,42,.12);flex:none}
      .jdj-author-name{font-size:28px;line-height:1.1;font-weight:900;margin:0 0 6px}
      .jdj-author-sub{color:#64748b;font-weight:700;font-size:14px;margin:0}
      .jdj-author-promo{margin-top:16px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:16px;background:rgba(255,255,255,.78)}
      .jdj-author-promo-title{font-size:11px;font-weight:900;color:#64748b;margin:0 0 8px;letter-spacing:.02em}
      .jdj-author-links{display:flex;flex-wrap:wrap;gap:8px}
      .jdj-author-link{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border-radius:12px;background:#fff;border:1px solid #cbd5e1;color:#334155;font-size:12px;font-weight:900;text-decoration:none;transition:.15s;box-shadow:0 2px 8px rgba(15,23,42,.04)}
      .jdj-author-link[data-link-type=facebook]:hover{border-color:#2563eb;color:#1d4ed8;background:#eff6ff}
      .jdj-author-link[data-link-type=instagram]:hover{border-color:#db2777;color:#be185d;background:#fdf2f8}
      .jdj-author-link[data-link-type=whatsapp]{border-color:#86efac;color:#15803d;background:#f0fdf4}
      .jdj-author-link[data-link-type=whatsapp]:hover{border-color:#16a34a;color:#fff;background:#16a34a}
      .jdj-author-link[data-link-type=map]:hover,.jdj-author-link[data-link-type=website]:hover,.jdj-author-link[data-link-type=custom]:hover{border-color:#4f46e5;color:#4338ca;background:#eef2ff}
      .jdj-author-body{padding:24px 28px 28px;display:grid;gap:24px;overflow:auto;overscroll-behavior:contain}
      .jdj-author-section{display:grid;gap:11px}
      .jdj-author-section-title{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:900;margin:0;color:#0f172a}
      .jdj-author-bio{color:#475569;font-size:14px;line-height:1.8}
      .jdj-author-bio p{margin:0 0 10px}
      .jdj-author-events{display:grid;gap:9px}
      .jdj-author-event{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}
      .jdj-author-event-main{display:flex;align-items:center;gap:12px;min-width:0}
      .jdj-author-event-date{font-weight:900;color:#92400e;background:#fef3c7;padding:7px 9px;border-radius:10px;white-space:nowrap;font-size:12px}
      .jdj-author-event-title{font-weight:800;color:#1e293b;font-size:13px}
      .jdj-author-ticket{white-space:nowrap;text-decoration:none;font-size:11px;font-weight:900;padding:7px 10px;border-radius:10px;background:#4f46e5;color:#fff}
      .jdj-author-stories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .jdj-author-story{display:block;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#fff;text-decoration:none;color:inherit;transition:.15s}
      .jdj-author-story:hover{border-color:#818cf8;box-shadow:0 8px 22px rgba(79,70,229,.1)}
      .jdj-author-story img{width:100%;height:105px;object-fit:cover;background:#f1f5f9}
      .jdj-author-story-title{padding:10px 11px;font-size:12px;font-weight:900;line-height:1.45;color:#1e293b}
      .jdj-author-all{display:inline-flex;align-items:center;gap:7px;color:#4338ca;font-weight:900;font-size:12px;text-decoration:none;width:max-content}
      .jdj-author-loading,.jdj-author-error{padding:56px 24px;text-align:center;font-weight:800;color:#64748b}
      body.jdj-author-modal-open{overflow:hidden}
      @media(max-width:640px){
        .jdj-author-overlay{padding:0;align-items:flex-end}
        .jdj-author-modal{width:100%;height:min(92vh,760px);max-height:92vh;border-radius:26px 26px 0 0;transform:translateY(26px)}
        .jdj-author-head{padding:24px 20px 18px;align-items:flex-start;flex:none}
        .jdj-author-photo,.jdj-author-photo-fallback{width:82px;height:82px;border-radius:22px}
        .jdj-author-name{font-size:23px;padding-left:34px}
        .jdj-author-body{padding:20px;gap:21px;min-height:0}
        .jdj-author-event{align-items:flex-start;flex-direction:column}
        .jdj-author-ticket{align-self:flex-start}
        .jdj-author-stories{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureRoot() {
    ensureStyles();
    if (state.root) return state.root;
    const root = document.createElement('div');
    root.className = 'jdj-author-overlay';
    root.id = 'jdjAuthorModalRoot';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `<div class="jdj-author-modal" role="dialog" aria-modal="true" aria-labelledby="jdjAuthorModalTitle"><div class="jdj-author-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div></div>`;
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    document.body.appendChild(root);
    state.root = root;
    return root;
  }

  function authorSlugFromHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return '';
    const params = new URLSearchParams(raw);
    return String(params.get('author') || '').trim();
  }

  function setAuthorHash(slug) {
    const clean = String(slug || '').trim();
    if (!clean) return;
    const url = new URL(window.location.href);
    url.hash = `author=${encodeURIComponent(clean)}`;
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function clearAuthorHash() {
    if (!authorSlugFromHash()) return;
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  }

  function directAuthorUrl(slug) {
    const url = new URL('/stories.html', window.location.origin);
    url.hash = `author=${encodeURIComponent(slug)}`;
    return url.toString();
  }

  async function copyDirectLink(slug, button) {
    const value = directAuthorUrl(slug);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement('textarea');
        field.value = value;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      if (button) {
        const original = button.innerHTML;
        button.classList.add('is-copied');
        button.setAttribute('aria-label', 'הקישור הועתק');
        button.title = 'הקישור הועתק';
        button.innerHTML = '<i class="fa-solid fa-check"></i>';
        window.setTimeout(() => {
          button.classList.remove('is-copied');
          button.setAttribute('aria-label', 'העתקת קישור ישיר למחבר');
          button.title = 'העתקת קישור ישיר למחבר';
          button.innerHTML = original;
        }, 1600);
      }
    } catch (err) {
      console.error('Author modal copy link:', err);
      window.prompt('העתק את הקישור הישיר למחבר:', value);
    }
  }

  function close(options = {}) {
    if (!state.root) return;
    state.root.classList.remove('is-open');
    state.root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('jdj-author-modal-open');
    if (options.syncUrl !== false) clearAuthorHash();
    state.currentAuthorSlug = null;
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  }

  function prepareOpen() {
    state.lastFocus = document.activeElement;
    const root = ensureRoot();
    root.querySelector('.jdj-author-modal').innerHTML = `<div class="jdj-author-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען פרטי מחבר...</div>`;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    root.querySelector('.jdj-author-modal').scrollTop = 0;
    document.body.classList.add('jdj-author-modal-open');
    return root;
  }

  async function loadAuthor(author, options = {}) {
    const root = ensureRoot();
    if (!author) return;
    state.currentAuthorSlug = author.slug || null;
    if (options.syncUrl !== false && author.slug) setAuthorHash(author.slug);

    const client = ensureClient();
    const today = new Date().toISOString().slice(0, 10);
    const [linksRes, eventsRes, storiesRes] = await Promise.all([
      client.from('author_links').select('*').eq('author_id', author.id).eq('is_active', true).order('sort_order').order('id'),
      client.from('author_events').select('*').eq('author_id', author.id).eq('is_active', true).gte('event_date', today).order('event_date').order('sort_order'),
      client.from('articles').select('id,title,cover_image,early_access_until').eq('author', author.name).order('id', { ascending: false }).limit(8)
    ]);
    if (linksRes.error) throw linksRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (storiesRes.error) throw storiesRes.error;

    render(author, linksRes.data || [], eventsRes.data || [], (storiesRes.data || []).filter(isPublicStory));
  }

  async function openByName(authorName, options = {}) {
    const name = String(authorName || '').trim();
    if (!name) return;
    const root = prepareOpen();

    try {
      const client = ensureClient();
      const { data: author, error } = await client.from('authors').select('*').eq('name', name).maybeSingle();
      if (error) throw error;
      if (!author) {
        root.querySelector('.jdj-author-modal').innerHTML = `<button class="jdj-author-close" type="button" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button><div class="jdj-author-error">עדיין אין עמוד מחבר עבור ${esc(name)}.</div>`;
        root.querySelector('.jdj-author-close').addEventListener('click', () => close());
        return;
      }
      await loadAuthor(author, options);
    } catch (err) {
      console.error('Author modal:', err);
      root.querySelector('.jdj-author-modal').innerHTML = `<button class="jdj-author-close" type="button" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button><div class="jdj-author-error">לא הצלחנו לטעון כרגע את פרטי המחבר.</div>`;
      root.querySelector('.jdj-author-close').addEventListener('click', () => close());
    }
  }

  async function openBySlug(authorSlug, options = {}) {
    const slug = String(authorSlug || '').trim();
    if (!slug) return;
    const root = prepareOpen();

    try {
      const client = ensureClient();
      const { data: author, error } = await client.from('authors').select('*').eq('slug', slug).maybeSingle();
      if (error) throw error;
      if (!author) {
        root.querySelector('.jdj-author-modal').innerHTML = `<button class="jdj-author-close" type="button" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button><div class="jdj-author-error">לא נמצא מחבר עבור הקישור הזה.</div>`;
        root.querySelector('.jdj-author-close').addEventListener('click', () => close());
        return;
      }
      await loadAuthor(author, options);
    } catch (err) {
      console.error('Author modal:', err);
      root.querySelector('.jdj-author-modal').innerHTML = `<button class="jdj-author-close" type="button" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button><div class="jdj-author-error">לא הצלחנו לטעון כרגע את פרטי המחבר.</div>`;
      root.querySelector('.jdj-author-close').addEventListener('click', () => close());
    }
  }

  function render(author, links, events, stories) {
    const modal = ensureRoot().querySelector('.jdj-author-modal');
    const photo = author.photo
      ? `<img class="jdj-author-photo" src="${esc(author.photo)}" alt="${esc(author.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="jdj-author-photo-fallback" style="display:none"><i class="fa-solid fa-feather-pointed"></i></div>`
      : `<div class="jdj-author-photo-fallback"><i class="fa-solid fa-feather-pointed"></i></div>`;

    const linksHtml = links.length ? `<div class="jdj-author-promo"><div class="jdj-author-promo-title">עקבו, הצטרפו והמשיכו עם ${esc(author.name)}</div><div class="jdj-author-links">${links.map(link => `
      <a class="jdj-author-link" data-link-type="${esc(String(link.link_type || 'custom').toLowerCase())}" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
        <i class="${iconFor(link.link_type, link.label)}"></i><span>${esc(link.label)}</span>
      </a>`).join('')}</div></div>` : '';

    const eventsHtml = events.length ? `
      <section class="jdj-author-section">
        <h3 class="jdj-author-section-title"><i class="fa-regular fa-calendar text-indigo-600"></i> אירועים קרובים</h3>
        <div class="jdj-author-events">${events.map(ev => `
          <div class="jdj-author-event">
            <div class="jdj-author-event-main"><span class="jdj-author-event-date">${esc(formatDate(ev.event_date))}</span><span class="jdj-author-event-title">${esc(ev.title)}</span></div>
            ${ev.ticket_url ? `<a class="jdj-author-ticket" href="${esc(ev.ticket_url)}" target="_blank" rel="noopener noreferrer">פרטים / כרטיסים</a>` : ''}
          </div>`).join('')}</div>
      </section>` : '';

    const visibleStories = stories.slice(0, 3);
    const storiesHtml = visibleStories.length ? `
      <section class="jdj-author-section">
        <h3 class="jdj-author-section-title"><i class="fa-solid fa-book-open text-amber-600"></i> הסיפורים באתר</h3>
        <div class="jdj-author-stories">${visibleStories.map(story => `
          <a class="jdj-author-story" href="/article?id=${encodeURIComponent(story.id)}">
            <img src="${esc(story.cover_image || 'access-banner.jpg')}" alt="${esc(story.title || '')}" loading="lazy" onerror="this.onerror=null;this.src='access-banner.jpg'">
            <div class="jdj-author-story-title">${esc(story.title || '')}</div>
          </a>`).join('')}</div>
        <a class="jdj-author-all" href="/stories?author=${encodeURIComponent(author.name)}"><span>לכל הסיפורים של ${esc(author.name)}</span><i class="fa-solid fa-arrow-left"></i></a>
      </section>` : '';

    modal.innerHTML = `
      <button class="jdj-author-close" type="button" aria-label="סגירה"><i class="fa-solid fa-xmark"></i></button>
      ${author.slug ? `<button class="jdj-author-share" type="button" aria-label="העתקת קישור ישיר למחבר" title="העתקת קישור ישיר למחבר"><i class="fa-solid fa-link"></i></button>` : ''}
      <header class="jdj-author-head">
        ${photo}
        <div>
          <h2 class="jdj-author-name" id="jdjAuthorModalTitle">${esc(author.name)}</h2>
          ${author.short_title ? `<p class="jdj-author-sub">${esc(author.short_title)}</p>` : ''}
          ${linksHtml}
        </div>
      </header>
      <div class="jdj-author-body">
        ${author.bio ? `<section class="jdj-author-section"><h3 class="jdj-author-section-title"><i class="fa-solid fa-user-pen text-slate-500"></i> אודות</h3><div class="jdj-author-bio">${nl2p(author.bio)}</div></section>` : ''}
        ${eventsHtml}
        ${storiesHtml}
      </div>`;

    modal.querySelector('.jdj-author-close').addEventListener('click', () => close());
    const shareButton = modal.querySelector('.jdj-author-share');
    if (shareButton && author.slug) shareButton.addEventListener('click', () => copyDirectLink(author.slug, shareButton));
    modal.querySelector('.jdj-author-body')?.scrollTo({ top: 0, behavior: 'instant' });
    modal.querySelector('.jdj-author-close').focus({ preventScroll: true });
  }

  function openFromHash() {
    const slug = authorSlugFromHash();
    if (slug) {
      if (state.currentAuthorSlug !== slug || !state.root?.classList.contains('is-open')) {
        openBySlug(slug, { syncUrl: false });
      }
    } else if (state.root?.classList.contains('is-open')) {
      close({ syncUrl: false });
    }
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('hashchange', openFromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openFromHash, { once: true });
  else window.setTimeout(openFromHash, 0);

  window.JDJAuthorModal = { openByName, openBySlug, close, directAuthorUrl };
})();
