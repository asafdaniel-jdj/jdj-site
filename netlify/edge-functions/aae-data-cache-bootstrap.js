function normalizePath(pathname = '/') {
  return pathname.endsWith('.html') ? pathname.slice(0, -5) : pathname;
}

function injectBeforeHeadClose(html, snippet) {
  const marker = '</head>';
  const index = html.toLowerCase().lastIndexOf(marker);
  if (index < 0) return html;
  return `${html.slice(0, index)}${snippet}\n${html.slice(index)}`;
}

export default async function handler(request, context) {
  if (request.method !== 'GET') return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/html')) return response;

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  let html = await response.text();
  let injection = '';

  // JDJ-65: disclaimer historically created a Supabase client without loading
  // the shared Data Cache Proxy. Inject it after the Supabase library and before
  // the body scripts execute.
  if (path === '/disclaimer' && !html.includes('src="seo-db.js"') && !html.includes('src="/seo-db.js"')) {
    injection += '<script src="/seo-db.js"></script>\n';
  }

  // JDJ-66: one lightweight observer on every public HTML page. It only logs
  // when collection-data/content-data fails and a matching direct Supabase REST
  // request follows; normal cache hits stay silent.
  if (!html.includes('cache-observability.js')) {
    injection += '<script src="/cache-observability.js"></script>';
  }

  if (!injection) return response;

  html = injectBeforeHeadClose(html, `\n    <!-- JDJ Data Cache bootstrap -->\n    ${injection}`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-Data-Cache-Bootstrap', '1');

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
