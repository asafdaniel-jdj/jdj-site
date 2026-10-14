const TEST_SUPABASE_URL = 'https://sdekeyakrtdwmykvpbwq.supabase.co';
const TEST_SUPABASE_KEY = 'sb_publishable_Zt1DlF4MDoNQcLvAybABZQ_FrKfqq5Z';

function requestHost(request) {
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch (_) {
    return '';
  }
}

function isTestHost(host) {
  return host === 'jdj-test.netlify.app' || host.endsWith('--jdj-test.netlify.app');
}

export function getSupabasePublicConfig(request) {
  const host = requestHost(request);

  // TEST and Deploy Preview must be pinned to the canonical TEST project.
  // The publishable key is intentionally public (same key exposed in env-config.js).
  // This guard prevents a Preview from accidentally reading PROD even if a Netlify
  // environment variable is stale or scoped incorrectly.
  if (isTestHost(host)) {
    return {
      url: TEST_SUPABASE_URL,
      key: TEST_SUPABASE_KEY,
      environment: 'TEST/PREVIEW',
      source: 'canonical-test-public-config'
    };
  }

  return {
    url: process.env.JDJ_SUPABASE_URL || '',
    key: process.env.JDJ_SUPABASE_KEY || '',
    environment: 'ENV',
    source: 'netlify-env'
  };
}

export function publicSupabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json'
  };
}
