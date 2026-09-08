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

  async function getTemplate(client, templateKey) {
    if (!templateKey) return null;
    if (templateCache.has(templateKey)) return templateCache.get(templateKey);
    const { data, error } = await client
      .from('seo_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    templateCache.set(templateKey, data || null);
    return data || null;
  }

  async function getOverride(client, seoKey) {
    if (!seoKey) return null;
    if (overrideCache.has(seoKey)) return overrideCache.get(seoKey);
    const { data, error } = await client
      .from('seo_overrides')
      .select('*')
      .eq('seo_key', seoKey)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    overrideCache.set(seoKey, data || null);
    return data || null;
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
      const [template, override] = await Promise.all([
        getTemplate(client, templateKey),
        getOverride(client, seoKey)
      ]);

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
