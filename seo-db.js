(function (global) {
  const SITE_URL = 'https://jdj.co.il';
  const templateCache = new Map();
  const overrideCache = new Map();

  function cleanDashes(value = '') {
    return String(value).replace(/\s*[–—־-]\s*/g, ' ').trim();
  }

  function formatRegionWithBet(region = '') {
    const value = cleanDashes(region).trim();
    const known = {
      'מדבר יהודה': 'במדבר יהודה',
      'הנגב והערבה': 'בנגב והערבה',
      'נגב והערבה': 'בנגב והערבה',
      'הנגב': 'בנגב',
      'נגב': 'בנגב',
      'הערבה': 'בערבה',
      'ערבה': 'בערבה',
      'בקעת הירדן': 'בבקעת הירדן',
      'השומרון': 'בשומרון',
      'שומרון': 'בשומרון',
      'ים המלח': 'בים המלח'
    };
    return known[value] || (value ? `ב${value}` : '');
  }

  function primarySchemaType(schemaType, fallback = 'Thing') {
    const first = String(schemaType || '')
      .split('+')
      .map(value => value.trim())
      .find(Boolean);
    return first || fallback;
  }

  function renderTemplate(value, vars = {}) {
    if (value === null || value === undefined) return null;
    return String(value).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
      return Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
        ? String(vars[key])
        : `{${key}}`;
    });
  }

  async function getSeoData(templateKey, seoKey) {
    const templateReady = !templateKey || templateCache.has(templateKey);
    const overrideReady = !seoKey || overrideCache.has(seoKey);

    if (templateReady && overrideReady) {
      return {
        template: templateKey ? templateCache.get(templateKey) : null,
        override: seoKey ? overrideCache.get(seoKey) : null
      };
    }

    const params = new URLSearchParams();
    if (templateKey) params.set('templateKey', templateKey);
    if (seoKey) params.set('seoKey', seoKey);

    const response = await fetch(`/.netlify/functions/seo-data?${params.toString()}`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`SEO data endpoint failed with status ${response.status}`);
    }

    const payload = await response.json();
    const template = payload?.template || null;
    const override = payload?.override || null;

    if (templateKey) templateCache.set(templateKey, template);
    if (seoKey) overrideCache.set(seoKey, override);

    return { template, override };
  }

  function contentRequestType(state) {
    const idFilter = state.filters.find((filter) => filter.method === 'eq' && filter.column === 'id');
    if (!idFilter || !/^\d+$/.test(String(idFilter.value))) return null;

    if (state.table === 'khans') return { type: 'khan', id: String(idFilter.value) };
    if (state.table === 'articles') return { type: 'article', id: String(idFilter.value) };

    if (state.table === 'routes') {
      const pointFilter = state.filters.some((filter) => (
        filter.method === 'neq' &&
        filter.column === 'route_type' &&
        filter.value === 'מסלול טיול'
      ));
      if (pointFilter) return { type: 'point', id: String(idFilter.value) };
    }

    return null;
  }

  async function fetchCachedContent(state, terminalMethod) {
    const requestInfo = contentRequestType(state);
    if (!requestInfo) return null;

    const params = new URLSearchParams({
      type: requestInfo.type,
      id: requestInfo.id
    });

    try {
      const response = await fetch(`/.netlify/functions/content-data?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });

      if (response.status === 404) {
        if (terminalMethod === 'maybeSingle') return { data: null, error: null };
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: 'The result contains 0 rows',
            details: null,
            hint: null
          }
        };
      }

      if (!response.ok) {
        return {
          data: null,
          error: {
            code: 'JDJ_CACHE_API',
            message: `Content data endpoint failed with status ${response.status}`,
            details: null,
            hint: null
          }
        };
      }

      const payload = await response.json();
      return { data: payload?.data || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'JDJ_CACHE_API',
          message: error?.message || 'Content data endpoint failed',
          details: null,
          hint: null
        }
      };
    }
  }

  function wrapQueryBuilder(builder, state) {
    let proxy = null;

    proxy = new Proxy(builder, {
      get(target, prop) {
        if (prop === 'then') return target.then.bind(target);
        if (prop === 'catch' && typeof target.catch === 'function') return target.catch.bind(target);
        if (prop === 'finally' && typeof target.finally === 'function') return target.finally.bind(target);

        if ((prop === 'single' || prop === 'maybeSingle') && typeof target[prop] === 'function') {
          return async (...args) => {
            const cached = await fetchCachedContent(state, prop);
            if (cached) return cached;
            return target[prop](...args);
          };
        }

        const value = target[prop];
        if (typeof value !== 'function') return value;

        return (...args) => {
          if ((prop === 'eq' || prop === 'neq') && args.length >= 2) {
            state.filters.push({ method: prop, column: args[0], value: args[1] });
          }

          const next = value.apply(target, args);
          if (next && typeof next === 'object' && typeof next.then === 'function') {
            return wrapQueryBuilder(next, state);
          }
          return next;
        };
      }
    });

    return proxy;
  }

  function installContentDataProxy() {
    const supabaseGlobal = global.supabase;
    if (!supabaseGlobal || typeof supabaseGlobal.createClient !== 'function') return;
    if (supabaseGlobal.createClient.__jdjContentDataProxyInstalled) return;

    const originalCreateClient = supabaseGlobal.createClient;

    function createClientWithContentCache(...args) {
      const client = originalCreateClient.apply(this, args);
      if (!client || client.__jdjContentDataProxyInstalled) return client;

      const originalFrom = client.from.bind(client);
      client.from = function fromWithContentCache(table) {
        return wrapQueryBuilder(originalFrom(table), { table, filters: [] });
      };

      Object.defineProperty(client, '__jdjContentDataProxyInstalled', {
        value: true,
        enumerable: false
      });

      return client;
    }

    Object.defineProperty(createClientWithContentCache, '__jdjContentDataProxyInstalled', {
      value: true,
      enumerable: false
    });

    supabaseGlobal.createClient = createClientWithContentCache;
  }

  function applyRobots(robots) {
    const hostname = window.location.hostname;
    const isTestSite = hostname === 'jdj-test.netlify.app' || hostname.endsWith('--jdj-test.netlify.app');
    const effectiveRobots = isTestSite ? 'noindex,follow' : robots;

    if (!effectiveRobots) return;
    let el = document.querySelector('meta[name="robots"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    el.setAttribute('content', effectiveRobots);
  }

  function setMeta(selector, attribute, value) {
    if (!value) return;
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attribute, value);
  }

  function applyHead(seo = {}) {
    if (seo.title) document.title = seo.title;
    if (seo.description) setMeta('meta[name="description"]', 'content', seo.description);
    if (seo.canonical) setMeta('link[rel="canonical"]', 'href', seo.canonical);
    if (seo.canonical) setMeta('meta[property="og:url"]', 'content', seo.canonical);
    if (seo.ogTitle || seo.title) setMeta('meta[property="og:title"]', 'content', seo.ogTitle || seo.title);
    if (seo.ogDescription || seo.description) setMeta('meta[property="og:description"]', 'content', seo.ogDescription || seo.description);
    if (seo.ogImage) setMeta('meta[property="og:image"]', 'content', seo.ogImage);
    if (seo.ogTitle || seo.title) setMeta('meta[name="twitter:title"]', 'content', seo.ogTitle || seo.title);
    if (seo.ogDescription || seo.description) setMeta('meta[name="twitter:description"]', 'content', seo.ogDescription || seo.description);
    if (seo.ogImage) setMeta('meta[name="twitter:image"]', 'content', seo.ogImage);
    applyRobots(seo.robots);
  }

  async function resolve(client, options = {}) {
    const {
      templateKey,
      seoKey,
      vars = {},
      fallback = {}
    } = options;

    const enrichedVars = {
      ...vars,
      region_bet: vars.region_bet || formatRegionWithBet(vars.region || ''),
      region_url: vars.region_url || encodeURIComponent(vars.region || '')
    };

    try {
      const { template, override } = await getSeoData(templateKey, seoKey);

      const fromTemplate = {
        title: renderTemplate(template?.title_template, enrichedVars),
        description: renderTemplate(template?.meta_description_template, enrichedVars),
        h1: renderTemplate(template?.h1_template, enrichedVars),
        h2: renderTemplate(template?.h2_template, enrichedVars),
        canonical: renderTemplate(template?.canonical_template, enrichedVars),
        schemaType: template?.schema_type || null,
        robots: template?.robots || null
      };

      const finalSeo = {
        title: override?.seo_title || fromTemplate.title || fallback.title || null,
        description: override?.meta_description || fromTemplate.description || fallback.description || null,
        h1: override?.h1 || fromTemplate.h1 || fallback.h1 || null,
        h2: override?.h2 || fromTemplate.h2 || fallback.h2 || null,
        canonical: override?.canonical_url || fromTemplate.canonical || fallback.canonical || null,
        robots: override?.robots || fromTemplate.robots || fallback.robots || 'index,follow',
        ogTitle: override?.og_title || override?.seo_title || fromTemplate.title || fallback.ogTitle || fallback.title || null,
        ogDescription: override?.og_description || override?.meta_description || fromTemplate.description || fallback.ogDescription || fallback.description || null,
        ogImage: override?.og_image || fallback.ogImage || `${SITE_URL}/og-image.jpg`,
        schemaType: override?.schema_type || fromTemplate.schemaType || fallback.schemaType || null,
        source: override ? 'override' : (template ? 'template' : 'fallback')
      };

      applyRobots(finalSeo.robots);
      return finalSeo;
    } catch (error) {
      console.warn('JDJ SEO DB fallback:', error);
      applyRobots(fallback.robots || 'index,follow');
      return {
        ...fallback,
        source: 'fallback'
      };
    }
  }

  function clearCache() {
    templateCache.clear();
    overrideCache.clear();
  }

  installContentDataProxy();

  global.JDJSeoDB = {
    SITE_URL,
    cleanDashes,
    formatRegionWithBet,
    primarySchemaType,
    renderTemplate,
    resolve,
    applyHead,
    clearCache
  };
})(window);
