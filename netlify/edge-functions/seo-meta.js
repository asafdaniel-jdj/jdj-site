const SITE_URL = 'https://jdj.co.il';
const SITE_NAME = "מסלולי הג'יפים של מדבר יהודה";
const SUPABASE_URL = 'https://edjmwcnxsqnsxqrcsjxp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FElRjSrrcMn2qadsyDDLPA_08YQsz2i';

const CATEGORY_MAP = {
  routes: {
    h1: 'מסלולי טיול',
    h2: 'מסלולי טיול נבחרים',
    seoTitle: "מסלולי טיול לג'יפים",
    description: "מאגר מסלולי טיול לג'יפים במדבר יהודה, הנגב, הערבה, בקעת הירדן והשומרון עם מפות, קבצי GPX, דרגות קושי ומידע מהשטח."
  },
  technical: {
    h1: 'מקטעים טכניים',
    h2: 'מקטעים טכניים ומעלות',
    seoTitle: "מעלות ומקטעים טכניים לג'יפים",
    description: "מעלות, מדרגות סלע ומקטעים טכניים לג'יפים במדבר יהודה והנגב, כולל דרגות קושי, מעקפים, תמונות ומידע מהשטח."
  },
  viewpoints: {
    h1: 'נקודות תצפית',
    h2: 'נקודות תצפית מומלצות',
    seoTitle: 'נקודות תצפית',
    description: 'נקודות תצפית נבחרות במדבר יהודה, ים המלח, הנגב ובקעת הירדן עם מיקום, דרכי גישה, תמונות ומידע מהשטח.'
  },
  water: {
    h1: 'מעיינות וגבים',
    h2: 'מעיינות וגבים בשטח',
    seoTitle: 'מעיינות וגבים',
    description: 'מעיינות, גבים ומקורות מים במדבר יהודה, ים המלח והנגב עם מיקום, דרכי גישה, תמונות ועדכונים מהשטח.'
  },
  poi: {
    h1: 'נקודות עניין',
    h2: 'נקודות עניין שכדאי להכיר',
    seoTitle: 'נקודות עניין',
    description: 'נקודות עניין, אתרים היסטוריים, מערות ומקומות מיוחדים במדבר יהודה, בקעת הירדן והנגב עם מיקום, תמונות ומידע מהשטח.'
  }
};

const ROUTE_REGION_SEO = {
  'מדבר יהודה': {
    h1: 'מסלולי ג׳יפים במדבר יהודה',
    h2: 'מסלולי טיול 4x4 נבחרים במדבר יהודה',
    seoTitle: 'מסלולי ג׳יפים במדבר יהודה',
    description: 'מסלולי ג׳יפים במדבר יהודה עם מפות, קבצי GPX, דרגות קושי, נקודות עניין ומידע עדכני מהשטח למטיילי 4x4.'
  },
  'הנגב והערבה': {
    h1: 'מסלולי ג׳יפים בנגב והערבה',
    h2: 'מסלולי טיול 4x4 נבחרים בנגב והערבה',
    seoTitle: 'מסלולי ג׳יפים בנגב והערבה',
    description: 'מסלולי ג׳יפים בנגב והערבה עם מפות, קבצי GPX, דרגות קושי, נקודות עניין ומידע עדכני מהשטח למטיילי 4x4.'
  },
  'בקעת הירדן': {
    h1: 'מסלולי ג׳יפים בבקעת הירדן',
    h2: 'מסלולי טיול 4x4 נבחרים בבקעת הירדן',
    seoTitle: 'מסלולי ג׳יפים בבקעת הירדן',
    description: 'מסלולי ג׳יפים בבקעת הירדן עם מפות, קבצי GPX, דרגות קושי, נקודות עניין ומידע עדכני מהשטח למטיילי 4x4.'
  },
  'השומרון': {
    h1: 'מסלולי ג׳יפים בשומרון',
    h2: 'מסלולי טיול 4x4 נבחרים בשומרון',
    seoTitle: 'מסלולי ג׳יפים בשומרון',
    description: 'מסלולי ג׳יפים בשומרון עם מפות, קבצי GPX, דרגות קושי, נקודות עניין ומידע עדכני מהשטח למטיילי 4x4.'
  }
};

function cleanDashes(value = '') {
  return String(value).replace(/\s*[–—־-]\s*/g, ' ').trim();
}

