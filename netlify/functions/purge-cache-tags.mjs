import { purgeCache } from '@netlify/functions';

const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;
const ALLOWED_ORIGIN = 'https://xadmin.jdj.co.il';
const MAX_TAGS = 30;

const ALLOWED_TAG_PREFIXES = [
  'route:', 'point:', 'khan:', 'article:',
  'routes:', 'khans:', 'articles:',
  'routes-products', 'points-products', 'khans-products', 'articles-products',
  'collection:', 'collections', 'table:', 'recommended',
  'seo-template:', 'seo-templates', 'seo-override:', 'seo-overrides', 'seo-data'
];

function corsHeaders(origin) {
  if (origin !== ALLOWED_ORIGIN) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(body, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });
}

async function isAdminAccessToken(token) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !token) return false;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_jdj_admin`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: '{}'
  });

  if (!response.ok) return false;
  return (await response.json()) === true;
}

function isAllowedTag(tag) {
  if (typeof tag !== 'string' || !tag || tag.length > 300 || tag.includes(',')) return false;
  return ALLOWED_TAG_PREFIXES.some((prefix) => tag === prefix || tag.startsWith(prefix));
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';

  if (request.method === 'OPTIONS') {
    if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  if (origin !== ALLOWED_ORIGIN) {
    return json({ error: 'Origin not allowed' }, 403, origin);
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return json({ error: 'Unauthorized' }, 401, origin);

  try {
    if (!(await isAdminAccessToken(token))) {
      return json({ error: 'Admin access required' }, 403, origin);
    }

    const body = await request.json().catch(() => ({}));
    const tags = Array.isArray(body?.tags) ? [...new Set(body.tags)] : [];

    if (!tags.length || tags.length > MAX_TAGS || !tags.every(isAllowedTag)) {
      return json({ error: 'Invalid cache tags' }, 400, origin);
    }

    await purgeCache({ tags });

    return json({
      ok: true,
      environment: 'PROD',
      tags,
      purgedAt: new Date().toISOString()
    }, 202, origin);
  } catch (error) {
    console.error('Targeted cache purge failed', error);
    return json({ error: 'Targeted cache purge failed' }, 500, origin);
  }
};
