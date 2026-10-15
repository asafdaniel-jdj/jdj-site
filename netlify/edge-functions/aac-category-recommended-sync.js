export default async function handler(request, context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok || !contentType.includes('text/html')) return response;

  let html = await response.text();
  const scriptTag = '<script src="/category-recommended-sync.js" defer></script>';

  if (!html.includes('/category-recommended-sync.js')) {
    html = html.replace(/<\/body>/i, `  ${scriptTag}\n</body>`);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-Recommended-Sync', 'enabled');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: ['/category', '/category.html']
};
