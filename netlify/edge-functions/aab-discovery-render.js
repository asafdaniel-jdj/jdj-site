function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isTestHost(hostname) {
  return hostname === 'jdj-test.netlify.app' || hostname.endsWith('--jdj-test.netlify.app');
}

function isPubliclyVisible(row, nowMs = Date.now()) {
  if (!row || !row.early_access_until) return true;
  const until = Date.parse(row.early_access_until);
  return !Number.isFinite(until) || until <= nowMs;
}

function replaceElementInnerHtml(html, id, innerHtml) {
  const openRe = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i');
  const openMatch = openRe.exec(html);
  if (!openMatch) return html;

  const contentStart = openMatch.index + openMatch[0].length;
  const divTagRe = /<\/?div\b[^>]*>/gi;
  divTagRe.lastIndex = contentStart;

  let depth = 1;
  let match;
  while ((match = divTagRe.exec(html))) {
    if (/^<\/div/i.test(match[0])) {
      depth -= 1;
      if (depth === 0) {
        return `${html.slice(0, contentStart)}${innerHtml}${html.slice(match.index)}`;
      }
    } else {
      depth += 1;
    }
  }

  console.error(`Discovery target ${id} has no matching closing div`);
  return html;
}

function setRobotsMeta(html, value) {
  const escaped = esc(value);
  const re = /<meta\b([^>]*\bname=["']robots["'][^>]*)>/i;
  if (re.test(html)) {
    return html.replace(re, (tag) => {
      if (/\bcontent=(["'])[\s\S]*?\1/i.test(tag)) {
        return tag.replace(/\bcontent=(["'])[\s\S]*?\1/i, `content="${escaped}"`);
      }
      return tag.replace(/>$/, ` content="${escaped}">`);
    });
  }
  return html.replace(/<\/head>/i, `    <meta name="robots" content="${escaped}">\n</head>`);
}

async function fetchCollection(requestUrl, table, scope, ops) {
  const endpoint = new URL('/.netlify/functions/collection-data', requestUrl);
  endpoint.searchParams.set('table', table);
  endpoint.searchParams.set('scope', scope);
  endpoint.searchParams.set('mode', 'many');
  endpoint.searchParams.set('ops', JSON.stringify(ops));
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`collection-data ${table} failed: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

const CATEGORY_TYPES = {
  routes: ['מסלול טיול'],
  technical: ['מקטע טכני'],
  viewpoints: ['נקודת תצפית', 'נקודות תצפית'],
  water: ['מעין', 'מעיין', 'גב מים', 'מעיין/גב', 'מעיינות וגבים'],
  poi: ['נקודת עניין', 'נקודות עניין', 'מקום היסטורי']
};

function discoveryCard(href, title, description = '') {
  return `<a href="${esc(href)}" class="block bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-indigo-300 transition">
    <h2 class="text-base font-black text-slate-900 leading-snug">${esc(title)}</h2>
    ${description ? `<p class="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1.5">${esc(description)}</p>` : ''}
  </a>`;
}

function publicRows(rows, nowMs) {
  return rows.filter(row => isPubliclyVisible(row, nowMs));
}

function renderCategoryLinks(rows, url, nowMs) {
  const requestedType = url.searchParams.get('type');
  const type = CATEGORY_TYPES[requestedType] ? requestedType : 'routes';
  const allowed = new Set(CATEGORY_TYPES[type]);
  const region = type === 'routes' ? url.searchParams.get('region') : null;
  return publicRows(rows, nowMs)
    .filter(row => allowed.has(row.route_type))
    .filter(row => !region || row.region === region)
    .map(row => discoveryCard(
      `${row.route_type === 'מסלול טיול' ? '/item' : '/point'}?id=${encodeURIComponent(row.id)}`,
      row.title,
      row.short_description
    ))
    .join('');
}

function renderStoryLinks(rows, _url, nowMs) {
  return publicRows(rows, nowMs)
    .map(row => discoveryCard(`/article?id=${encodeURIComponent(row.id)}`, row.title, row.excerpt))
    .join('');
}

function renderKhanLinks(rows, _url, nowMs) {
  return publicRows(rows, nowMs)
    .map(row => discoveryCard(`/khan?id=${encodeURIComponent(row.id)}`, row.title, row.short_description))
    .join('');
}

function renderRiverLinks(rows) {
  return rows
    .map(row => discoveryCard(
      `/floods/${encodeURIComponent(row.region_slug)}/${encodeURIComponent(row.slug)}`,
      row.name,
      row.short_description
    ))
    .join('');
}

function renderFloodRegionButtons() {
  return `<a href="/floods/judean-desert" class="inline-flex items-center justify-center bg-white text-slate-900 font-black px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">שטפונות במדבר יהודה</a>
  <a href="/floods/negev-arava" class="inline-flex items-center justify-center bg-white text-slate-900 font-black px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">שטפונות בנגב ובערבה</a>`;
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const path = url.pathname.endsWith('.html') ? url.pathname.slice(0, -5) : url.pathname;

  let dataPromise = Promise.resolve([]);
  let targetId = null;
  let render = null;

  if (path === '/category') {
    const requestedType = url.searchParams.get('type');
    const type = CATEGORY_TYPES[requestedType] ? requestedType : 'routes';
    targetId = 'categoryGrid';
    dataPromise = fetchCollection(request.url, 'routes', `category:${type}`, [
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['status', 'פורסם'] },
      { method: 'order', args: ['id', { ascending: false }] },
      { method: 'in', args: ['route_type', CATEGORY_TYPES[type]] }
    ]);
    render = renderCategoryLinks;
  } else if (path === '/stories') {
    targetId = 'storiesGrid';
    dataPromise = fetchCollection(request.url, 'articles', 'stories', [
      { method: 'select', args: ['id,title,excerpt,author,created_at,early_access_until'] },
      { method: 'order', args: ['created_at', { ascending: false }] }
    ]);
    render = renderStoryLinks;
  } else if (path === '/khan-catalog') {
    targetId = 'khanCatalogGrid';
    dataPromise = fetchCollection(request.url, 'khans', 'khan-catalog', [
      { method: 'select', args: ['*'] },
      { method: 'order', args: ['id', { ascending: false }] }
    ]);
    render = renderKhanLinks;
  } else if (path === '/floods') {
    targetId = 'heroRegionButtons';
    render = () => renderFloodRegionButtons();
  } else if (path === '/floods/judean-desert' || path === '/floods/negev-arava') {
    const regionSlug = path.endsWith('judean-desert') ? 'judean-desert' : 'negev-arava';
    targetId = 'riversGrid';
    dataPromise = fetchCollection(request.url, 'flood_rivers', `floods:${encodeURIComponent(path)}`, [
      { method: 'select', args: ['id,name,slug,region,region_slug,short_description,sort_order,status,show_in_catalog'] },
      { method: 'eq', args: ['region_slug', regionSlug] },
      { method: 'eq', args: ['status', 'published'] },
      { method: 'eq', args: ['show_in_catalog', true] },
      { method: 'order', args: ['sort_order', { ascending: true }] }
    ]);
    render = renderRiverLinks;
  } else {
    return context.next();
  }

  const [response, rows] = await Promise.all([
    context.next(),
    dataPromise.catch((error) => {
      console.error('discovery render data failed', error);
      return [];
    })
  ]);

  if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return response;

  const responseDate = Date.parse(response.headers.get('date') || '');
  const discoveryNowMs = Number.isFinite(responseDate) ? responseDate : Date.now();
  const activeEarlyAccessIds = rows
    .filter(row => !isPubliclyVisible(row, discoveryNowMs))
    .map(row => row.id)
    .filter(id => id !== null && id !== undefined);

  let html = await response.text();
  const discoveryHtml = render(rows, url, discoveryNowMs);
  if (discoveryHtml) html = replaceElementInnerHtml(html, targetId, discoveryHtml);

  if (path === '/floods' || path === '/floods/judean-desert' || path === '/floods/negev-arava') {
    html = setRobotsMeta(html, isTestHost(url.hostname) ? 'noindex,nofollow' : 'index,follow');
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-Discovery-Render', discoveryHtml ? 'server-links' : 'no-links');
  headers.set('X-JDJ-Discovery-Input-Rows', String(rows.length));
  headers.set('X-JDJ-Discovery-Link-Count', String((discoveryHtml.match(/<a\b/gi) || []).length));
  headers.set('X-JDJ-Discovery-Now', new Date(discoveryNowMs).toISOString());
  headers.set('X-JDJ-Discovery-Time-Source', Number.isFinite(responseDate) ? 'response-date' : 'runtime');
  headers.set('X-JDJ-Discovery-Filtered-Early-Access', activeEarlyAccessIds.length ? activeEarlyAccessIds.join(',') : 'none');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: [
    '/category', '/category.html',
    '/stories', '/stories.html',
    '/khan-catalog', '/khan-catalog.html',
    '/floods',
    '/floods/judean-desert',
    '/floods/negev-arava'
  ]
};
