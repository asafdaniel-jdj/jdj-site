function normalizePath(pathname = '/') {
  return pathname.endsWith('.html') ? pathname.slice(0, -5) : pathname;
}

function injectBeforeHeadClose(html, snippet) {
  const marker = '</head>';
  const index = html.toLowerCase().lastIndexOf(marker);
  if (index < 0) return html;
  return `${html.slice(0, index)}${snippet}\n${html.slice(index)}`;
}

function isFloodRiverDetail(path) {
  return /^\/floods\/[^/]+\/[^/]+$/.test(path);
}

export default async function handler(request, context) {
  if (request.method !== 'GET') return context.next();

  // Runs before aaa-page-cache so fixes/injections also apply to cached HTML.
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/html')) return response;

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  let html = await response.text();
  let injection = '';
  let transformed = false;

  // JDJ-61: remove the generic river-outlet description that is incorrect for
  // some rivers while keeping the popup title/type/action intact.
  if (isFloodRiverDetail(path)) {
    const corrected = html.replace(
      "description: 'אזור מוצא הנחל לכיוון ים המלח',",
      "description: '',"
    );
    if (corrected !== html) {
      html = corrected;
      transformed = true;
    }
  }

  // JDJ-65: ensure Disclaimer uses the shared Data Cache proxy.
  if (path === '/disclaimer' && !html.includes('src="seo-db.js"') && !html.includes('src="/seo-db.js"')) {
    injection += '<script src="/seo-db.js"></script>\n';
  }

  // JDJ-66: observe controlled fallbacks from cache endpoints to Supabase.
  if (!html.includes('cache-observability.js')) {
    injection += '<script src="/cache-observability.js"></script>';
  }

  if (injection) {
    html = injectBeforeHeadClose(html, `\n    <!-- JDJ Data Cache bootstrap: pre-page-cache -->\n    ${injection}`);
    transformed = true;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  if (transformed) headers.set('X-JDJ-Data-Cache-Bootstrap', 'pre-cache');
  if (isFloodRiverDetail(path)) headers.set('X-JDJ-Flood-Popup-Fix', '1');

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
    '/stories', '/stories.html',
    '/floods',
    '/floods/judean-desert',
    '/floods/negev-arava',
    '/floods/:region/:slug'
  ]
};
