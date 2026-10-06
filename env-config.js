// JDJ environment configuration
// Canonical file for this environment. Do not copy this file between DEV / TEST / PROD.
//
// Environment: PROD
// Database: Supabase PROD (jdj-routes)
//
// This file contains only public browser configuration. No service-role key or secret is stored here.

window.JDJ_ENV = Object.freeze({
  environment: "PROD",
  supabaseUrl: "https://edjmwcnxsqnsxqrcsjxp.supabase.co",
  supabaseKey: "sb_publishable_FElRjSrrcMn2qadsyDDLPA_08YQsz2i"
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

// JDJ-41: site-shell still performs one direct REST read for home_season_mode.
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

// JDJ-43: make natural-language search resilient.
// 1) Strip generic time words from AI must_match/any_of even if the model returns them.
// 2) If ai-search is unavailable, return deterministic basic filters instead of forcing
//    the frontend into a literal full-sentence text search that commonly returns 0 results.
(() => {
  if (typeof window.fetch !== 'function' || !window.JDJ_ENV?.supabaseUrl) return;

  const previousFetch = window.fetch.bind(window);
  const aiSearchUrl = `${window.JDJ_ENV.supabaseUrl}/functions/v1/ai-search`;
  const TEMPORAL_NOISE = new Set([
    'שבת', 'בשבת', 'השבת', 'סופש', 'בסופש', 'סופ״ש', 'בסופ״ש', 'סופ"ש', 'בסופ"ש',
    'סוף השבוע', 'בסוף השבוע', 'השבוע', 'בשבוע', 'היום', 'מחר', 'מחרתיים',
    'בבוקר', 'בצהריים', 'בערב', 'בלילה', 'בצהרי', 'בוקר', 'צהריים', 'ערב', 'לילה'
  ]);

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[׳’‘`']/g, '')
      .replace(/[״"]/g, '')
      .replace(/[‐-‒–—―־-]/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hasToken(text, token) {
    const normalizedToken = normalizeText(token);
    return text === normalizedToken ||
      text.startsWith(`${normalizedToken} `) ||
      text.endsWith(` ${normalizedToken}`) ||
      text.includes(` ${normalizedToken} `);
  }

  function stripTemporalNoiseTerm(value) {
    const normalized = normalizeText(value);
    if (!normalized) return '';

    const normalizedTemporal = new Set(Array.from(TEMPORAL_NOISE, normalizeText));
    const tokens = normalized.split(' ').filter(Boolean);
    const kept = tokens.filter(token => !normalizedTemporal.has(token));
    const joined = kept.join(' ').trim();

    if (!joined || normalizedTemporal.has(normalized)) return '';
    return joined;
  }

  function cleanTermArray(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const out = [];
    for (const item of value) {
      const cleaned = stripTemporalNoiseTerm(item);
      const key = normalizeText(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
    }
    return out;
  }

  function sanitizeAiFilters(filters) {
    const safe = filters && typeof filters === 'object' ? { ...filters } : {};
    safe.must_match = cleanTermArray(safe.must_match);
    safe.any_of = cleanTermArray(safe.any_of);
    const mustKeys = new Set(safe.must_match.map(normalizeText));
    safe.any_of = safe.any_of.filter(term => !mustKeys.has(normalizeText(term)));
    safe.keywords = [...new Set([...safe.must_match, ...safe.any_of])];
    return safe;
  }

  function basicFallbackFilters(query, categoryType) {
    const text = normalizeText(query);
    const isRoutes = categoryType === 'routes';
    const isTechnical = categoryType === 'routes' || categoryType === 'technical';

    let region = null;
    if (text.includes('מדבר יהודה')) region = 'מדבר יהודה';
    else if (text.includes('בקעת הירדן')) region = 'בקעת הירדן';
    else if (text.includes('שומרון')) region = 'השומרון';
    else if (text.includes('נגב') || text.includes('ערבה')) region = 'הנגב והערבה';

    let suitableForKids = null;
    if (isRoutes) {
      if (/לא\s+מתאים\s+(?:ל)?ילדים|בלי\s+(?:ה)?ילדים/.test(text)) suitableForKids = false;
      else if (/עם\s+(?:ה)?ילדים|לילדים|מתאים\s+(?:ל)?ילדים|משפחתי|משפחה/.test(text)) suitableForKids = true;
    }

    let waterDip = null;
    if (isRoutes) {
      if (/בלי\s+מים|ללא\s+מים|בלי\s+טבילה|ללא\s+טבילה/.test(text)) waterDip = false;
      else if (/עם\s+מים|טבילה|מעיין\s+בדרך/.test(text)) waterDip = true;
    }

    let lengthBucket = null;
    if (isRoutes) {
      if (hasToken(text, 'קצר')) lengthBucket = 'short';
      else if (hasToken(text, 'ארוך')) lengthBucket = 'long';
      else if (/אורך\s+בינוני|בינוני\s+באורך/.test(text)) lengthBucket = 'medium';
    }

    let minDurationHours = null;
    let maxDurationHours = null;
    if (isRoutes) {
      if (/חצי\s+יום|כמה\s+שעות|קצר\s+בזמן/.test(text)) maxDurationHours = 4;
      if (/יום\s+שלם|כל\s+היום/.test(text)) minDurationHours = 5;
    }

    let difficulty = null;
    if (isTechnical) {
      if (/קשה\s+מאוד/.test(text)) difficulty = 'קשה מאוד';
      else if (hasToken(text, 'קשה')) difficulty = 'קשה';
      else if (hasToken(text, 'קל')) difficulty = 'קל';
      else if (/קושי\s+בינוני|בינוני\s+בקושי/.test(text)) difficulty = 'בינוני';
    }

    let isTechnicalValue = null;
    if (isTechnical) {
      if (/לא\s+טכני/.test(text)) isTechnicalValue = false;
      else if (hasToken(text, 'טכני')) isTechnicalValue = true;
    }

    let hasBypass = null;
    if (isTechnical) {
      if (/בלי\s+מעקף|ללא\s+מעקף/.test(text)) hasBypass = false;
      else if (/עם\s+מעקף|יש\s+מעקף/.test(text)) hasBypass = true;
    }

    const natureFeatures = [];
    if (isTechnical) {
      if (text.includes('שפצ')) natureFeatures.push('שפ"צ');
      for (const value of ['דרדרת', 'מדרגות', 'הצלבות', 'תלול']) {
        if (text.includes(value)) natureFeatures.push(value);
      }
    }

    return {
      region,
      suitable_for_kids: suitableForKids,
      water_dip: waterDip,
      firing_zone_no: /ללא\s+שטח\s+אש|בלי\s+שטח\s+אש|ללא\s+שטחי\s+אש|בלי\s+שטחי\s+אש/.test(text) ? true : null,
      length_bucket: lengthBucket,
      min_length_km: null,
      max_length_km: null,
      min_duration_hours: minDurationHours,
      max_duration_hours: maxDurationHours,
      difficulty,
      is_technical: isTechnicalValue,
      is_recommended: isRoutes && /מומלץ|מומלצים/.test(text) ? true : null,
      has_bypass: hasBypass,
      nature_features: natureFeatures,
      must_match: [],
      any_of: [],
      keywords: []
    };
  }

  async function readAiRequestBody(input, init) {
    try {
      if (typeof init?.body === 'string') return JSON.parse(init.body);
      if (input instanceof Request) {
        const text = await input.clone().text();
        return text ? JSON.parse(text) : {};
      }
    } catch (_) {
      // Invalid request bodies are handled by the real endpoint; fallback uses empty input.
    }
    return {};
  }

  window.fetch = async function jdjAiSearchFetch(input, init = {}) {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    const method = String(init?.method || input?.method || 'GET').toUpperCase();

    if (method !== 'POST' || requestUrl !== aiSearchUrl) {
      return previousFetch(input, init);
    }

    const body = await readAiRequestBody(input, init);
    const query = typeof body?.query === 'string' ? body.query : '';
    const categoryType = typeof body?.categoryType === 'string' ? body.categoryType : 'routes';

    try {
      const response = await previousFetch(input, init);
      if (response.ok) {
        try {
          const payload = await response.clone().json();
          const sanitized = sanitizeAiFilters(payload);
          return new Response(JSON.stringify(sanitized), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } catch (error) {
          console.warn('AI search response normalization failed; using deterministic fallback:', error);
        }
      } else {
        console.warn(`AI search returned ${response.status}; using deterministic fallback.`);
      }
    } catch (error) {
      console.warn('AI search request failed; using deterministic fallback:', error);
    }

    return new Response(JSON.stringify(basicFallbackFilters(query, categoryType)), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  };
})();