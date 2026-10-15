# Checklist לפני עלייה ל-PROD

> Release Gate מחייב. אין deploy ל-PROD לפני שכל הסעיפים הרלוונטיים תקינים ויש אישור מפורש.

## Release Gate

- [ ] משימות הספרינט הרלוונטיות עברו QA ואין Blocker פתוח
- [ ] בוצע compare בין RC ל-`main`
- [ ] לא בוצע merge עיוור של `test`
- [ ] אומתו קבצי Environment
- [ ] לפני שינוי Netlify Environment אומתו **שם הפרויקט + Production domain**
- [ ] בפרויקט Netlify PROD כל ה-Deploy contexts מצביעים ל-Supabase PROD
- [ ] בפרויקט Netlify TEST כל ה-Deploy contexts מצביעים ל-Supabase TEST
- [ ] אם Environment השתנה: בוצע redeploy/`Clear cache and deploy site` לפי הצורך
- [ ] לאחר שינוי Environment אומתה תעבורה בפועל בלוגים מול DB היעד
- [ ] PROD Public מצביע ל-Supabase PROD בלבד
- [ ] PROD Admin מצביע ל-Supabase PROD בלבד
- [ ] אין URL קשיח של TEST בקוד שמקודם ל-PROD

## SEO / Robots

- [ ] TEST נשאר `noindex,nofollow`
- [ ] PROD אינו מקבל `noindex`
- [ ] `robots.txt` PROD פתוח ומפנה ל-Sitemap הנכון
- [ ] `sitemap.xml` מכיל URL-ים של PROD בלבד
- [ ] Canonical מצביע ל-`https://jdj.co.il`
- [ ] Early Access לא מופיע בקטגוריות/search/sitemap בזמן החלון

## Cache / Data Layer

- [ ] Cache Contract QA עבר ב-Preview/TEST
- [ ] Public sweep לא מצא Browser Direct DB לא צפוי
- [ ] Home ו-Category משתמשים ב-`recommended-routes` ומציגים אותה שלישייה
- [ ] `recommended` TTL שעה, ללא stale
- [ ] Scheduled purge קיים לאחר הרענון היומי
- [ ] QA ידני ל-`purge-recommended-scheduled` בוצע דרך Netlify `Run now`, לא דרך Browser URL
- [ ] לאחר purge `recommended-routes` מחזיר 200 ו-Home/Category נשארים מסונכרנים
- [ ] Disclaimer משתמש ב-Data Cache Proxy ללא Direct DB
- [ ] fallback ל-Supabase מזוהה ונרשם ללא מידע רגיש
- [ ] `/stories` ו-`/khan-catalog` משתמשים ב-`collection-data`
- [ ] נבדקו TTL ו-cache tags של Collection / Product / Recommended / SEO

## Cold Cache / Edge

- [ ] Home: `MISS-STORED → HIT`, ללא crash
- [ ] Category: `MISS-STORED → HIT`, ללא crash
- [ ] Item: `MISS-STORED → HIT`, ללא crash
- [ ] Disclaimer: `MISS-STORED → HIT`, ללא crash
- [ ] Flood River: `MISS-STORED → HIT`, ללא crash
- [ ] אין מסך `This edge function has crashed` בעמודי המפתח
- [ ] אם היה Edge timeout: נבדקו Netlify Edge logs ונפתחה משימת follow-up אם אין root cause

## Netlify / Functions

- [ ] נבדקו `_redirects`, `_headers`, `netlify.toml` אם קיים
- [ ] Functions/Edge משתמשים ב-ENV של סביבת היעד
- [ ] אין פונקציות TEST-only ב-PROD
- [ ] Deploy log ללא שגיאות חוסמות
- [ ] Scheduled Functions מופיעות בסביבה הנכונה וב-schedule הנכון

## Smoke QA

- [ ] Home
- [ ] Category routes
- [ ] Category technical
- [ ] Category viewpoints
- [ ] Category water
- [ ] Category poi
- [ ] Item
- [ ] Point
- [ ] Khan
- [ ] Khan Catalog
- [ ] Stories
- [ ] Article
- [ ] Floods
- [ ] Flood Region
- [ ] Flood River
- [ ] About
- [ ] Disclaimer
- [ ] Access
- [ ] Camp
- [ ] Mview
- [ ] Accessibility
- [ ] Mobile 390px
- [ ] Mobile 430px
- [ ] Desktop
- [ ] Console ללא שגיאות חדשות משמעותיות
- [ ] Network ללא קריאות ל-TEST מתוך PROD

## Final Promotion

- [ ] תועד commit/compare מדויק
- [ ] קיימת נקודת Rollback ברורה
- [ ] התקבל אישור מפורש ל-PROD
- [ ] Deploy ל-PROD
- [ ] Smoke QA מיד לאחר העלייה
- [ ] PROD→PROD DB אומת בלוגים
- [ ] TEST→TEST DB נשאר מבודד
- [ ] רק לאחר הצלחה: סגירת Release וסיכום

## לקח 1.027

ב-15.10.2026 ערכי TEST הוגדרו בטעות בפרויקט Netlify של PROD. מעתה Environment Gate כולל תמיד אימות **Project + Production domain + DB logs** ולא רק בדיקת הערך עצמו.
