const TEST_HOST_SUFFIX = '--jdj-test.netlify.app';
const MEASUREMENT_ID = 'G-8XZHZXFHCY';

function isTestHostname(hostname = '') {
  return hostname === 'jdj-test.netlify.app' || hostname.endsWith(TEST_HOST_SUFFIX);
}

const GTM_SCRIPT_RE = /\s*<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->\s*/gi;
const GTM_NOSCRIPT_RE = /\s*<!--\s*Google Tag Manager \(noscript\)\s*-->\s*<noscript>[\s\S]*?<\/noscript>\s*(?:<!--\s*End Google Tag Manager \(noscript\)\s*-->\s*)?/gi;
const DIRECT_GTAG_RE = new RegExp(
  String.raw`(?:\s*<!--\s*[^>]*Google tag \(gtag\.js\)\s*-->\s*)?` +
  String.raw`<script\b[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=${MEASUREMENT_ID}["'][^>]*><\/script>\s*` +
  String.raw`<script>\s*[\s\S]*?gtag\(\s*["']config["']\s*,\s*["']${MEASUREMENT_ID}["'][\s\S]*?<\/script>\s*`,
  'gi'
);

function stripAnalytics(html) {
  return html
    .replace(GTM_SCRIPT_RE, '\n')
    .replace(GTM_NOSCRIPT_RE, '\n')
    .replace(DIRECT_GTAG_RE, '\n');
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const response = await context.next();

  if (!isTestHostname(url.hostname)) return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const originalHtml = await response.text();
  const html = stripAnalytics(originalHtml);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('X-JDJ-Analytics-Mode', 'disabled-on-test');

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
