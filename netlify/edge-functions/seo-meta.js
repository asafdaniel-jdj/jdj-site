const SITE_URL = 'https://jdj.co.il';
const SITE_NAME = "מסלולי הג'יפים של מדבר יהודה";
const SUPABASE_URL = 'https://edjmwcnxsqnsxqrcsjxp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FElRjSrrcMn2qadsyDDLPA_08YQsz2i';

const CATEGORY_MAP = {
  routes: {
    title: 'מסלולי טיול',
    description: "מאגר מסלולי טיול 4x4 וג'יפים במדבר יהודה, הנגב, בקעת הירדן והשומרון עם מפות אינטראקטיביות, קבצי GPX וסינונים חכמים."
  },
  technical: {
    title: 'מקטעים טכניים',
    description: 'מעלות שטח, מדרגות סלע ומקטעים אתגריים לרכבי 4x4 עם הילוך כוח (Low) במדבר יהודה ובנגב כולל דירוג קושי ומעקפים.'
  },
  viewpoints: {
    title: 'נקודות תצפית',
    description: 'תצפיות הנוף המרשימות ביותר במצוק ההעתקים, ים המלח, מדבר יהודה ובקעת הירדן. דרכי הגעה ונקודות ציון לרכבי שטח.'
  },
  water: {
    title: 'מעיינות וגבים',
    description: 'גבי מים עמוקים, מעיינות חיים ומקורות מים לשכשוך וטבילה במדבר יהודה, ים המלח והנגב עם דרכי גישה לרכב שטח.'
  },
  poi: {
    title: 'נקודות עניין',
    description: 'אתרים היסטוריים, שרידים ארכאולוגיים, מערות ומקומות מיוחדים במדבר יהודה והבקעה עם מידע מלא ומיקום מדויק.'
  }
};

function cleanDashes(value = '') {
  return String(value).replace(/\s*[–—־-]\s*/g, ' ').trim();
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
  const description = cleanDashes(stripHtml(row.short_description || (
    kind === 'item'
      ? 'צפו במסלול המלא, נקודות ציון, מפת שטח וקובץ GPX להורדה למטיילי שטח 4x4.'
      : `${title} הינו ${row.route_type || 'נקודת עניין'} באזור ${row.region || 'מדבר יהודה'}.`
  )));
  const canonical = `${SITE_URL}/${kind}?id=${encodeURIComponent(row.id)}`;

  if (kind === 'item') {
    const fullTitle = `${title} | ${SITE_NAME}`;
    return { title: fullTitle, ogTitle: fullTitle, description, canonical, image: absoluteImage(row.main_image) };
  }

  const fullTitle = `${title} - ${row.route_type || 'נקודת עניין'} ב${row.region || 'מדבר יהודה'} | ${SITE_NAME}`;
  return { title: fullTitle, ogTitle: fullTitle, description, canonical, image: absoluteImage(row.main_image) };
}

function seoForKhan(row) {
  const title = cleanDashes(row.title || '');
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    ogTitle: fullTitle,
    description: cleanDashes(stripHtml(row.short_description || 'צפו בפרטי החאן המלאים, דירוג אישי, סוגי לינה, מתקנים ותשתיות, אבטחת רכבים ודרכי הגעה.')),
    canonical: `${SITE_URL}/khan?id=${encodeURIComponent(row.id)}`,
    image: absoluteImage(row.main_image)
  };
}

function seoForArticle(row) {
  const title = cleanDashes(row.title || '');
  const description = cleanDashes(stripHtml(row.excerpt || 'קראו סיפורי מדבר, מורשת שטח, היסטוריה ודמויות שעיצבו את שבילי המדבר.'));
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
  const fullTitle = `${config.title} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    ogTitle: fullTitle,
    description: config.description,
    canonical: `${SITE_URL}/category?type=${type}`,
    image: `${SITE_URL}/og-image.jpg`
  };
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
    if (pagePath === '/category') {
      html = applySeo(html, seoForCategory(url));
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

        if (seo) {
          html = applySeo(html, seo);
          if (pagePath === '/article' && row) {
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
