const SUPABASE_URL = 'https://edjmwcnxsqnsxqrcsjxp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FElRjSrrcMn2qadsyDDLPA_08YQsz2i';
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

function buildSitemap(routes, khans, articles) {
  const urls = new Set(STATIC_URLS.map(path => `${SITE_URL}${path}`));

  for (const route of routes) {
    if (route?.id == null) continue;
    const page = route.route_type === 'מסלול טיול' ? 'item' : 'point';
    urls.add(`${SITE_URL}/${page}?id=${encodeURIComponent(route.id)}`);
  }

  for (const khan of khans) {
    if (khan?.id == null) continue;
    urls.add(`${SITE_URL}/khan?id=${encodeURIComponent(khan.id)}`);
  }

  for (const article of articles) {
    if (article?.id == null) continue;
    urls.add(`${SITE_URL}/article?id=${encodeURIComponent(article.id)}`);
  }

  const entries = [...urls]
    .map(url => `  <url>\n    <loc>${xmlEscape(url)}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

exports.handler = async function handler() {
  try {
    const [routes, khans, articles] = await Promise.all([
      supabaseSelect('routes', 'id,route_type', [['status', 'eq.פורסם']]),
      supabaseSelect('khans', 'id'),
      supabaseSelect('articles', 'id')
    ]);

    const xml = buildSitemap(routes, khans, articles);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
      },
      body: xml
    };
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: 'Sitemap temporarily unavailable'
    };
  }
};

// Exported only to make local validation possible; Netlify uses handler above.
exports._test = { buildSitemap, xmlEscape };
