# MASTER — מסלולי הג'יפים של מדבר יהודה

**מסמך מאסטר לפיתוח האתר**  
**גרסה:** 1.3 | **עודכן:** 15.10.2026

> נקודת פתיחה קבועה לכל עבודת פיתוח. בעת סתירה, המצב החי בקוד/DB/Netlify גובר על תיעוד היסטורי.

## זהות ומקורות אמת

השם הרשמי הוא **מסלולי הג'יפים של מדבר יהודה**. JDJ הוא קיצור טכני בלבד.

סדר מקורות האמת: מערכות חיות וקוד → Supabase → Jira → MASTER → תיעוד היסטורי.

## סביבות

**PROD**
- Public: `https://jdj.co.il`
- Admin: `https://xadmin.jdj.co.il`
- Git branch: `main`
- Supabase project ref: `edjmwcnxsqnsxqrcsjxp`

**TEST**
- Public: `https://jdj-test.netlify.app`
- Admin: `https://xadmin-test.netlify.app`
- Git branch: `test`
- Supabase project ref: `sdekeyakrtdwmykvpbwq`

**כלל מחייב:** אין שינוי ב-PROD ללא אישור מפורש של אסף.

**כלל Netlify מחייב:** לכל אתר Netlify יש Environment עצמאי. בפרויקט PROD כל ה-Deploy contexts משתמשים בערכי PROD; בפרויקט TEST כל ה-Deploy contexts משתמשים בערכי TEST. לפני שינוי `JDJ_SUPABASE_URL` או `JDJ_SUPABASE_KEY` מאמתים גם את שם פרויקט Netlify וגם את Production domain. אחרי שינוי Environment מאמתים בפועל את ה-deploy והלוגים.

## GitHub

- Public: `asafdaniel-jdj/jdj-site` — branches `main`, `test`
- Admin: `asafdaniel-jdj/jdj-admin` — branches `main`, `test`

Workflow:

`ענף עבודה → Deploy Preview → QA נקודתי → TEST רק כשנדרש → QA מלא → Release Candidate → Deploy Preview → אישור מפורש → PROD → Smoke QA`

אין לבצע Merge עיוור של `test` ל-`main`.

## Supabase ותוכן

טבלאות מרכזיות: `routes`, `route_points`, `pages`, `articles`, `khans`, `flood_rivers`, `flood_river_points`, `floods_page_config`, `seo_templates`, `seo_overrides`.

PROD הוא מקור האמת לתוכן החי. רענון PROD→TEST הוא פעולה ידנית ובהוראה מפורשת. אין TEST→PROD אוטומטי.

## Data Cache — ארכיטקטורה 1.027

ברירת המחדל באתר הציבורי:

`Browser → Netlify Data Cache/API → Supabase`

הדפדפן אינו אמור לפנות ישירות ל-Supabase עבור מידע ציבורי רגיל. `seo-db.js` משמש בפועל כ-Data Cache Proxy. fallback ישיר מותר רק בצורה מבוקרת ומתועדת, עם observability.

מקורות מרכזיים:
- `collection-data` — Collections ורשימות; סביב 24 שעות + stale שעה.
- `recommended-routes` — מקור משותף ל-Home ול-Category; TTL שעה, ללא stale.
- `route-data` — Route detail; סביב 30 יום + stale שעה.
- `content-data` — Point/Khan/Article detail; סביב 30 יום + stale שעה.
- Page Cache — Discovery סביב 24 שעות; deep pages סביב 30 יום.
- Trips — החרגה מכוונת עם `no-store` ו-noindex.

לאחר `refresh_daily_recommended_routes()` מתבצע purge ל-tag `recommended`; TTL הוא גיבוי ולא מנגנון הרענון היחיד.

## SEO

Clean URLs, sitemap דינמי, Canonical/OG/Twitter ו-Edge metadata. `seo_templates` הם ברירת מחדל ו-`seo_overrides` מאפשרים עקיפה ידנית. TEST אמור להיות `noindex,nofollow`.

## שטפונות

נתיבים מרכזיים: `/floods`, `/floods/judean-desert`, `/floods/negev-arava`, `/floods/<region>/<river>`.

ב-1.027 הוסר הטקסט האוטומטי השגוי בחלונית נקודת מוצא/ניקוז.

## מצב Release — 1.027

1.027 עלתה ל-PROD ב-15.10.2026. Release commit:

`5f3f60467cdec8126d4c1b850d76f26c466bee4b`

Sprint 1.027, ID 266, נסגר ב-14.10.2026.

משימות: JDJ-61, JDJ-63, JDJ-64, JDJ-65, JDJ-66, JDJ-67, JDJ-68.

Post-PROD QA:
- PROD אומת מול Supabase PROD.
- `200047` נטען תקין.
- Home ו-Category הציגו אותה שלישיית מומלצים: `200012`, `200023`, `200042`.
- Disclaimer עבר דרך `collection-data` ללא Direct DB מהדפדפן.
- Cold Cache עבר על Home, Category, Item, Disclaimer ו-Flood River: `MISS-STORED → HIT`, HTTP 200.
- purge ידני ל-`recommended` הורץ דרך Netlify `Run now`; לאחריו endpoint + Home נשארו מסונכרנים.
- Flood popup fix אומת ב-PROD.
- בבדיקות Public לא זוהו קריאות Browser ישירות ל-`/rest/v1` בעמודים שנבדקו.

## אירוע Environment — 15.10.2026

במהלך העלייה, משתני Netlify של אתר PROD הוגדרו לזמן קצר לערכי TEST. Functions/Edge של האתר החי קראו Supabase TEST ולכן תוכן PROD-only לא הופיע ו-Home קיבל מצב עונתי של TEST.

ה-DB של PROD לא נפגע. התיקון היה:
1. החזרת `JDJ_SUPABASE_URL` ו-`JDJ_SUPABASE_KEY` לערכי PROD בפרויקט PROD.
2. `Clear cache and deploy site`.
3. אימות לוגים: PROD→PROD DB, TEST→TEST DB.

## Edge timeout

נצפתה פעם אחת קריסת Netlify Edge עם `the edge function timed out`. לאחר תיקון Environment ו-redeploy התקלה לא שוחזרה. Cold MISS של עמודי המפתח עבר ללא crash.

האירוע אינו נחשב root-caused. נפתחה `JDJ-69` לחקירת Netlify Edge logs ולהקשחת timeout/fail-open. אין לבצע שינוי runtime נוסף על בסיס השערה בלבד.

## כללי QA מחייבים

לפני Promotion:
- לוודא Environment Browser + Functions/Edge מול DB הנכון.
- להריץ Cache Contract QA.
- לבדוק Direct DB ב-Network.
- לבדוק Cold MISS→HIT בעמודי מפתח.
- לוודא Home/Category מול `recommended-routes`.
- לבדוק purge Scheduled Function דרך Netlify `Run now` בעת QA ידני.
- Desktop + Mobile + Console + Network + URLs עמוקים.

## Change Log

**15.10.2026 — v1.3:** 1.027 PROD; Post-PROD Cache QA; תיעוד אירוע Environment; כלל בידוד Netlify לפי פרויקט; Scheduled purge QA; JDJ-69 בעקבות Edge timeout.

**14.10.2026 — v1.2:** תיעוד ארכיטקטורת Data Cache, recommended, purge, observability ו-Preview-first workflow.
