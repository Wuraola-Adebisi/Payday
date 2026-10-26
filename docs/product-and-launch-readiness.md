# Payday product and launch readiness

## Product copy and experience
- [x] Explain the core value in plain language: plan income, track spending, prepare for bills and work towards savings goals.
- [x] Support both regular and irregular earners in product messaging.
- [x] Remove AI claims from the main homepage pitch and primary navigation. AI is not implemented.
- [x] Label marketing-dashboard figures and sample bills as illustrative examples.
- [x] Start new planner data with empty transactions, bills and goals rather than pre-filled personal-finance records.
- [x] Replace placeholder profile identity and improve empty-state copy.
- [x] Tell users that planner data is saved on the current device.
- [x] Surface browser-storage save failures instead of silently treating them as successful.
- [x] Update title, description and social metadata.
- [x] Ask crawlers not to index the site while launch readiness is incomplete.

## Current technical reality
- Planner persistence is still browser local storage. The AWS provider is not connected.
- The AWS SAM template is infrastructure scaffolding only. No AWS resources have been deployed.
- There is no account sign-up, sign-in, account recovery, cross-device sync, consent-based data migration, account deletion workflow or server-side access control yet.
- Existing browser profiles may already contain older saved data, including earlier sample records. The new empty defaults do not automatically rewrite existing local storage. Review existing records before relying on them.

## Required before public launch
- [ ] Restrict access at the hosting/deployment layer while the product is private. robots.txt is not access control and does not prevent someone opening the URL.
- [ ] Validate the AWS SAM template and Lambda handlers; run build, type-check, accessibility, security and end-to-end tests.
- [ ] Deploy a private staging stack only after setting an AWS region, budget alerts and spending limits.
- [ ] Implement Cognito sign-up/sign-in, verification, recovery, sign-out and session expiry handling.
- [ ] Implement an authenticated API client and replace browser-only persistence with the AWS data provider.
- [ ] Add explicit consent before migrating existing browser data to an account; explain what will be uploaded and provide a safe cancel path.
- [ ] Add visible save/loading/error state and prevent navigation from silently losing unsaved changes.
- [ ] Add cross-account isolation tests, request validation, optimistic concurrency/version handling, deletion and recovery tests.
- [ ] Test mobile layouts, keyboard navigation, labels, error announcements, date handling and chart descriptions.
- [ ] Review the privacy notice and terms against the deployed hosting, authentication, storage, logging, analytics and support processes.
- [ ] Confirm all calculations distinguish planned amounts from recorded transactions and are correct for empty data, irregular income and currency changes.
- [ ] Check production metadata, social preview, canonical URLs, sitemap/robots policy, contact address and legal pages.
- [ ] Only open the product to general users after the above items have been tested and reviewed.

## AWS Activate accuracy
Describe AWS as planned infrastructure until it is deployed and connected. Do not claim live AWS usage, cloud synchronisation or AI inference costs before those features are actually running.
