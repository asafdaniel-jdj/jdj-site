# מסלולי הג׳יפים של מדבר יהודה
## מדריך סביבות עבודה, הפרדת TEST / PROD ונוהל העלאת גרסה

**עודכן:** 15.10.2026

## כלל העל

`ענף עבודה → Deploy Preview → QA → TEST רק כשנדרש → Release Candidate → Deploy Preview → אישור מפורש → PROD → Smoke QA`

אין שינוי ב-PROD ללא אישור מפורש של אסף. אין Merge עיוור של `test` ל-`main`.

## מפת הסביבות

### PROD
- Public: `https://jdj.co.il`
- Admin: `https://xadmin.jdj.co.il`
- Branch: `main`
- Supabase ref: `edjmwcnxsqnsxqrcsjxp`

### TEST
- Public: `https://jdj-test.netlify.app`
- Admin: `https://xadmin-test.netlify.app`
- Branch: `test`
- Supabase ref: `sdekeyakrtdwmykvpbwq`

## Netlify Environment Variables — כלל מחייב

הבידוד נקבע לפי **פרויקט Netlify**.

- באתר Netlify של PROD כל ה-Deploy contexts משתמשים בערכי Supabase PROD.
- באתר Netlify של TEST כל ה-Deploy contexts משתמשים בערכי Supabase TEST.
- אין להכניס ערכי TEST ל-context כלשהו של אתר PROD, ולהפך.
- לפני שינוי `JDJ_SUPABASE_URL` / `JDJ_SUPABASE_KEY` בודקים את שם הפרויקט ואת Production domain.
- אחרי שינוי Environment לא מסתפקים ב-Save: מוודאים שה-deploy הפעיל קיבל את הערכים. לפי הצורך מבצעים `Clear cache and deploy site`.
- האימות הסופי הוא תעבורה אמיתית: תוכן שמבדיל בין הסביבות + Supabase logs.

אירוע 15.10.2026: אתר PROD קיבל לזמן קצר Environment של TEST. Functions/Edge של PROD קראו Supabase TEST. לא היה אובדן מידע. לאחר החזרת PROD ENV + Clear cache/redeploy + בדיקת לוגים הופרדו שוב הסביבות.

## Deploy Preview

Deploy Preview הוא ברירת המחדל ל-QA של שינוי מבודד. TEST קבוע משמש רק כשנדרש QA אינטגרטיבי, כתובת קבועה, מצב נתונים מתמשך או שילוב Public+Admin.

לפני בדיקת נתונים ב-Preview חובה לוודא שגם Browser config וגם Functions/Edge מצביעים ל-Supabase TEST בלבד. Preview לא מאומת משמש UI/Static בלבד.

## env-config.js

`env-config.js` הוא סביבתי ואסור להעתיק אותו בצורה עיוורת.

PROD חייב להצהיר PROD ולהצביע ל-`edjmwcnxsqnsxqrcsjxp`.
TEST חייב להצהיר TEST ולהצביע ל-`sdekeyakrtdwmykvpbwq`.

## SEO / Robots

TEST: `noindex,nofollow`, חסום לגוגל, ללא Sitemap ציבורי לאינדוקס.

PROD: indexable, `robots.txt` פתוח, sitemap של `jdj.co.il`, Canonical של PROD בלבד.

Release Gate: לבדוק שאין `noindex` ב-PROD, שאין URL של TEST ב-Canonical/Sitemap, וש-Early Access אינו מופיע בזמן החלון.

## Data Cache

ברירת המחדל:

`Browser → Netlify Data Cache/API → Supabase`

Direct DB מהדפדפן אינו מסלול רגיל. הוא מותר רק כהחרגה מתועדת או fallback מבוקר.

- Collections: סביב 24 שעות + stale שעה.
- Recommended: שעה, ללא stale, purge אוטומטי לאחר הרענון היומי.
- Entity/Deep data: סביב 30 יום + stale שעה.
- Trips: `no-store` במכוון.

## Recommended purge

`purge-recommended-scheduled` היא Scheduled Function. QA ידני מבצעים דרך:

Netlify → Cloud compute → Functions → `purge-recommended-scheduled` → `Run now`

קריאה ישירה מהדפדפן ל-URL של Scheduled Function יכולה להחזיר 403 ואינה מעידה שהפונקציה שבורה.

לאחר `Run now` יש לוודא ש-`recommended-routes` מחזיר 200 וש-Home ו-Category עדיין מציגים אותה שלישייה.

## Edge Functions / Functions

יש לבדוק בכל Release:
- `_redirects`
- `_headers` אם קיים
- `netlify.toml` אם קיים
- Edge Functions
- Netlify Functions
- Environment של סביבת היעד

### Edge timeout / fail-open

קריאות שאינן קריטיות לתוכן הבסיסי של העמוד, כגון SEO enrichment או cache warmup, לא אמורות להפיל את האתר במקרה של איטיות.

כללי hardening:
- external fetch ב-Edge צריך timeout מפורש כאשר אפשר.
- שירות משני שנכשל צריך fail-open/fallback בטוח.
- עבודה אסינכרונית לא קריטית שאינה חייבת להסתיים לפני response יכולה לעבור ל-`context.waitUntil()` אם הדבר בטוח מבחינת Netlify.
- לאחר שינוי Edge לבצע Cold MISS→HIT על Home, Category, Item, Disclaimer ו-Flood River.
- מסך `This edge function has crashed` דורש בדיקת Edge logs ולא סגירה על בסיס retry בלבד.

ב-15.10.2026 נצפה timeout חד-פעמי שלא שוחזר לאחר תיקון ENV ו-redeploy. `JDJ-69` עוקבת אחרי החקירה וה-hardening.

## Supabase

TEST ו-PROD הם DB נפרדים. אין Sync אוטומטי TEST→PROD. רענון PROD→TEST ידני בלבד.

לפני Promotion מוודאים שטבלאות, שדות, RPCs ומיגרציות הנדרשים לגרסה קיימים ב-PROD.

## Storage

TEST אינו רשאי לכתוב/למחוק ב-PROD Storage. אין Service Role של PROD בקוד Browser.

## Analytics

TEST אינו שולח GA4 PROD. PROD משתמש ב-Measurement ID המאושר `G-8XZHZXFHCY`.

## Release Candidate

RC נקי מבוסס `main` וכולל רק שינויים מאושרים. אין לקדם את `test` עצמו ל-PROD.

לפני PROD:
1. compare מול `main`
2. QA ל-RC
3. Environment gate
4. Release Checklist
5. אישור מפורש
6. deploy
7. Smoke QA + DB/log verification

## מקורות אמת

- GitHub — קוד ו-branches
- Supabase — DB/Storage/logs
- Netlify — Deploys/Environment/Functions/Edge logs
- Jira — משימות ו-Release
- MASTER — ארכיטקטורה והחלטות

בכל ספק: **לא מנחשים. בודקים.**
