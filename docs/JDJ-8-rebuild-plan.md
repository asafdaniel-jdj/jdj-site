# JDJ-8 rebuild plan

Safe rebuild approach for the private trips calendar.

## Guardrails

- Do not modify `JDJ_SUPABASE_KEY`.
- Do not modify `JDJ_SUPABASE_URL`.
- Do not deploy JDJ-8 changes directly to `test` until the backend endpoint is verified independently.
- Keep all JDJ-8 work on a dedicated feature branch first.
- The private calendar backend must use dedicated environment variables only.

## Dedicated variables

- `JDJ_PRIVATE_CALENDAR_SUPABASE_URL`
- `JDJ_PRIVATE_CALENDAR_SERVICE_KEY`
- `JDJ_PRIVATE_CALENDAR_PASSWORD`

## Build order

1. Isolated backend endpoint only.
2. Verify authentication and DB read independently.
3. Verify hidden rows are excluded.
4. Verify no impact on existing site DB calls.
5. Only then connect the public calendar UI.
6. Only after QA promote the approved files to TEST.

## Rollback point

Stable TEST baseline before the rebuild: `abd4d33ba6967b67d715532c2c853d40c102d6bc`.