function formatRegionWithBet(region) {
  const value = cleanDashes(region || '').trim();
  const knownRegions = {
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
  return knownRegions[value] || (value ? `ב${value}` : 'במדבר יהודה');
}


const SEO_TEMPLATE_CACHE = new Map();
const SEO_OVERRIDE_CACHE = new Map();

function renderSeoTemplate(value, vars = {}) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => (
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : `{${key}}`
  ));
}

async function getSeoTemplate(templateKey) {
  if (!templateKey) return null;
  if (SEO_TEMPLATE_CACHE.has(templateKey)) return SEO_TEMPLATE_CACHE.get(templateKey);
  const params = new URLSearchParams({
    select: '*',
    template_key: `eq.${templateKey}`,
    is_active: 'eq.true',
    limit: '1'
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/seo_templates?${params.toString()}`, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Supabase seo_templates request failed with ${response.status}`);
  const rows = await response.json();
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  SEO_TEMPLATE_CACHE.set(templateKey, row);
  return row;
}

async function getSeoOverride(seoKey) {
  if (!seoKey) return null;
  if (SEO_OVERRIDE_CACHE.has(seoKey)) return SEO_OVERRIDE_CACHE.get(seoKey);
  const params = new URLSearchParams({
    select: '*',
    seo_key: `eq.${seoKey}`,
    is_active: 'eq.true',
    limit: '1'
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/seo_overrides?${params.toString()}`, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Supabase seo_overrides request failed with ${response.status}`);
  const rows = await response.json();
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  SEO_OVERRIDE_CACHE.set(seoKey, row);
  return row;
}

async function resolveSeoFromDb({ templateKey, seoKey, vars = {}, fallback = {} }) {
  const region = vars.region || '';
  const enrichedVars = {
    ...vars,
    region_bet: vars.region_bet || formatRegionWithBet(region),
    region_url: vars.region_url || encodeURIComponent(region)
  };
  const [template, override] = await Promise.all([
    getSeoTemplate(templateKey),
    getSeoOverride(seoKey)
  ]);
  const fromTemplate = {
    title: renderSeoTemplate(template?.title_template, enrichedVars),
    description: renderSeoTemplate(template?.meta_description_template, enrichedVars),
    h1: renderSeoTemplate(template?.h1_template, enrichedVars),
    h2: renderSeoTemplate(template?.h2_template, enrichedVars),
    canonical: renderSeoTemplate(template?.canonical_template, enrichedVars),
    schemaType: template?.schema_type || null,
    robots: template?.robots || null
  };
  return {
    ...fallback,
    title: override?.seo_title || fromTemplate.title || fallback.title,
    ogTitle: override?.og_title || override?.seo_title || fromTemplate.title || fallback.ogTitle || fallback.title,
    twitterTitle: override?.og_title || override?.seo_title || fromTemplate.title || fallback.twitterTitle || fallback.ogTitle || fallback.title,
    description: override?.meta_description || fromTemplate.description || fallback.description,
    h1: override?.h1 || fromTemplate.h1 || fallback.h1,
    h2: override?.h2 || fromTemplate.h2 || fallback.h2,
    canonical: override?.canonical_url || fromTemplate.canonical || fallback.canonical,
    robots: override?.robots || fromTemplate.robots || fallback.robots || 'index,follow',
    image: absoluteImage(override?.og_image || fallback.image || `${SITE_URL}/og-image.jpg`),
    schemaType: override?.schema_type || fromTemplate.schemaType || fallback.schemaType || null
  };
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteImage(value) {
  if (!value) return `${SITE_URL}/og-image.jpg`;
  const image = String(value).trim();
  if (/^https?:\/\//i.test(image)) return image;
  return `${SITE_URL}/${image.replace(/^\/+/, '')}`;
}

function replaceTitle(html, value) {
  return html.replace(/<title\b([^>]*)>[\s\S]*?<\/title>/i, `<title$1>${escapeHtml(value)}</title>`);
}

function replaceMetaByName(html, name, value) {
  const escaped = escapeHtml(value);
  const re = new RegExp(`<meta\\b([^>]*\\bname=["']${name}["'][^>]*)>`, 'i');
  return html.replace(re, (tag) => {
    if (/\bcontent=(["'])[\s\S]*?\1/i.test(tag)) {
      return tag.replace(/\bcontent=(["'])[\s\S]*?\1/i, `content="${escaped}"`);
    }
    return tag.replace(/>$/, ` content="${escaped}">`);
  });
}

function replaceMetaByProperty(html, property, value) {
  const escaped = escapeHtml(value);
  const re = new RegExp(`<meta\\b([^>]*\\bproperty=["']${property}["'][^>]*)>`, 'i');
  return html.replace(re, (tag) => {
    if (/\bcontent=(["'])[\s\S]*?\1/i.test(tag)) {
      return tag.replace(/\bcontent=(["'])[\s\S]*?\1/i, `content="${escaped}"`);
    }
    return tag.replace(/>$/, ` content="${escaped}">`);
  });
}

function replaceCanonical(html, href) {
  const escaped = escapeHtml(href);
  const re = /<link\b([^>]*\brel=["']canonical["'][^>]*)>/i;
  return html.replace(re, (tag) => {
    if (/\bhref=(["'])[\s\S]*?\1/i.test(tag)) {
      return tag.replace(/\bhref=(["'])[\s\S]*?\1/i, `href="${escaped}"`);
    }
    return tag.replace(/>$/, ` href="${escaped}">`);
  });
}

function replaceElementTextById(html, id, value) {
  const escaped = escapeHtml(value);
  const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\bid=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/\\2>)`, 'i');
  return html.replace(re, `$1${escaped}$3`);
}

function setRobotsNoindex(html) {
  const robotsRe = /<meta\b([^>]*\bname=["']robots["'][^>]*)>/i;
  if (robotsRe.test(html)) {
    return replaceMetaByName(html, 'robots', 'noindex,follow');
  }
  return html.replace(/<\/head>/i, '    <meta name="robots" content="noindex,follow">\n</head>');
}

function replaceJsonLdById(html, id, data) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  const re = new RegExp(`(<script\\b[^>]*\\bid=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/script>)`, 'i');
  return html.replace(re, `$1${json}$2`);
}

function articleSchema(row, seo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: cleanDashes(row.title || ''),
    description: seo.description,
    image: [seo.image],
    datePublished: row.created_at || undefined,
    author: [{
      '@type': 'Person',
      name: row.author || 'מסלולי הג\'יפים של מדבר יהודה'
    }],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': seo.canonical
    }
  };
}

function applySeo(html, seo) {
  let out = html;
  out = replaceTitle(out, seo.title);
  out = replaceMetaByName(out, 'description', seo.description);
  out = replaceCanonical(out, seo.canonical);
  out = replaceMetaByProperty(out, 'og:url', seo.canonical);
  out = replaceMetaByProperty(out, 'og:title', seo.ogTitle || seo.title);
  out = replaceMetaByProperty(out, 'og:description', seo.description);
  out = replaceMetaByProperty(out, 'og:image', seo.image);
  out = replaceMetaByName(out, 'twitter:title', seo.twitterTitle || seo.ogTitle || seo.title);
  out = replaceMetaByName(out, 'twitter:description', seo.description);
  out = replaceMetaByName(out, 'twitter:image', seo.image);
  if (seo.robots) {
    const robotsRe = /<meta\b([^>]*\bname=["']robots["'][^>]*)>/i;
    if (robotsRe.test(out)) out = replaceMetaByName(out, 'robots', seo.robots);
    else out = out.replace(/<\/head>/i, `    <meta name="robots" content="${escapeHtml(seo.robots)}">\n</head>`);
  }
  return out;
}

async function getRow(table, id, extraFilters = []) {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('id', `eq.${id}`);
  params.set('limit', '1');
  for (const [key, operator, value] of extraFilters) {
    params.set(key, `${operator}.${value}`);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} request failed with ${response.status}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function seoForRoute(row, kind) {
  const title = cleanDashes(row.title || '');
  const regionPhrase = formatRegionWithBet(row.region || 'מדבר יהודה');
  const routeType = row.route_type || 'נקודת עניין';
  const canonical = `${SITE_URL}/${kind}?id=${encodeURIComponent(row.id)}`;

  if (kind === 'item') {
    const fullTitle = `${title} | מסלולי ג'יפים ${regionPhrase}`;
    const description = `${title} הוא מסלול ג'יפים ${regionPhrase}, כולל דרגת קושי, תיאור הדרך, נקודות חשובות, מפה וקובץ GPX להורדה.`;
    return { title: fullTitle, ogTitle: fullTitle, description, canonical, image: absoluteImage(row.main_image) };
  }

  const fullTitle = `${title} | ${routeType} ${regionPhrase}`;
  const description = `${title} היא ${routeType} ${regionPhrase}, עם מידע מהשטח, דרכי גישה, מיקום, תמונות ופרטים חשובים למטיילי ג'יפים.`;
  return { title: fullTitle, ogTitle: fullTitle, description, canonical, image: absoluteImage(row.main_image) };
}

function seoForKhan(row) {
  const title = cleanDashes(row.title || '');
  const regionPhrase = formatRegionWithBet(row.region || 'הנגב והערבה');
  const fullTitle = `${title} | חאן ${regionPhrase}`;
  return {
    title: fullTitle,
    ogTitle: fullTitle,
    description: `${title} הוא חאן ${regionPhrase}, עם מידע על סוגי הלינה, מתקנים, מיקום, דרכי הגעה והתרשמות למטיילי שטח וג'יפים.`,
    canonical: `${SITE_URL}/khan?id=${encodeURIComponent(row.id)}`,
    image: absoluteImage(row.main_image)
  };
}

function seoForArticle(row) {
  const title = cleanDashes(row.title || '');
  const description = `${title} – סיפור מדבר ומורשת שטח עם רקע, היסטוריה, אנשים ומקומות שעיצבו את המדבר ואת עולם טיולי הג'יפים.`;
  return {
    title: `${title} | ${SITE_NAME}`,
    ogTitle: title,
    twitterTitle: title,
    description,
    canonical: `${SITE_URL}/article?id=${encodeURIComponent(row.id)}`,
    image: absoluteImage(row.cover_image)
  };
}

function seoForCategory(url) {
  const rawType = url.searchParams.get('type');
  const type = Object.prototype.hasOwnProperty.call(CATEGORY_MAP, rawType) ? rawType : 'routes';
  const config = CATEGORY_MAP[type];
  const region = url.searchParams.get('region');
  const regionSeo = type === 'routes' ? ROUTE_REGION_SEO[region] : null;
  const seoTitle = regionSeo?.seoTitle || config.seoTitle;
  const fullTitle = `${seoTitle} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    ogTitle: fullTitle,
    description: regionSeo?.description || config.description,
    canonical: regionSeo
      ? `${SITE_URL}/category?type=routes&region=${encodeURIComponent(region)}`
      : `${SITE_URL}/category?type=${type}`,
    image: `${SITE_URL}/og-image.jpg`,
    h1: regionSeo?.h1 || config.h1,
    h2: regionSeo?.h2 || config.h2
  };
}


async function seoForStatic(templateKey, seoKey, fallback) {
  return resolveSeoFromDb({ templateKey, seoKey, vars: {}, fallback });
}

async function seoForCategoryFromDb(url) {
  const fallback = seoForCategory(url);
  const rawType = url.searchParams.get('type');
  const type = Object.prototype.hasOwnProperty.call(CATEGORY_MAP, rawType) ? rawType : 'routes';
  const region = url.searchParams.get('region');
  const isRegionLanding = type === 'routes' && !!ROUTE_REGION_SEO[region];
  return resolveSeoFromDb({
    templateKey: isRegionLanding ? 'routes_region' : `category_${type}`,
    seoKey: isRegionLanding ? `ROUTES_REGION:${region}` : null,
    vars: { region: isRegionLanding ? region : '', region_bet: isRegionLanding ? formatRegionWithBet(region) : '', region_url: isRegionLanding ? encodeURIComponent(region) : '' },
    fallback
  });
}

function normalizePagePath(pathname) {
  if (pathname.endsWith('.html')) return pathname.slice(0, -5);
  return pathname;
}

function isTestHostname(hostname) {
  return hostname === 'jdj-test.netlify.app' || hostname.endsWith('--jdj-test.netlify.app');
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const pagePath = normalizePagePath(url.pathname);
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  try {
    if (pagePath === '/' || pagePath === '/index') {
      const seo = await seoForStatic('home', 'HOME', {
        title: "מסלולי ג'יפים 4x4 במדבר יהודה והדרום",
        ogTitle: "מסלולי ג'יפים 4x4 במדבר יהודה והדרום",
        description: "מסלולי ג'יפים 4x4 נבחרים במדבר יהודה, הנגב, הערבה, בקעת הירדן והשומרון. מפות, קבצי GPX, נקודות עניין, חאנים ותוכן שטח במקום אחד.",
        canonical: `${SITE_URL}/`, image: `${SITE_URL}/og-image.jpg`, schemaType: 'WebSite+Organization'
      });
      html = applySeo(html, seo);
    } else if (pagePath === '/about') {
      const seo = await seoForStatic('about', 'STATIC:about', {
        title: `אודות המיזם | ${SITE_NAME}`, ogTitle: `אודות המיזם | ${SITE_NAME}`,
        description: `הכירו את הסיפור, החזון ורשת המדריכים של ${SITE_NAME} - הבית של מטיילי השטח ונהגי 4x4 בישראל.`,
        canonical: `${SITE_URL}/about`, image: `${SITE_URL}/og-image.jpg`, schemaType: 'AboutPage'
      });
      html = applySeo(html, seo);
    } else if (pagePath === '/category') {
      const seo = await seoForCategoryFromDb(url);
      html = applySeo(html, seo);
      if (seo.h1) html = replaceElementTextById(html, 'categoryPageTitle', seo.h1);
      if (seo.h2) html = replaceElementTextById(html, 'categoryContentHeading', seo.h2);
    } else if (['/item', '/point', '/khan', '/article'].includes(pagePath)) {
      const id = url.searchParams.get('id');

      // Template URLs or invalid IDs should not be indexed.
      if (!id || !/^\d+$/.test(id)) {
        html = setRobotsNoindex(html);
      } else {
        let row = null;
        let seo = null;

        if (pagePath === '/item') {
          row = await getRow('routes', id, [
            ['status', 'eq', 'פורסם'],
            ['route_type', 'eq', 'מסלול טיול']
          ]);
          if (row) seo = seoForRoute(row, 'item');
        } else if (pagePath === '/point') {
          row = await getRow('routes', id, [
            ['status', 'eq', 'פורסם'],
            ['route_type', 'neq', 'מסלול טיול']
          ]);
          if (row) seo = seoForRoute(row, 'point');
        } else if (pagePath === '/khan') {
          row = await getRow('khans', id);
          if (row) seo = seoForKhan(row);
        } else if (pagePath === '/article') {
          row = await getRow('articles', id);
          if (row) seo = seoForArticle(row);
        }

        if (seo && row) {
          const cleanTitle = cleanDashes(row.title || '');
          const regionName = row.region || '';
          const routeType = row.route_type || 'נקודת עניין';
          const map = {
            '/item': { templateKey: 'item', seoKey: `ITEM:${row.id}`, h1Id: 'itemTitle', h2Id: 'itemSeoH2' },
            '/point': { templateKey: 'point', seoKey: `POINT:${row.id}`, h1Id: 'mainH1Title', h2Id: 'pointSeoH2' },
            '/khan': { templateKey: 'khan', seoKey: `KHAN:${row.id}`, h1Id: 'itemTitle', h2Id: 'khanSeoH2' },
            '/article': { templateKey: 'article', seoKey: `ARTICLE:${row.id}`, h1Id: 'articleTitle', h2Id: null }
          };
          const cfg = map[pagePath];
          seo = await resolveSeoFromDb({
            templateKey: cfg.templateKey, seoKey: cfg.seoKey,
            vars: { id: row.id, title: cleanTitle, region: regionName, region_bet: formatRegionWithBet(regionName), route_type: routeType },
            fallback: { ...seo, h1: cleanTitle }
          });
          html = applySeo(html, seo);
          if (seo.h1 && cfg.h1Id) html = replaceElementTextById(html, cfg.h1Id, seo.h1);
          if (seo.h1 && pagePath === '/item') html = replaceElementTextById(html, 'topPageHeading', seo.h1);
          if (seo.h2 && cfg.h2Id) html = replaceElementTextById(html, cfg.h2Id, seo.h2);
          if (pagePath === '/article') {
            html = replaceJsonLdById(html, 'articleSchemaJson', articleSchema(row, seo));
          }
        } else {
          html = setRobotsNoindex(html);
        }
      }
    }
  } catch (error) {
    // SEO enrichment must never break the page. If Supabase is unavailable,
    // return the original HTML response and let the existing client-side code run.
    console.error('JDJ SEO edge function:', error);
  }

  const isTestSite = isTestHostname(url.hostname);
  if (isTestSite) {
    html = setRobotsNoindex(html);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('x-jdj-seo-edge', '1');
  if (isTestSite) {
    headers.set('X-Robots-Tag', 'noindex, follow');
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: [
    '/', '/index.html',
    '/about', '/about.html',
    '/access', '/access.html',
    '/accessibility', '/accessibility.html',
    '/article', '/article.html',
    '/camp', '/camp.html',
    '/category', '/category.html',
    '/disclaimer', '/disclaimer.html',
    '/item', '/item.html',
    '/khan-catalog', '/khan-catalog.html',
    '/khan', '/khan.html',
    '/mview', '/mview.html',
    '/point', '/point.html',
    '/stories', '/stories.html'
  ]
};
