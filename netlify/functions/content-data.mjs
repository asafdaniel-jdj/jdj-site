const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;

const CACHE_SECONDS = 2_592_000; // 30 days
const STALE_SECONDS = 3_600; // 1 hour grace
const NOT_FOUND_CACHE_SECONDS = 30;

const ENTITY_CONFIG = Object.freeze({
  point: {
    table: 'routes',
    tags: (id) => [`point:${id}`, 'points-products'],
    filters: [
      ['status', 'eq.פורסם'],
      ['route_type', 'neq.מסלול טיול']
    ]
  },
  khan: {
    table: 'khans',
    tags: (id) => [`khan:${id}`, 'khans-products'],
    filters: []
  },
  article: {
    table: 'articles',
    tags: (id) => [`article:${id}`, 'articles-products'],
    filters: []
  }
});

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing JDJ_SUPABASE_URL / JDJ_SUPABASE_KEY');
    return json({ error: 'Server configuration error' }, 500);
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || '').trim();
  const id = (url.searchParams.get('id') || '').trim();
  const config = ENTITY_CONFIG[type];

  if (!config) {
    return json({ error: 'Invalid content type' }, 400);
  }

  if (!/^\d+$/.test(id)) {
    return json({ error: 'Invalid content id' }, 400);
  }

  const params = new URLSearchParams({
    select: '*',
    id: `eq.${id}`,
    limit: '1'
  });

  for (const [key, value] of config.filters) {
    params.set(key, value);
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${config.table}?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Supabase ${type} request failed`, response.status, details);
      return json({ error: 'Content lookup failed' }, 502);
    }

    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const tags = config.tags(id).join(',');

    if (!row) {
      return json({ error: 'Content not found' }, 404, {
        'Netlify-CDN-Cache-Control': `public, durable, max-age=${NOT_FOUND_CACHE_SECONDS}`,
        'Netlify-Cache-Tag': tags
      });
    }

    return json({ data: row }, 200, {
      'Netlify-CDN-Cache-Control': `public, durable, max-age=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      'Netlify-Cache-Tag': tags
    });
  } catch (error) {
    console.error(`${type} cache function failed`, error);
    return json({ error: 'Temporary content service error' }, 500);
  }
};
