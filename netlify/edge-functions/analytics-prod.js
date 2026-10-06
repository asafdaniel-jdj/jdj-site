const PROD_HOSTS = new Set(['jdj.co.il', 'www.jdj.co.il']);
const MEASUREMENT_ID = 'G-8XZHZXFHCY';

function isProdHostname(hostname = '') {
  return PROD_HOSTS.has(String(hostname).toLowerCase());
}

const GTM_SCRIPT_RE = /\s*<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->\s*/gi;
const GTM_NOSCRIPT_RE = /\s*<!--\s*Google Tag Manager \(noscript\)\s*-->\s*<noscript>[\s\S]*?<\/noscript>\s*(?:<!--\s*End Google Tag Manager \(noscript\)\s*-->\s*)?/gi;
const DIRECT_GTAG_RE = new RegExp(
  String.raw`(?:\s*<!--\s*[^>]*Google tag \(gtag\.js\)\s*-->\s*)?` +
  String.raw`<script\b[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=${MEASUREMENT_ID}["'][^>]*><\/script>\s*` +
  String.raw`<script>\s*[\s\S]*?gtag\(\s*["']config["']\s*,\s*["']${MEASUREMENT_ID}["'][\s\S]*?<\/script>\s*`,
  'i'
);

function stripGtm(html) {
  return html
    .replace(GTM_SCRIPT_RE, '\n')
    .replace(GTM_NOSCRIPT_RE, '\n');
}

function moveDirectGtagAfterTitle(html) {
  const match = html.match(DIRECT_GTAG_RE);
  if (!match) return stripGtm(html);

  const directGtagBlock = match[0].trim();
  const withoutDuplicateSource = stripGtm(html.replace(DIRECT_GTAG_RE, '\n'));
  const titleEnd = /<\/title\s*>/i.exec(withoutDuplicateSource);

  if (!titleEnd) return stripGtm(html);

  const insertAt = titleEnd.index + titleEnd[0].length;
  return (
    withoutDuplicateSource.slice(0, insertAt) +
    `\n${directGtagBlock}\n` +
    withoutDuplicateSource.slice(insertAt)
  );
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const response = await context.next();

  if (!isProdHostname(url.hostname)) return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const originalHtml = await response.text();
  const html = moveDirectGtagAfterTitle(originalHtml);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('X-JDJ-Analytics-Mode', 'direct-gtag-only-after-title');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: '/*',
  method: 'GET',
  onError: 'bypass'
};
