const PAGE_CACHE_SECONDS = 2_592_000; // 30 days
const PAGE_STALE_SECONDS = 3_600; // 1 hour
const PAGE_CACHE_VERSION = Netlify.env.get('COMMIT_REF') || Netlify.env.get('DEPLOY_ID') || 'runtime';
const PAGE_CACHE_NAME = `jdj-rendered-pages-v2-${PAGE_CACHE_VERSION}`;

function normalizePath(pathname = '/') {
  return pathname.endsWith('.html') ? pathname.slice(0, -5) : pathname;
}

function contentTag(url) {
  const path = normalizePath(url.pathname);
  const id = (url.searchParams.get('id') || '').trim();
  if (!/^\d+$/.test(id)) return null;
  if (path === '/item') return `route:${id}`;
  if (path === '/point') return `point:${id}`;
  if (path === '/khan') return `khan:${id}`;
  if (path === '/article') return `article:${id}`;
  return null;
}

function cacheTags(url) {
  const path = normalizePath(url.pathname);
  const tags = ['seo-data'];
  const entityTag = contentTag(url);
  if (entityTag) tags.push(entityTag);

  if (path === '/item') tags.push('routes-products');
  if (path === '/point') tags.push('points-products');
  if (path === '/khan') tags.push('khans-products');
  if (path === '/article') tags.push('articles-products');

  if (path === '/') {
    tags.push('collections', 'recommended', 'table:routes', 'table:articles', 'table:khans', 'table:pages');
  } else if (path === '/category') {
    const type = url.searchParams.get('type') || 'routes';
    tags.push('collections', 'table:routes', `collection:category:${type}`);
  } else if (path === '/stories') {
    tags.push('collections', 'table:articles', 'collection:stories');
  } else if (path === '/khan-catalog') {
    tags.push('collections', 'table:khans', 'table:pages', 'collection:khans');
  } else if (path === '/floods') {
    tags.push('collections', 'table:floods_page_config', 'table:flood_rivers', 'table:articles');
  } else if (path.startsWith('/floods/')) {
    tags.push('collections', 'table:flood_rivers', 'table:flood_river_points', 'table:floods_page_config');
  }

  return [...new Set(tags)].join(',');
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  headers.set('X-JDJ-Page-Cache-Version', PAGE_CACHE_VERSION.slice(0, 12));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default async function handler(request, context) {
  if (request.method !== 'GET') return context.next();
  if (request.headers.get('authorization')) return context.next();

  const url = new URL(request.url);
  const cache = await caches.open(PAGE_CACHE_NAME);
  const cacheKey = new Request(url.toString(), { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return withHeader(cached, 'X-JDJ-Page-Cache', 'HIT');

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  const earlyAccess = response.headers.get('X-JDJ-Early-Access') === '1';

  if (!response.ok || !contentType.includes('text/html') || earlyAccess) {
    return withHeader(response, 'X-JDJ-Page-Cache', earlyAccess ? 'BYPASS-EARLY-ACCESS' : 'BYPASS');
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('Cache-Control', `public, max-age=0, s-maxage=${PAGE_CACHE_SECONDS}, stale-while-revalidate=${PAGE_STALE_SECONDS}`);
  headers.set('Netlify-Cache-Tag', cacheTags(url));
  headers.set('X-JDJ-Page-Cache', 'MISS-STORED');
  headers.set('X-JDJ-Page-Cache-Version', PAGE_CACHE_VERSION.slice(0, 12));

  const cacheable = new Response(await response.text(), {
    status: response.status,
    statusText: response.statusText,
    headers
  });

  await cache.put(cacheKey, cacheable.clone());
  return cacheable;
}

export const config = {
  path: [
    '/', '/index.html',
    '/about', '/about.html',
    '/access', '/access.html',
    '/accessibility', '/accessibility.html',
    '/article', '/article.html',
    '/camp', '/camp.html',
    '/category', '/category.html',
    '/disclaimer', '/disclaimer.html',
    '/item', '/item.html',
    '/khan-catalog', '/khan-catalog.html',
    '/khan', '/khan.html',
    '/mview', '/mview.html',
    '/point', '/point.html',
    '/stories', '/stories.html',
    '/floods',
    '/floods/judean-desert',
    '/floods/negev-arava',
    '/floods/:region/:slug'
  ]
};
