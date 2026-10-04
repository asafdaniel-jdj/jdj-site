// JDJ environment configuration
// Canonical file for this environment. Do not copy this file between DEV / TEST / PROD.
//
// Environment: TEST
// Database: Supabase TEST (jdj-routes-test)
//
// This file contains only public browser configuration. No service-role key or secret is stored here.

window.JDJ_ENV = Object.freeze({
  environment: "TEST",
  supabaseUrl: "https://sdekeyakrtdwmykvpbwq.supabase.co",
  supabaseKey: "sb_publishable_Zt1DlF4MDoNQcLvAybABZQ_FrKfqq5Z"
});

(() => {
  const url = window.JDJ_ENV?.supabaseUrl;
  if (!url || typeof document === "undefined" || !document.head) return;

  if (!document.querySelector('link[data-jdj-supabase-preconnect]')) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = url;
    link.crossOrigin = "anonymous";
    link.dataset.jdjSupabasePreconnect = "true";
    document.head.appendChild(link);
  }
})();

// JDJ-41 TEST: site-shell still performs one direct REST read for home_season_mode.
// Keep its existing response contract (Supabase array) while routing that one GET
// through the shared Netlify collection cache. Any failure falls back to Supabase.
(() => {
  if (typeof window.fetch !== 'function' || !window.JDJ_ENV?.supabaseUrl) return;

  const originalFetch = window.fetch.bind(window);
  const floodsConfigPrefix = `${window.JDJ_ENV.supabaseUrl}/rest/v1/floods_page_config`;

  window.fetch = async function jdjCachedFetch(input, init = {}) {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    const method = String(init?.method || input?.method || 'GET').toUpperCase();

    if (method === 'GET' && requestUrl?.startsWith(floodsConfigPrefix)) {
      try {
        const parsed = new URL(requestUrl);
        const isHomeSeasonRequest = parsed.searchParams.get('id') === 'eq.main' &&
          parsed.searchParams.get('select') === 'home_season_mode';

        if (isHomeSeasonRequest) {
          const ops = [
            { method: 'select', args: ['home_season_mode'] },
            { method: 'eq', args: ['id', 'main'] }
          ];
          const params = new URLSearchParams({
            table: 'floods_page_config',
            mode: 'many',
            scope: 'home-season-mode',
            ops: JSON.stringify(ops)
          });

          const cachedResponse = await originalFetch(`/.netlify/functions/collection-data?${params.toString()}`, {
            headers: { Accept: 'application/json' }
          });

          if (cachedResponse.ok) {
            const payload = await cachedResponse.json();
            return new Response(JSON.stringify(payload?.data || []), {
              status: 200,
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
          }
        }
      } catch (error) {
        console.warn('Floods config cache fallback to Supabase:', error);
      }
    }

    return originalFetch(input, init);
  };
})();
