const TEST_SUPABASE_URL = 'https://sdekeyakrtdwmykvpbwq.supabase.co';
const TEST_SUPABASE_KEY = 'sb_publishable_Zt1DlF4MDoNQcLvAybABZQ_FrKfqq5Z';

export function isTestHost(hostname = '') {
  const host = String(hostname).toLowerCase();
  return host === 'jdj-test.netlify.app' || host.endsWith('--jdj-test.netlify.app');
}

export function getEdgeSupabasePublicConfig(request) {
  const url = new URL(request.url);
  if (isTestHost(url.hostname)) {
    return {
      url: TEST_SUPABASE_URL,
      key: TEST_SUPABASE_KEY,
      environment: 'TEST/PREVIEW'
    };
  }

  return {
    url: Netlify.env.get('JDJ_SUPABASE_URL') || '',
    key: Netlify.env.get('JDJ_SUPABASE_KEY') || '',
    environment: 'ENV'
  };
}

export function edgeSupabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json'
  };
}
