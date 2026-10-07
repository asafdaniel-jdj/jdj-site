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
  const re = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/[^>]+>)`, 'i');
  return html.replace(re, `$1${innerHtml}$2`);
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
  routes: new Set(['מסלול טיול']),
  technical: new Set(['מקטע טכני']),
  viewpoints: new Set(['נקודת תצפית', 'נקודות תצפית']),
  water: new Set(['מעין', 'מעיין', 'גב מים', 'מעיין/גב', 'מעיינות וגבים']),
  poi: new Set(['נקודת עניין', 'נקודות עניין', 'מקום היסטורי'])
};

function discoveryCard(href, title, description = '') {
  return `<a href="${esc(href)}" class="block bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-indigo-300 transition">
    <h2 class="text-base font-black text-slate-900 leading-snug">${esc(title)}</h2>
    ${description ? `<p class="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1.5">${esc(description)}</p>` : ''}
  </a>`;
}

function renderCategoryLinks(rows, url) {
  const type = CATEGORY_TYPES[url.searchParams.get('type')] ? url.searchParams.get('type') : 'routes';
  const allowed = CATEGORY_TYPES[type];
  const region = type === 'routes' ? url.searchParams.get('region') : null;
  return rows
    .filter(isPubliclyVisible)
    .filter(row => allowed.has(row.route_type))
    .filter(row => !region || row.region === region)
    .map(row => discoveryCard(
      `${row.route_type === 'מסלול טיול' ? '/item' : '/point'}?id=${encodeURIComponent(row.id)}`,
      row.title,
      row.short_description
    ))
    .join('');
}

function renderStoryLinks(rows) {
  return rows
    .filter(isPubliclyVisible)
    .map(row => discoveryCard(`/article?id=${encodeURIComponent(row.id)}`, row.title, row.excerpt))
    .join('');
}

function renderKhanLinks(rows) {
  return rows
    .filter(isPubliclyVisible)
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
    targetId = 'categoryGrid';
    dataPromise = fetchCollection(request.url, 'routes', `category:${url.searchParams.get('type') || 'routes'}`, [
      { method: 'select', args: ['id,title,route_type,region,status,early_access_until,short_description'] },
      { method: 'eq', args: ['status', 'פורסם'] },
      { method: 'order', args: ['id', { ascending: false }] }
    ]);
    render = rows => renderCategoryLinks(rows, url);
  } else if (path === '/stories') {
    targetId = 'storiesGrid';
    dataPromise = fetchCollection(request.url, 'articles', 'stories', [
      { method: 'select', args: ['id,title,excerpt,author,created_at,early_access_until'] },
      { method: 'order', args: ['created_at', { ascending: false }] }
    ]);
    render = renderStoryLinks;
  } else if (path === '/khan-catalog') {
    targetId = 'khanCatalogGrid';
    // Keep this request identical to the browser request so server HTML and hydrated UI
    // share the exact same cached collection snapshot.
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

  let html = await response.text();
  const discoveryHtml = render(rows);
  if (discoveryHtml) html = replaceElementInnerHtml(html, targetId, discoveryHtml);

  // TEST must be internally consistent: both HTTP header and raw HTML robots are noindex,nofollow.
  // PROD remains index,follow for these public Floods catalog pages.
  if (path === '/floods' || path === '/floods/judean-desert' || path === '/floods/negev-arava') {
    html = setRobotsMeta(html, isTestHost(url.hostname) ? 'noindex,nofollow' : 'index,follow');
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-Discovery-Render', discoveryHtml ? 'server-links' : 'no-links');

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
