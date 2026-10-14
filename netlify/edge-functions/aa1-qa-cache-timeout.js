export default async function handler(request, context) {
  const response = await context.next();
  if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) {
    return response;
  }

  let html = await response.text();
  html = html.replace('function loadFrame(src,timeout=15000)', 'function loadFrame(src,timeout=35000)');
  html = html.replace('await wait(1400);const direct=directRest(frameResources(f));', 'await wait(1800);const direct=directRest(frameResources(f));');

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-JDJ-QA-Stabilized', '1');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: ['/qa-cache.html']
};
