const SUPABASE_URL = Netlify.env.get('JDJ_SUPABASE_URL');
const SUPABASE_KEY = Netlify.env.get('JDJ_SUPABASE_KEY');

const SEO_SHARED_CACHE_NAME = 'jdj-seo-data-v1';
const SEO_METADATA_CACHE_SECONDS = 86_400; // 24 hours; Admin mutations purge the relevant tags immediately.
const SEO_METADATA_STALE_SECONDS = 3_600;

function normalizePath(pathname = '/') {
  return pathname.endsWith('.html') ? pathname.slice(0, -5) : pathname;
}

function lookupKeys(url) {
  const path = normalizePath(url.pathname);
  const id = (url.searchParams.get('id') || '').trim();

  if (['/item', '/point', '/khan', '/article'].includes(path)) {
    if (!/^\d+$/.test(id)) return null;
    const map = {
      '/item': { templateKey: 'item', seoKey: `ITEM:${id}` },
      '/point': { templateKey: 'point', seoKey: `POINT:${id}` },
      '/khan': { templateKey: 'khan', seoKey: `KHAN:${id}` },
      '/article': { templateKey: 'article', seoKey: `ARTICLE:${id}` }
    };
    return map[path];
  }

  if (/^\/floods\/[^/]+\/[^/]+$/.test(path)) {
    const slug = path.split('/').pop();
    if (!slug) return null;
    return { templateKey: 'flood_river', seoKey: `FLOOD_RIVER:${slug}` };
  }

  return null;
}

function templateUrl(templateKey) {
  const params = new URLSearchParams({
    select: '*',
    template_key: `eq.${templateKey}`,
    is_active: 'eq.true',
    limit: '1'
  });
  return `${SUPABASE_URL}/rest/v1/seo_templates?${params.toString()}`;
}

function overrideUrl(seoKey) {
  const params = new URLSearchParams({
    select: '*',
    seo_key: `eq.${seoKey}`,
    is_active: 'eq.true',
    limit: '1'
  });
  return `${SUPABASE_URL}/rest/v1/seo_overrides?${params.toString()}`;
}

async function prewarmOne(cache, url, tags) {
  const cacheKey = new Request(url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return 'HIT';

  const fresh = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }
  });

  if (!fresh.ok) return `BYPASS-${fresh.status}`;

  const body = await fresh.text();
  const headers = new Headers(fresh.headers);
  headers.set(
    'Cache-Control',
    `public, s-maxage=${SEO_METADATA_CACHE_SECONDS}, stale-while-revalidate=${SEO_METADATA_STALE_SECONDS}`
  );
  if (tags.length) headers.set('Netlify-Cache-Tag', tags.join(','));

  const cacheable = new Response(body, {
    status: fresh.status,
    statusText: fresh.statusText,
    headers
  });

  await cache.put(cacheKey, cacheable.clone());
  return 'MISS-STORED';
}

async function prewarmSeoMetadata(keys) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !keys) return ['BYPASS-CONFIG', 'BYPASS-CONFIG'];

  const cache = await caches.open(SEO_SHARED_CACHE_NAME);
  return Promise.all([
    prewarmOne(
      cache,
      templateUrl(keys.templateKey),
      [`seo-template:${keys.templateKey}`, 'seo-templates']
    ),
    prewarmOne(
      cache,
      overrideUrl(keys.seoKey),
      [`seo-override:${keys.seoKey}`, 'seo-overrides']
    )
  ]);
}

export default async function handler(request, context) {
  if (request.method !== 'GET') return context.next();

  const url = new URL(request.url);
  const keys = lookupKeys(url);
  if (!keys) return context.next();

  const started = performance.now();

  // Start the normal render and the SEO metadata lookup together. The entity itself is
  // intentionally NOT prefetched here, so it still has exactly one server read in seo-meta.
  const downstreamPromise = context.next();
  const prewarmPromise = prewarmSeoMetadata(keys).catch((error) => {
    console.warn('SEO metadata prewarm failed', error);
    return ['ERROR', 'ERROR'];
  });

  const [response, states] = await Promise.all([downstreamPromise, prewarmPromise]);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-SEO-Prewarm', `template:${states[0]},override:${states[1]}`);

  const existingTiming = headers.get('Server-Timing');
  const timing = `jdj_seo_prewarm;dur=${(performance.now() - started).toFixed(1)}`;
  headers.set('Server-Timing', existingTiming ? `${existingTiming}, ${timing}` : timing);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: [
    '/item', '/item.html',
    '/point', '/point.html',
    '/khan', '/khan.html',
    '/article', '/article.html',
    '/floods/:region/:slug'
  ]
};
