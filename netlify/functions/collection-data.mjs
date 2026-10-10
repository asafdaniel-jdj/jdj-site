const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;

const COLLECTION_CACHE_SECONDS = 86_400; // 24 hours
const COLLECTION_STALE_SECONDS = 3_600; // 1 hour
const RECOMMENDED_CACHE_SECONDS = 86_400; // 24 hours
const NOT_FOUND_CACHE_SECONDS = 30;

const ALLOWED_TABLES = new Set([
  'routes',
  'khans',
  'articles',
  'pages',
  'floods_page_config',
  'flood_rivers',
  'flood_river_points',
  'route_points',
  'authors'
]);

const ALLOWED_OPS = new Set([
  'select', 'eq', 'neq', 'in', 'not', 'order', 'limit', 'range',
  'is', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'or', 'filter'
]);

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

function scalar(value) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  return String(value);
}

function buildParams(ops) {
  const params = new URLSearchParams();

  for (const op of ops) {
    if (!op || !ALLOWED_OPS.has(op.method) || !Array.isArray(op.args)) {
      throw new Error('Unsupported collection query operation');
    }

    const [a, b, c] = op.args;

    switch (op.method) {
      case 'select':
        params.set('select', String(a || '*'));
        break;
      case 'eq':
      case 'neq':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
      case 'like':
      case 'ilike':
      case 'is':
        params.set(String(a), `${op.method}.${scalar(b)}`);
        break;
      case 'in': {
        if (!Array.isArray(b)) throw new Error('Invalid in() value');
        params.set(String(a), `in.(${b.map(scalar).join(',')})`);
        break;
      }
      case 'not':
        params.set(String(a), `not.${String(b)}.${scalar(c)}`);
        break;
      case 'order': {
        const options = b && typeof b === 'object' ? b : {};
        const direction = options.ascending === false ? 'desc' : 'asc';
        const nulls = options.nullsFirst === true ? '.nullsfirst' : (options.nullsFirst === false ? '.nullslast' : '');
        const foreignTable = options.referencedTable || options.foreignTable;
        const key = foreignTable ? `${foreignTable}.order` : 'order';
        params.append(key, `${String(a)}.${direction}${nulls}`);
        break;
      }
      case 'limit': {
        const options = b && typeof b === 'object' ? b : {};
        const foreignTable = options.referencedTable || options.foreignTable;
        params.set(foreignTable ? `${foreignTable}.limit` : 'limit', String(a));
        break;
      }
      case 'range': {
        const from = Number(a);
        const to = Number(b);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) {
          throw new Error('Invalid range');
        }
        params.set('offset', String(from));
        params.set('limit', String(to - from + 1));
        break;
      }
      case 'or':
        params.set('or', `(${String(a)})`);
        break;
      case 'filter':
        params.set(String(a), `${String(b)}.${scalar(c)}`);
        break;
      default:
        throw new Error('Unsupported collection query operation');
    }
  }

  if (!params.has('select')) params.set('select', '*');
  return params;
}

function isRecommendedQuery(table, ops) {
  return table === 'routes' && ops.some((op) => (
    op.method === 'eq' && op.args?.[0] === 'is_recommended' && op.args?.[1] === true
  ));
}

function cacheTags(table, scope, recommended) {
  const tags = ['collections', `table:${table}`];
  if (scope) tags.push(`collection:${scope}`);
  if (recommended) tags.push('recommended');
  return tags.join(',');
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
  const table = (url.searchParams.get('table') || '').trim();
  const mode = (url.searchParams.get('mode') || 'many').trim();
  const scope = (url.searchParams.get('scope') || '').trim().replace(/,/g, '_').slice(0, 300);
  const rawOps = url.searchParams.get('ops') || '[]';

  if (!ALLOWED_TABLES.has(table)) {
    return json({ error: 'Table not allowed' }, 400);
  }

  if (!['many', 'single', 'maybeSingle'].includes(mode)) {
    return json({ error: 'Invalid response mode' }, 400);
  }

  let ops;
  try {
    ops = JSON.parse(rawOps);
    if (!Array.isArray(ops) || ops.length > 30) throw new Error('Invalid operations');
  } catch {
    return json({ error: 'Invalid operations' }, 400);
  }

  try {
    const params = buildParams(ops);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Supabase collection ${table} failed`, response.status, details);
      return json({ error: 'Collection lookup failed' }, 502);
    }

    const rows = await response.json();
    const list = Array.isArray(rows) ? rows : [];
    const recommended = isRecommendedQuery(table, ops);
    const ttl = recommended ? RECOMMENDED_CACHE_SECONDS : COLLECTION_CACHE_SECONDS;
    const tags = cacheTags(table, scope, recommended);

    if (mode === 'single') {
      if (list.length !== 1) {
        return json({ data: null, errorCode: 'PGRST116' }, 404, {
          'Netlify-CDN-Cache-Control': `public, durable, max-age=${NOT_FOUND_CACHE_SECONDS}`,
          'Netlify-Cache-Tag': tags
        });
      }
      return json({ data: list[0] }, 200, {
        'Netlify-CDN-Cache-Control': `public, durable, max-age=${ttl}, stale-while-revalidate=${COLLECTION_STALE_SECONDS}`,
        'Netlify-Cache-Tag': tags
      });
    }

    if (mode === 'maybeSingle') {
      if (list.length > 1) {
        return json({ data: null, errorCode: 'PGRST116' }, 409);
      }
      return json({ data: list[0] || null }, 200, {
        'Netlify-CDN-Cache-Control': `public, durable, max-age=${ttl}, stale-while-revalidate=${COLLECTION_STALE_SECONDS}`,
        'Netlify-Cache-Tag': tags
      });
    }

    return json({ data: list }, 200, {
      'Netlify-CDN-Cache-Control': `public, durable, max-age=${ttl}, stale-while-revalidate=${COLLECTION_STALE_SECONDS}`,
      'Netlify-Cache-Tag': tags
    });
  } catch (error) {
    console.error('Collection cache function failed', error);
    return json({ error: 'Temporary collection service error' }, 500);
  }
};
