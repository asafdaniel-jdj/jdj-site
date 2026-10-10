const SUPABASE_URL = process.env.JDJ_SUPABASE_URL;
const SUPABASE_KEY = process.env.JDJ_SUPABASE_KEY;

const CACHE_SECONDS = 2_592_000; // 30 days, invalidated explicitly by SEO cache tags
const STALE_SECONDS = 3_600; // 1 hour grace

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

async function supabaseSingle(table, filters) {
  const params = new URLSearchParams({
    select: "*",
    ...filters,
    limit: "1",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${table} failed: ${response.status} ${details}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
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
  const templateKey = (url.searchParams.get("templateKey") || "").trim();
  const seoKey = (url.searchParams.get("seoKey") || "").trim();

  if (!templateKey && !seoKey) {
    return json({ error: "Missing SEO lookup key" }, 400);
  }

  try {
    const [template, override] = await Promise.all([
      templateKey
        ? supabaseSingle("seo_templates", {
            template_key: `eq.${templateKey}`,
            is_active: "eq.true",
          })
        : Promise.resolve(null),
      seoKey
        ? supabaseSingle("seo_overrides", {
            seo_key: `eq.${seoKey}`,
            is_active: "eq.true",
          })
        : Promise.resolve(null),
    ]);

    const tags = ["seo-data"];
    if (templateKey) tags.push(`seo-template:${templateKey}`, "seo-templates");
    if (seoKey) tags.push(`seo-override:${seoKey}`, "seo-overrides");

    return json({ template, override }, 200, {
      "Netlify-CDN-Cache-Control": `public, durable, max-age=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      "Netlify-Cache-Tag": tags.join(","),
    });
  } catch (error) {
    console.error("SEO data function failed", error);
    return json({ error: "Temporary SEO service error" }, 500);
  }
};
