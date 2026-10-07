const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;

const NOT_FOUND_CACHE_SECONDS = 30;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export default async (request) => {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing JDJ_SUPABASE_URL / JDJ_SUPABASE_KEY");
    return json({ error: "Server configuration error" }, 500);
  }

  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim();

  if (!/^\d+$/.test(id)) {
    return json({ error: "Invalid route id" }, 400);
  }

  const params = new URLSearchParams({
    select: "*",
    status: "eq.פורסם",
    route_type: "eq.מסלול טיול",
    id: `eq.${id}`,
    limit: "1",
  });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/routes?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Supabase route request failed", response.status, details);
      return json({ error: "Route lookup failed" }, 502);
    }

    const rows = await response.json();
    const route = Array.isArray(rows) ? rows[0] : null;

    if (!route) {
      return json({ error: "Route not found" }, 404, {
        "Netlify-CDN-Cache-Control": `public, durable, max-age=${NOT_FOUND_CACHE_SECONDS}`,
        "Netlify-Cache-Tag": `route:${id},routes-products`,
      });
    }

    // Correctness-first hotfix: Admin route saves currently do not invalidate
    // the route:<id> CDN tag, so successful route responses can remain stale
    // after gallery/media updates. Disable CDN caching for successful route
    // responses until targeted invalidation is wired into the Admin save flow.
    return json({ data: route }, 200, {
      "Netlify-CDN-Cache-Control": "no-store",
      "Netlify-Cache-Tag": `route:${id},routes-products`,
    });
  } catch (error) {
    console.error("Route data function failed", error);
    return json({ error: "Temporary route service error" }, 500);
  }
};
