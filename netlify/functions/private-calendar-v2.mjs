const SUPABASE_URL = process.env.JDJ_PRIVATE_CALENDAR_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.JDJ_PRIVATE_CALENDAR_SERVICE_KEY;
const CALENDAR_PASSWORD = process.env.JDJ_PRIVATE_CALENDAR_PASSWORD;
const COOKIE_NAME = 'jdj_private_calendar_v2';

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      ...extraHeaders,
    },
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

async function expectedToken() {
  if (!CALENDAR_PASSWORD) return '';
  return sha256(`jdj-private-calendar-v2:${CALENDAR_PASSWORD}`);
}

async function isAuthorized(request) {
  const expected = await expectedToken();
  return Boolean(expected) && readCookie(request, COOKIE_NAME) === expected;
}

function supabaseHeaders() {
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Accept: 'application/json',
  };

  if (SUPABASE_SERVICE_KEY && !SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_KEY}`;
  }

  return headers;
}

async function fetchItems() {
  const params = new URLSearchParams({
    select: 'id,item_type,title,start_date,end_date,region,summary,status,whatsapp_url,event_url,location_url,guide_name,route_url,is_visible,slug',
    is_visible: 'eq.true',
    order: 'start_date.asc,title.asc',
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/private_calendar_items?${params.toString()}`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('private-calendar-v2 Supabase error', response.status, details);
    throw new Error('Calendar data unavailable');
  }

  const items = await response.json();
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    ...item,
    whatsapp_url: item?.item_type === 'trip' && item?.status === 'פתוח' ? item.whatsapp_url : null,
  }));
}

export default async (request) => {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.searchParams.get('health') === '1') {
      return json({
        ok: Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && CALENDAR_PASSWORD),
        configured: {
          supabaseUrl: Boolean(SUPABASE_URL),
          serviceKey: Boolean(SUPABASE_SERVICE_KEY),
          password: Boolean(CALENDAR_PASSWORD),
        },
      }, SUPABASE_URL && SUPABASE_SERVICE_KEY && CALENDAR_PASSWORD ? 200 : 503);
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ ok: false, error: 'Server configuration error' }, 500);
  }

  if (!CALENDAR_PASSWORD) {
    return json({ ok: false, error: 'Calendar password is not configured' }, 503);
  }

  if (request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {}

    if (body?.action === 'logout') {
      return json({ ok: true }, 200, {
        'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      });
    }

    if (body?.action !== 'login' || typeof body?.password !== 'string') {
      return json({ ok: false, error: 'Invalid request' }, 400);
    }

    const supplied = await sha256(`jdj-private-calendar-v2:${body.password}`);
    const expected = await expectedToken();

    if (supplied !== expected) {
      return json({ ok: false, error: 'סיסמה שגויה' }, 401);
    }

    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(expected)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    });
  }

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
  }

  if (!(await isAuthorized(request))) {
    return json({ ok: false, authenticated: false }, 401);
  }

  try {
    const items = await fetchItems();
    return json({
      ok: true,
      authenticated: true,
      items: Array.isArray(items) ? items : [],
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'Calendar data unavailable' }, 502);
  }
};
