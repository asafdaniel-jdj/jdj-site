import { getSupabasePublicConfig, publicSupabaseHeaders } from './_supabase-public.mjs';

const CACHE_SECONDS = 2_592_000;
const STALE_SECONDS = 3_600;
const NOT_FOUND_CACHE_SECONDS = 30;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...extraHeaders } });
}

export default async (request) => {
  if (request.method !== 'GET') return json({ error:'Method not allowed' },405,{ Allow:'GET' });

  const { url: supabaseUrl, key: supabaseKey, environment, source } = getSupabasePublicConfig(request);
  if (!supabaseUrl || !supabaseKey) return json({ error:'Server configuration error' },500);

  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!/^\d+$/.test(id)) return json({ error:'Invalid route id' },400);

  const params = new URLSearchParams({ select:'*', status:'eq.פורסם', route_type:'eq.מסלול טיול', id:`eq.${id}`, limit:'1' });
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/routes?${params.toString()}`, { headers: publicSupabaseHeaders(supabaseKey) });
    if (!response.ok) {
      const details = await response.text();
      console.error('Supabase route request failed', response.status, details, { environment, source });
      return json({ error:'Route lookup failed' },502);
    }
    const rows = await response.json();
    const route = Array.isArray(rows) ? rows[0] : null;
    if (!route) return json({ error:'Route not found' },404,{
      'Netlify-CDN-Cache-Control':`public, durable, max-age=${NOT_FOUND_CACHE_SECONDS}`,
      'Netlify-Cache-Tag':`route:${id},routes-products`,
      'X-JDJ-Data-Environment':environment
    });
    return json({ data:route },200,{
      'Netlify-CDN-Cache-Control':`public, durable, max-age=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      'Netlify-Cache-Tag':`route:${id},routes-products`,
      'X-JDJ-Data-Environment':environment
    });
  } catch (error) {
    console.error('Route cache function failed', error);
    return json({ error:'Temporary route service error' },500);
  }
};
