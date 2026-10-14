import { getSupabasePublicConfig, publicSupabaseHeaders } from './_supabase-public.mjs';

const CACHE_SECONDS = 2_592_000;
const STALE_SECONDS = 3_600;
const NOT_FOUND_CACHE_SECONDS = 30;

const ENTITY_CONFIG = Object.freeze({
  point: { table: 'routes', tags: id => [`point:${id}`, 'points-products'], filters: [['status','eq.פורסם'],['route_type','neq.מסלול טיול']] },
  khan: { table: 'khans', tags: id => [`khan:${id}`, 'khans-products'], filters: [] },
  article: { table: 'articles', tags: id => [`article:${id}`, 'articles-products'], filters: [] }
});

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...extraHeaders } });
}

export default async (request) => {
  if (request.method !== 'GET') return json({ error:'Method not allowed' },405,{ Allow:'GET' });

  const { url: supabaseUrl, key: supabaseKey, environment, source } = getSupabasePublicConfig(request);
  if (!supabaseUrl || !supabaseKey) return json({ error:'Server configuration error' },500);

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || '').trim();
  const id = (url.searchParams.get('id') || '').trim();
  const config = ENTITY_CONFIG[type];
  if (!config) return json({ error:'Invalid content type' },400);
  if (!/^\d+$/.test(id)) return json({ error:'Invalid content id' },400);

  const params = new URLSearchParams({ select:'*', id:`eq.${id}`, limit:'1' });
  for (const [key,value] of config.filters) params.set(key,value);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${config.table}?${params.toString()}`, { headers: publicSupabaseHeaders(supabaseKey) });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Supabase ${type} request failed`, response.status, details, { environment, source });
      return json({ error:'Content lookup failed' },502);
    }
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const tags = config.tags(id).join(',');
    if (!row) return json({ error:'Content not found' },404,{
      'Netlify-CDN-Cache-Control':`public, durable, max-age=${NOT_FOUND_CACHE_SECONDS}`,
      'Netlify-Cache-Tag':tags,
      'X-JDJ-Data-Environment':environment
    });
    return json({ data:row },200,{
      'Netlify-CDN-Cache-Control':`public, durable, max-age=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      'Netlify-Cache-Tag':tags,
      'X-JDJ-Data-Environment':environment
    });
  } catch (error) {
    console.error(`${type} cache function failed`, error);
    return json({ error:'Temporary content service error' },500);
  }
};
