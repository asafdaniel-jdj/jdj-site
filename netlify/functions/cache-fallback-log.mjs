const MAX_BODY_BYTES = 4_096;
const ALLOWED_LAYERS = new Set(['collection-data', 'content-data']);

function noContent(status = 204) {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

function isAllowedOrigin(origin = '') {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'jdj.co.il' ||
      host === 'jdj-test.netlify.app' ||
      host.endsWith('--jdj-test.netlify.app');
  } catch (_) {
    return false;
  }
}

function cleanString(value, max = 300) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/[\r\n\t]/g, ' ').slice(0, max);
}

export default async (request) => {
  if (request.method !== 'POST') return noContent(405);

  const origin = request.headers.get('origin') || '';
  if (!isAllowedOrigin(origin)) return noContent(403);

  const length = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return noContent(413);

  try {
    const payload = await request.json();
    if (!payload || payload.event !== 'fallback-to-supabase') return noContent(400);
    if (!ALLOWED_LAYERS.has(payload.cacheLayer)) return noContent(400);

    const log = {
      event: 'JDJ_DATA_CACHE_FALLBACK_TO_SUPABASE',
      page: cleanString(payload.page, 400),
      table: cleanString(payload.table, 100),
      cacheLayer: payload.cacheLayer,
      cacheEndpoint: cleanString(payload.cacheEndpoint, 200),
      cacheStatus: Number.isFinite(Number(payload.cacheStatus)) ? Number(payload.cacheStatus) : null,
      reason: cleanString(payload.reason, 300),
      supabasePath: cleanString(payload.supabasePath, 300),
      elapsedMs: Number.isFinite(Number(payload.elapsedMs)) ? Number(payload.elapsedMs) : null,
      reportedAt: new Date().toISOString()
    };

    console.warn('JDJ_DATA_CACHE_FALLBACK_TO_SUPABASE', JSON.stringify(log));
    return noContent(204);
  } catch (error) {
    console.error('Invalid cache fallback log payload', error instanceof Error ? error.message : String(error));
    return noContent(400);
  }
};
