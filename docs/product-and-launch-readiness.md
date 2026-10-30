# Soma product and launch readiness

## Product copy and experience
- [x] Plain-language positioning for income planning, spending, bills and savings goals.
- [x] Messaging for both regular and irregular earners.
- [x] Marketing figures and example bill dates labelled as illustrative.
- [x] New planner defaults contain no pre-filled transactions, bills or savings goals.
- [x] Planner empty states and placeholder identity improved.
- [x] Browser-only storage limitation explained in the planner and legal pages.
- [x] SEO and social metadata updated.

## Current product limitations
- Planner persistence remains browser local storage. Account sign-in, cloud synchronisation, and cross-device recovery are not available.
- Existing browser profiles may retain older saved data, including sample records. Changing defaults does not automatically clear existing local storage.
- Cloud recovery and built-in export are not available. Keep a separate record of critical payment obligations.

## Before enabling account-based features
- [ ] Validate the final architecture and handlers; run build, type-check, accessibility, security and end-to-end tests.
- [ ] Add authentication, account recovery, sign-out and session-expiry handling.
- [ ] Add cloud persistence, consent-based local-data migration, visible save/sync state and safe error handling.
- [ ] Add account/data deletion, cross-user isolation and conflict-handling tests.
- [ ] Review privacy and terms against the actual deployed services and data flows.
- [ ] Verify calculations, currency handling, mobile layouts, keyboard navigation and accessible errors.
- [ ] If access must remain private, restrict it at the hosting/deployment layer; robots.txt is not access control.
