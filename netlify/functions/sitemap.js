const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing JDJ_SUPABASE_URL / JDJ_SUPABASE_KEY environment variables');
}
const SITE_URL = 'https://jdj.co.il';

const STATIC_URLS = [
  '/',
  '/category?type=routes',
  '/category?type=routes&region=%D7%9E%D7%93%D7%91%D7%A8%20%D7%99%D7%94%D7%95%D7%93%D7%94',
  '/category?type=routes&region=%D7%91%D7%A7%D7%A2%D7%AA%20%D7%94%D7%99%D7%A8%D7%93%D7%9F',
  '/category?type=routes&region=%D7%94%D7%A9%D7%95%D7%9E%D7%A8%D7%95%D7%9F',
  '/category?type=routes&region=%D7%94%D7%A0%D7%92%D7%91%20%D7%95%D7%94%D7%A2%D7%A8%D7%91%D7%94',
  '/category?type=technical',
  '/category?type=viewpoints',
  '/category?type=water',
  '/category?type=poi',
  '/khan-catalog',
  '/stories',
  '/floods',
  '/floods/judean-desert',
  '/floods/negev-arava',
  '/access',
  '/mview',
  '/camp',
  '/about',
  '/disclaimer',
  '/accessibility'
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function supabaseSelect(table, select, filters = []) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', select);
  for (const [key, value] of filters) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Supabase ${table} failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`Supabase ${table} returned an unexpected response`);
  }
  return data;
}

function isPubliclyVisible(row, nowMs = Date.now()) {
  if (!row || !row.early_access_until) return true;
  const until = Date.parse(row.early_access_until);
  return !Number.isFinite(until) || until <= nowMs;
}

function buildSitemap(routes, khans, articles, floodRivers = []) {
  const urls = new Set(STATIC_URLS.map(path => `${SITE_URL}${path}`));
  const nowMs = Date.now();

  for (const route of routes) {
    if (route?.id == null || !isPubliclyVisible(route, nowMs)) continue;
    const page = route.route_type === 'מסלול טיול' ? 'item' : 'point';
    urls.add(`${SITE_URL}/${page}?id=${encodeURIComponent(route.id)}`);
  }

  for (const khan of khans) {
    if (khan?.id == null || !isPubliclyVisible(khan, nowMs)) continue;
    urls.add(`${SITE_URL}/khan?id=${encodeURIComponent(khan.id)}`);
  }

  for (const article of articles) {
    if (article?.id == null || !isPubliclyVisible(article, nowMs)) continue;
    urls.add(`${SITE_URL}/article?id=${encodeURIComponent(article.id)}`);
  }

  for (const river of floodRivers) {
    if (!river?.slug || !river?.region_slug) continue;
    urls.add(`${SITE_URL}/floods/${encodeURIComponent(river.region_slug)}/${encodeURIComponent(river.slug)}`);
  }

  const entries = [...urls]
    .map(url => `  <url>\n    <loc>${xmlEscape(url)}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function isTestHost(host = '') {
  const normalized = String(host || '').toLowerCase().split(':')[0];
  return normalized === 'jdj-test.netlify.app' || normalized.endsWith('--jdj-test.netlify.app');
}

function responseHeaders(event, cacheControl) {
  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': cacheControl
  };
  if (isTestHost(event?.headers?.host || event?.headers?.Host || '')) {
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }
  return headers;
}

exports.handler = async function handler(event) {
  try {
    const [routes, khans, articles, floodRivers] = await Promise.all([
      supabaseSelect('routes', 'id,route_type,early_access_until', [['status', 'eq.פורסם']]),
      supabaseSelect('khans', 'id,early_access_until'),
      supabaseSelect('articles', 'id,early_access_until'),
      supabaseSelect('flood_rivers', 'slug,region_slug', [['status', 'eq.published']])
    ]);

    const xml = buildSitemap(routes, khans, articles, floodRivers);

    return {
      statusCode: 200,
      headers: responseHeaders(event, 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'),
      body: xml
    };
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    const headers = responseHeaders(event, 'no-store');
    headers['Content-Type'] = 'text/plain; charset=utf-8';
    return {
      statusCode: 503,
      headers,
      body: 'Sitemap temporarily unavailable'
    };
  }
};

exports._test = { buildSitemap, xmlEscape, isPubliclyVisible, isTestHost };
