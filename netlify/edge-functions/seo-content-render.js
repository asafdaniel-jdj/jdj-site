const SUPABASE_URL = Netlify.env.get('JDJ_SUPABASE_URL');
const SEO_SHARED_CACHE_NAME = 'jdj-seo-data-v1';

function isTestHost(hostname) {
  return hostname === 'jdj-test.netlify.app' || hostname.endsWith('--jdj-test.netlify.app');
}

function isEarlyAccessActive(row, nowMs = Date.now()) {
  if (!row || !row.early_access_until) return false;
  const until = Date.parse(row.early_access_until);
  return Number.isFinite(until) && until > nowMs;
}

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHtml(value = '') {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

function replaceElementText(html, id, value) {
  if (value === null || value === undefined || value === '') return html;
  const re = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/[^>]+>)`, 'i');
  return html.replace(re, `$1${esc(value)}$2`);
}

function replaceElementHtml(html, id, value) {
  if (!value) return html;
  const re = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/[^>]+>)`, 'i');
  return html.replace(re, `$1${safeHtml(value)}$2`);
}

function setRobotsIndexFollow(html) {
  const robotsRe = /<meta\b([^>]*\bname=["']robots["'][^>]*)>/i;
  if (robotsRe.test(html)) {
    return html.replace(robotsRe, (tag) => {
      if (/\bcontent=(["'])[\s\S]*?\1/i.test(tag)) {
        return tag.replace(/\bcontent=(["'])[\s\S]*?\1/i, 'content="index,follow"');
      }
      return tag.replace(/>$/, ' content="index,follow">');
    });
  }
  return html.replace(/<\/head>/i, '    <meta name="robots" content="index,follow">\n</head>');
}

function revealContentShell(html) {
  html = html.replace(/(<[^>]+id=["']loadingState["'][^>]*class=["'][^"']*)([^"']*["'][^>]*>)/i, '$1 hidden$2');
  html = html.replace(/(<[^>]+id=["']itemContainer["'][^>]*class=["'][^"']*)\bhidden\b([^"']*["'][^>]*>)/i, '$1$2');
  return html;
}

function entityRequest(url, type, id) {
  const endpoint = new URL(
    type === 'item' ? '/.netlify/functions/route-data' : '/.netlify/functions/content-data',
    url
  );
  endpoint.searchParams.set('id', id);
  if (type !== 'item') endpoint.searchParams.set('type', type);
  return endpoint;
}

async function fetchCachedEntityFallback(requestUrl, type, id) {
  const endpoint = entityRequest(requestUrl, type, id);
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.data || null;
}

function seoEntityCacheUrl(type, id) {
  if (!SUPABASE_URL) return null;

  let table = 'routes';
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('id', `eq.${id}`);
  params.set('limit', '1');

  if (type === 'item') {
    params.set('status', 'eq.פורסם');
    params.set('route_type', 'eq.מסלול טיול');
  } else if (type === 'point') {
    params.set('status', 'eq.פורסם');
    params.set('route_type', 'neq.מסלול טיול');
  } else if (type === 'khan') {
    table = 'khans';
  } else if (type === 'article') {
    table = 'articles';
  } else {
    return null;
  }

  return `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
}

async function readEntityFromSeoCache(type, id) {
  const cacheUrl = seoEntityCacheUrl(type, id);
  if (!cacheUrl) return null;

  const cache = await caches.open(SEO_SHARED_CACHE_NAME);
  const cached = await cache.match(new Request(cacheUrl, { method: 'GET' }));
  if (!cached || !cached.ok) return null;

  const rows = await cached.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function pageType(pathname) {
  const path = pathname.endsWith('.html') ? pathname.slice(0, -5) : pathname;
  if (path === '/article') return 'article';
  if (path === '/item') return 'item';
  if (path === '/point') return 'point';
  if (path === '/khan') return 'khan';
  return null;
}

function injectEmbeddedEntity(html, type, id, row) {
  if (!row) return html;
  const safeJson = JSON.stringify({ type, id: String(id), data: row })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const script = `<script id="jdj-server-page-data">\n(() => {\n  const embedded = ${safeJson};\n  window.__JDJ_PAGE_DATA__ = embedded;\n  const originalFetch = window.fetch.bind(window);\n  window.fetch = function(input, init) {\n    try {\n      const raw = typeof input === 'string' ? input : input?.url;\n      const target = new URL(raw, window.location.href);\n      const sameId = target.searchParams.get('id') === embedded.id;\n      const routeMatch = embedded.type === 'item' && target.pathname === '/.netlify/functions/route-data' && sameId;\n      const contentMatch = embedded.type !== 'item' && target.pathname === '/.netlify/functions/content-data' && sameId && target.searchParams.get('type') === embedded.type;\n      if (routeMatch || contentMatch) {\n        return Promise.resolve(new Response(JSON.stringify({ data: embedded.data }), {\n          status: 200,\n          headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-JDJ-Embedded-Data': '1' }\n        }));\n      }\n    } catch (_) {}\n    return originalFetch(input, init);\n  };\n})();\n</script>`;

  return html.replace(/<\/head>/i, `${script}\n</head>`);
}

function renderArticle(html, row) {
  html = replaceElementText(html, 'breadcrumbArticleTitle', row.title);
  html = replaceElementText(html, 'articleTitle', row.title);
  html = replaceElementText(html, 'articleExcerpt', row.excerpt);
  html = replaceElementText(html, 'articleAuthor', row.author ? `מאת ${row.author}` : '');
  html = replaceElementHtml(html, 'articleContent', row.content_html);
  return html;
}

function renderRoute(html, row, isPoint) {
  html = revealContentShell(html);
  html = replaceElementText(html, isPoint ? 'mainH1Title' : 'topPageHeading', row.title);
  html = replaceElementText(html, isPoint ? 'breadcrumbCurrentItem' : 'breadcrumbTitle', row.title);
  html = replaceElementText(html, 'itemTitle', row.title);
  html = replaceElementText(html, 'itemShortDesc', row.short_description);
  html = replaceElementText(html, 'itemRegion', row.region);
  html = replaceElementText(html, 'itemDifficulty', row.difficulty);
  html = replaceElementText(html, 'itemNature', row.nature);
  return html;
}

function renderKhan(html, row) {
  html = revealContentShell(html);
  html = replaceElementText(html, 'breadcrumbTitle', row.title);
  html = replaceElementText(html, 'itemTitle', row.title);
  html = replaceElementText(html, 'itemLocationName', row.location_name);
  html = replaceElementText(html, 'itemRegion', row.region);
  html = replaceElementText(html, 'itemShortDesc', row.short_description);
  html = replaceElementText(html, 'reviewLiked', row.review_liked);
  html = replaceElementText(html, 'reviewDisliked', row.review_disliked);
  html = replaceElementText(html, 'reviewJeepAngle', row.review_jeep_angle);
  return html;
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const type = pageType(url.pathname);

  if (!type || !id || !/^\d+$/.test(id)) return context.next();

  const totalStarted = performance.now();
  const downstreamStarted = performance.now();
  const response = await context.next();
  const downstreamMs = performance.now() - downstreamStarted;

  if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return response;

  // seo-meta already resolved this entity before returning downstream HTML.
  // Reuse the exact Cache API entry it populated instead of starting another
  // same-site Function request. Fall back to the public cached endpoint only
  // if the shared SEO cache entry is unexpectedly unavailable.
  const entityStarted = performance.now();
  let row = null;
  let entitySource = 'seo-cache';
  try {
    row = await readEntityFromSeoCache(type, id);
    if (!row) {
      entitySource = 'function-fallback';
      row = await fetchCachedEntityFallback(request.url, type, id);
    }
  } catch (error) {
    console.error('seo-content-render entity lookup failed', error);
    row = null;
  }
  const entityMs = performance.now() - entityStarted;

  let html = await response.text();
  const earlyAccess = !!(row && isEarlyAccessActive(row));

  if (row) {
    if (type === 'article') html = renderArticle(html, row);
    if (type === 'item') html = renderRoute(html, row, false);
    if (type === 'point') html = renderRoute(html, row, true);
    if (type === 'khan') html = renderKhan(html, row);
    html = injectEmbeddedEntity(html, type, id, row);
  }

  if (earlyAccess && !isTestHost(url.hostname)) {
    html = setRobotsIndexFollow(html);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-SEO-Content-Render', row ? 'server-rendered-cache' : 'no-row');
  headers.set('X-JDJ-Entity-Source', row ? entitySource : 'none');
  headers.set('X-JDJ-Early-Access', earlyAccess ? '1' : '0');

  const totalMs = performance.now() - totalStarted;
  const timing = [
    `jdj_downstream;dur=${downstreamMs.toFixed(1)}`,
    `jdj_entity;dur=${entityMs.toFixed(1)}`,
    `jdj_content_render;dur=${totalMs.toFixed(1)}`
  ].join(', ');
  const existingTiming = headers.get('Server-Timing');
  headers.set('Server-Timing', existingTiming ? `${existingTiming}, ${timing}` : timing);

  if (isTestHost(url.hostname)) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else if (earlyAccess) {
    headers.delete('X-Robots-Tag');
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: [
    '/article', '/article.html',
    '/item', '/item.html',
    '/point', '/point.html',
    '/khan', '/khan.html'
  ]
};
