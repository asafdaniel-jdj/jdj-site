import { getSupabasePublicConfig, publicSupabaseHeaders } from './_supabase-public.mjs';

const CACHE_SECONDS = 2_592_000;
const STALE_SECONDS = 3_600;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...headers } });
}

async function supabaseSingle(supabaseUrl, supabaseKey, table, filters) {
  const params = new URLSearchParams({ select:'*', ...filters, limit:'1' });
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, { headers: publicSupabaseHeaders(supabaseKey) });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${table} failed: ${response.status} ${details}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async (request) => {
  if (request.method !== 'GET') return json({ error:'Method not allowed' },405,{ Allow:'GET' });

  const { url: supabaseUrl, key: supabaseKey, environment } = getSupabasePublicConfig(request);
  if (!supabaseUrl || !supabaseKey) return json({ error:'Server configuration error' },500);

  const url = new URL(request.url);
  const templateKey = (url.searchParams.get('templateKey') || '').trim();
  const seoKey = (url.searchParams.get('seoKey') || '').trim();
  if (!templateKey && !seoKey) return json({ error:'Missing SEO lookup key' },400);

  try {
    const [template, override] = await Promise.all([
      templateKey ? supabaseSingle(supabaseUrl, supabaseKey, 'seo_templates', { template_key:`eq.${templateKey}`, is_active:'eq.true' }) : Promise.resolve(null),
      seoKey ? supabaseSingle(supabaseUrl, supabaseKey, 'seo_overrides', { seo_key:`eq.${seoKey}`, is_active:'eq.true' }) : Promise.resolve(null)
    ]);
    const tags = ['seo-data'];
    if (templateKey) tags.push(`seo-template:${templateKey}`,'seo-templates');
    if (seoKey) tags.push(`seo-override:${seoKey}`,'seo-overrides');
    return json({ template, override },200,{
      'Netlify-CDN-Cache-Control':`public, durable, max-age=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      'Netlify-Cache-Tag':tags.join(','),
      'X-JDJ-Data-Environment':environment
    });
  } catch (error) {
    console.error('SEO data function failed', error);
    return json({ error:'Temporary SEO service error' },500);
  }
};
