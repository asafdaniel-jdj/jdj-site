const SUPABASE_URL = Netlify.env.get('JDJ_SUPABASE_URL');
const SUPABASE_KEY = Netlify.env.get('JDJ_SUPABASE_KEY');

function isTestHost(hostname) {
  return hostname === 'jdj-test.netlify.app' || hostname.endsWith('--jdj-test.netlify.app');
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
  // Content HTML is authored in the JDJ admin and already rendered on the page by the client.
  // Strip executable/embedded content before server rendering it into the initial response.
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

function revealContentShell(html) {
  html = html.replace(/(<[^>]+id=["']loadingState["'][^>]*class=["'][^"']*)\bhidden\b([^"']*["'][^>]*>)/i, '$1$2');
  html = html.replace(/(<[^>]+id=["']loadingState["'][^>]*class=["'][^"']*)([^"']*["'][^>]*>)/i, '$1 hidden$2');
  html = html.replace(/(<[^>]+id=["']itemContainer["'][^>]*class=["'][^"']*)\bhidden\b([^"']*["'][^>]*>)/i, '$1$2');
  return html;
}

async function fetchOne(table, id, select) {
  const params = new URLSearchParams({ select, id: `eq.${id}`, limit: '1' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
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
  const response = await context.next();

  // TEST-only safety gate for the implementation phase of JDJ-49.
  if (!isTestHost(url.hostname)) return response;
  if (!SUPABASE_URL || !SUPABASE_KEY) return response;
  if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return response;

  const id = url.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return response;

  let html = await response.text();
  let row = null;

  try {
    if (url.pathname === '/article' || url.pathname === '/article.html') {
      row = await fetchOne('articles', id, 'id,title,excerpt,content_html,author,early_access_until');
      if (row) html = renderArticle(html, row);
    } else if (url.pathname === '/item' || url.pathname === '/item.html') {
      row = await fetchOne('routes', id, 'id,title,region,difficulty,nature,short_description,route_story,waypoint_highlights,early_access_until');
      if (row) html = renderRoute(html, row, false);
    } else if (url.pathname === '/point' || url.pathname === '/point.html') {
      row = await fetchOne('routes', id, 'id,title,region,difficulty,nature,short_description,route_story,waypoint_highlights,early_access_until');
      if (row) html = renderRoute(html, row, true);
    } else if (url.pathname === '/khan' || url.pathname === '/khan.html') {
      row = await fetchOne('khans', id, 'id,title,location_name,region,short_description,review_liked,review_disliked,review_jeep_angle,early_access_until');
      if (row) html = renderKhan(html, row);
    }
  } catch (error) {
    console.error('seo-content-render failed', error);
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }

  const headers = new Headers(response.headers);
  headers.set('X-JDJ-SEO-Content-Render', row ? 'test-server-rendered' : 'test-no-row');
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
