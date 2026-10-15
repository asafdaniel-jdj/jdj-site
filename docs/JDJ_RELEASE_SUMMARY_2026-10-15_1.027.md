# מסלולי הג׳יפים של מדבר יהודה
## Release Summary — 1.027 — 15.10.2026

**סטטוס:** PROD deployed + Post-PROD QA completed  
**Sprint:** 1.027, ID 266 — Closed  
**PROD branch:** `main`  
**Release commit:** `5f3f60467cdec8126d4c1b850d76f26c466bee4b`

## מטרת הגרסה

חיזוק ארכיטקטורת הקאש, ביטול חוסר התאמה במומלצים, צמצום Direct DB מהאתר הציבורי, הוספת observability קבועה והרחבת QA של שכבת הנתונים.

## משימות 1.027

- JDJ-61 — הסרת טקסט אוטומטי שגוי מחלונית נקודת מוצא/ניקוז.
- JDJ-63 — מקור Cache משותף למומלצים ב-Home וב-Category.
- JDJ-64 — purge אוטומטי ל-`recommended` לאחר הרענון היומי.
- JDJ-65 — Disclaimer דרך Data Cache Proxy.
- JDJ-66 — לוג ו-observability ל-fallback ל-Supabase.
- JDJ-67 — Cache Contract QA ו-Public sweep.
- JDJ-68 — תיעוד ארכיטקטורת Data Cache והחרגות.

## Deploy Preview QA

Sprint Preview QA: **7/7 PASS**.

אומת:
- Preview → Supabase TEST בלבד.
- Recommended endpoint תקין.
- purge tag `recommended` תקין.
- Disclaimer ללא Direct DB.
- Public sweep 22 עמודים ללא Direct DB לא צפוי.
- fallback כפוי מזוהה ונרשם.
- Flood popup text fix תקין.

## אירוע Environment במהלך העלייה

לאחר עליית 1.027 התברר שמשתני `JDJ_SUPABASE_URL` / `JDJ_SUPABASE_KEY` בפרויקט Netlify של PROD הוגדרו לערכי TEST.

השפעה:
- Functions/Edge של האתר החי קראו DB של TEST.
- מסלולים שקיימים רק ב-PROD, כולל `200047`, לא הופיעו.
- Home קיבל `home_season_mode=winter` מ-TEST במקום `summer` מ-PROD.

לא היה אובדן מידע ב-Supabase PROD.

תיקון:
1. הוחזרו Environment Variables של PROD בכל contexts של פרויקט PROD.
2. בוצע `Clear cache and deploy site`.
3. נבדקו לוגי PROD/TEST.
4. `200047` נטען שוב מה-DB הנכון.

כלל חדש: בידוד ENV הוא לפי **פרויקט Netlify**. אתר PROD משתמש בערכי PROD בכל deploy contexts; אתר TEST משתמש בערכי TEST בכל deploy contexts.

## Post-PROD Cache QA

בדיקה מקיפה ב-PROD ב-15.10.2026:

- Environment: PASS — `jdj.co.il` מצביע ל-Supabase PROD.
- Recommended: PASS — Endpoint, Home ו-Category הציגו `200012`, `200023`, `200042`.
- Disclaimer: PASS — `collection-data`, ללא Direct DB.
- Observability: PASS — logger זמין ומחזיר 204.
- Public pages: PASS מעשי — לא זוהו Direct DB ל-PROD/TEST; timeout של iframe על `/` הוכח כ-false negative כי Cold test של `/` עבר.
- Cold Cache: PASS — Home, Category, Item `200047`, Disclaimer, Flood River עברו `MISS-STORED → HIT`, HTTP 200.
- Flood popup: PASS — הטקסט השגוי אינו קיים.
- Scheduled purge: PASS — הופעל ידנית דרך Netlify `Run now`; לאחר מכן `recommended-routes` החזיר 200 ו-Home נשאר מסונכרן.

## Edge timeout

במהלך העבודה נצפה פעם אחת מסך Netlify:

`This edge function has crashed`  
`the edge function timed out`

לאחר תיקון Environment ו-redeploy התקלה לא שוחזרה. Cold MISS של העמודים המרכזיים עבר ללא crash.

האירוע **אינו נחשב root-caused**. נפתחה משימת המשך `JDJ-69` לחקירת Netlify Edge logs ולהקשחת timeout/fail-open.

Code review מצביע על אזורי סיכון אפשריים:
- שרשרת של מספר Edge Functions עם `context.next()` ו-buffering של response.
- קריאות DB/SEO ב-Edge ללא timeout מפורש.
- cache write שממתין לפני החזרת response.

אין שינוי runtime נוסף ב-1.027 על בסיס השערה בלבד.

## מצב סופי

1.027 פעילה ב-PROD ועברה Post-PROD QA.

Known follow-up:
- `JDJ-69` — Edge timeout hardening / root cause.
- לוודא בריצה הלילית הבאה שה-Scheduled purge רץ אוטומטית ב-00:01 UTC ולא רק ב-`Run now`.
