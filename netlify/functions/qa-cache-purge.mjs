import { purgeCache } from '@netlify/functions';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function isNonProdHost(hostname = '') {
  const host = String(hostname || '').toLowerCase();
  return host === 'jdj-test.netlify.app' || host.endsWith('--jdj-test.netlify.app');
}

export default async (request) => {
  const url = new URL(request.url);

  if (!isNonProdHost(url.hostname)) {
    return json({ error: 'QA endpoint is disabled outside TEST/Deploy Preview' }, 404);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    await purgeCache({ tags: ['recommended'] });
    return json({
      ok: true,
      environment: 'TEST/PREVIEW',
      tags: ['recommended'],
      purgedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('QA recommended purge failed', error);
    return json({ error: 'QA recommended purge failed' }, 500);
  }
};
