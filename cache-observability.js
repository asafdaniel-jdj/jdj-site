(() => {
  'use strict';

  if (typeof window.fetch !== 'function' || window.__JDJ_CACHE_OBSERVABILITY_INSTALLED__) return;
  window.__JDJ_CACHE_OBSERVABILITY_INSTALLED__ = true;

  const originalFetch = window.fetch.bind(window);
  const recentFailures = [];
  const FAILURE_TTL_MS = 10_000;
  let forcedQaFallbackUsed = false;

  function pageKey() {
    return `${window.location.pathname}${window.location.search || ''}`;
  }

  function isNonProdHost() {
    const host = String(window.location.hostname || '').toLowerCase();
    return host === 'jdj-test.netlify.app' || host.endsWith('--jdj-test.netlify.app');
  }

  function forceFallbackQaEnabled() {
    if (!isNonProdHost()) return false;
    return new URLSearchParams(window.location.search).get('jdj_cache_debug') === 'fallback';
  }

  function emitQaEvent(type, detail = {}) {
    if (!isNonProdHost()) return;
    const message = {
      source: 'jdj-cache-observability',
      type,
      detail,
      page: pageKey(),
      at: new Date().toISOString()
    };

    try {
      window.dispatchEvent(new CustomEvent('jdj-cache-qa', { detail: message }));
    } catch (_) {}

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, window.location.origin);
      }
    } catch (_) {}
  }

  function reportFallback(payload) {
    try {
      originalFetch('/.netlify/functions/cache-fallback-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'fallback-to-supabase', ...payload }),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  function normalizeTableFromContentType(type) {
    if (type === 'point') return 'routes';
    if (type === 'khan') return 'khans';
    if (type === 'article') return 'articles';
    return null;
  }

  function cacheRequestInfo(rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      if (url.origin !== window.location.origin) return null;

      if (url.pathname === '/.netlify/functions/collection-data') {
        return {
          layer: 'collection-data',
          endpoint: url.pathname,
          table: url.searchParams.get('table') || null,
          type: null
        };
      }

      if (url.pathname === '/.netlify/functions/content-data') {
        const type = url.searchParams.get('type') || null;
        return {
          layer: 'content-data',
          endpoint: url.pathname,
          table: normalizeTableFromContentType(type),
          type
        };
      }
    } catch (_) {}
    return null;
  }

  function supabaseTable(rawUrl) {
    const base = window.JDJ_ENV?.supabaseUrl;
    if (!base) return null;
    try {
      const url = new URL(rawUrl, window.location.origin);
      const supabase = new URL(base);
      if (url.origin !== supabase.origin) return null;
      const match = url.pathname.match(/^\/rest\/v1\/([^/?]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (_) {
      return null;
    }
  }

  function pruneFailures(now = Date.now()) {
    while (recentFailures.length && now - recentFailures[0].time > FAILURE_TTL_MS) {
      recentFailures.shift();
    }
  }

  function rememberFailure(info, status, reason) {
    const event = {
      ...info,
      status: status ?? null,
      reason: String(reason || 'cache endpoint failed'),
      page: pageKey(),
      time: Date.now()
    };
    recentFailures.push(event);
    pruneFailures(event.time);

    const payload = {
      page: event.page,
      layer: event.layer,
      table: event.table,
      type: event.type,
      cacheEndpoint: event.endpoint,
      status: event.status,
      reason: event.reason
    };
    console.warn('JDJ_DATA_CACHE_ENDPOINT_FAILED', payload);
    emitQaEvent('cache-endpoint-failed', payload);
  }

  function logFallbackToSupabase(table, rawUrl) {
    pruneFailures();
    if (!table || recentFailures.length === 0) return;

    let index = -1;
    for (let i = recentFailures.length - 1; i >= 0; i -= 1) {
      if (!recentFailures[i].table || recentFailures[i].table === table) {
        index = i;
        break;
      }
    }
    if (index < 0) return;

    const failure = recentFailures.splice(index, 1)[0];
    let supabasePath = null;
    try {
      supabasePath = new URL(rawUrl, window.location.origin).pathname;
    } catch (_) {}

    const payload = {
      page: pageKey(),
      table,
      cacheLayer: failure.layer,
      cacheEndpoint: failure.endpoint,
      cacheStatus: failure.status,
      reason: failure.reason,
      supabasePath,
      elapsedMs: Date.now() - failure.time
    };
    console.warn('JDJ_DATA_CACHE_FALLBACK_TO_SUPABASE', payload);
    emitQaEvent('fallback-to-supabase', payload);
    reportFallback(payload);
  }

  window.fetch = async function jdjObservedFetch(input, init = {}) {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    const cacheInfo = rawUrl ? cacheRequestInfo(rawUrl) : null;
    const directTable = rawUrl ? supabaseTable(rawUrl) : null;

    if (directTable) logFallbackToSupabase(directTable, rawUrl);

    // TEST / Deploy Preview only: one forced cache failure makes the fallback path
    // deterministic to verify without breaking production traffic. Add
    // ?jdj_cache_debug=fallback to a public page and inspect the browser console.
    if (cacheInfo && forceFallbackQaEnabled() && !forcedQaFallbackUsed) {
      forcedQaFallbackUsed = true;
      rememberFailure(cacheInfo, 599, 'forced QA fallback');
      return new Response(JSON.stringify({ error: 'forced QA fallback' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    try {
      const response = await originalFetch(input, init);
      if (cacheInfo && !response.ok) {
        rememberFailure(cacheInfo, response.status, `HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      if (cacheInfo) {
        rememberFailure(
          cacheInfo,
          null,
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  };
})();
