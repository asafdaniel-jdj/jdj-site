const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;
const CACHE_SECONDS = 3_600;

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

function isPubliclyVisible(row, nowMs = Date.now()) {
  if (!row || !row.early_access_until) return true;
  const until = Date.parse(row.early_access_until);
  return !Number.isFinite(until) || until <= nowMs;
}

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing JDJ_SUPABASE_URL / JDJ_SUPABASE_KEY');
    return json({ error: 'Server configuration error' }, 500);
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/routes`);
  url.searchParams.set('select', '*');
  url.searchParams.set('status', 'eq.פורסם');
  url.searchParams.set('route_type', 'eq.מסלול טיול');
  url.searchParams.set('is_recommended', 'eq.true');
  url.searchParams.set('order', 'id.desc');

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('Recommended routes lookup failed', response.status, details);
      return json({ error: 'Recommended routes lookup failed' }, 502);
    }

    const rows = await response.json();
    const nowMs = Date.now();
    const data = (Array.isArray(rows) ? rows : []).filter(row => isPubliclyVisible(row, nowMs));

    return json({ data }, 200, {
      'Netlify-CDN-Cache-Control': `public, durable, max-age=${CACHE_SECONDS}`,
      'Netlify-Cache-Tag': 'recommended,table:routes,routes-products',
      'X-JDJ-Recommended-Cache': 'shared-1h'
    });
  } catch (error) {
    console.error('Recommended routes cache failed', error);
    return json({ error: 'Temporary recommended routes service error' }, 500);
  }
};
