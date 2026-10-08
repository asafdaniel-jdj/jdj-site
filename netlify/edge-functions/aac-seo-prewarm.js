const SUPABASE_URL = Netlify.env.get('JDJ_SUPABASE_URL');
const SUPABASE_KEY = Netlify.env.get('JDJ_SUPABASE_KEY');

const SEO_SHARED_CACHE_NAME = 'jdj-seo-data-v1';
const SEO_CACHE_SECONDS = 86_400; // 24 hours; Admin mutations purge the relevant tags immediately.
const SEO_STALE_SECONDS = 3_600;

function normalizePath(pathname = '/') {
  return pathname.endsWith('.html') ? pathname.slice(0, -5) : pathname;
}

function requestDescriptor(url) {
  const path = normalizePath(url.pathname);
  const id = (url.searchParams.get('id') || '').trim();

  if (['/item', '/point', '/khan', '/article'].includes(path)) {
    if (!/^\d+$/.test(id)) return null;

    const meta = {
      '/item': { templateKey: 'item', seoKey: `ITEM:${id}` },
      '/point': { templateKey: 'point', seoKey: `POINT:${id}` },
      '/khan': { templateKey: 'khan', seoKey: `KHAN:${id}` },
      '/article': { templateKey: 'article', seoKey: `ARTICLE:${id}` }
    }[path];

    let table = 'routes';
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('id', `eq.${id}`);
    params.set('limit', '1');

    if (path === '/item') {
      params.set('status', 'eq.פורסם');
      params.set('route_type', 'eq.מסלול טיול');
    } else if (path === '/point') {
      params.set('status', 'eq.פורסם');
      params.set('route_type', 'neq.מסלול טיול');
    } else if (path === '/khan') {
      table = 'khans';
    } else if (path === '/article') {
      table = 'articles';
    }

    return {
      ...meta,
      entityUrl: `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`,
      entityTags: [`${table}:${id}`, `${table}-products`]
    };
  }

  if (/^\/floods\/[^/]+\/[^/]+$/.test(path)) {
    const slug = path.split('/').pop();
    if (!slug) return null;
    return {
      templateKey: 'flood_river',
      seoKey: `FLOOD_RIVER:${slug}`,
      entityUrl: null,
      entityTags: []
    };
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

async function warmOne(cache, url, tags) {
  if (!url) return 'N/A';

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
    `public, s-maxage=${SEO_CACHE_SECONDS}, stale-while-revalidate=${SEO_STALE_SECONDS}`
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

async function warmInputs(descriptor) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !descriptor) {
    return { entity: 'BYPASS-CONFIG', template: 'BYPASS-CONFIG', override: 'BYPASS-CONFIG' };
  }

  const cache = await caches.open(SEO_SHARED_CACHE_NAME);
  const [entity, template, override] = await Promise.all([
    warmOne(cache, descriptor.entityUrl, descriptor.entityTags),
    warmOne(
      cache,
      templateUrl(descriptor.templateKey),
      [`seo-template:${descriptor.templateKey}`, 'seo-templates']
    ),
    warmOne(
      cache,
      overrideUrl(descriptor.seoKey),
      [`seo-override:${descriptor.seoKey}`, 'seo-overrides']
    )
  ]);

  return { entity, template, override };
}

export default async function handler(request, context) {
  if (request.method !== 'GET') return context.next();

  const url = new URL(request.url);
  const descriptor = requestDescriptor(url);
  if (!descriptor) return context.next();

  const totalStarted = performance.now();
  const warmStarted = performance.now();
  let states;

  try {
    states = await warmInputs(descriptor);
  } catch (error) {
    console.warn('SEO input warmup failed', error);
    states = { entity: 'ERROR', template: 'ERROR', override: 'ERROR' };
  }

  const warmMs = performance.now() - warmStarted;
  const downstreamStarted = performance.now();
  const response = await context.next();
  const downstreamAfterWarmMs = performance.now() - downstreamStarted;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set(
    'X-JDJ-SEO-Prewarm',
    `entity:${states.entity},template:${states.template},override:${states.override}`
  );

  const existingTiming = headers.get('Server-Timing');
  const timings = [
    `jdj_seo_input_warm;dur=${warmMs.toFixed(1)}`,
    `jdj_downstream_after_warm;dur=${downstreamAfterWarmMs.toFixed(1)}`,
    `jdj_seo_prewarm;dur=${(performance.now() - totalStarted).toFixed(1)}`
  ].join(', ');
  headers.set('Server-Timing', existingTiming ? `${existingTiming}, ${timings}` : timings);

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
