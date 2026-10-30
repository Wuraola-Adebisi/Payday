# Soma

Soma brings personal and shared money management together. It helps people keep their own budgets and savings goals in view while organising the costs they share with partners, housemates, family or a household.

## Shared money

The local-first shared workspace supports:
- Creating separate spaces for a household, couple, flatmates or another group.
- Adding members by name and email label.
- Recording shared expenses, choosing who paid, and splitting each expense equally among selected people.
- Reviewing each member's running balance and suggested settlements.
- Recording settlements after money has changed hands.
- Exporting a branded statement with balances, expense splits, suggested settlements and settlement history.

**Important:** the current shared workspace is stored in this browser on this device. Adding a person does not invite them or give them access from another device. There is no account sign-in, cloud sync, cross-device collaboration or payment processing in this version. The email field is used as a label only.

## Personal money

The existing personal planner remains available for:
- Recording income and everyday spending.
- Building a budget around your income and priorities.
- Tracking bills, due dates and payment status.
- Setting savings goals and monitoring progress.
- Reviewing summaries and exporting styled reports and transaction records.

Personal planner data and shared-space data are stored separately in browser storage. They are not automatically merged.

## Styled exports

Soma generates its own branded report layouts for supported personal planner pages and the shared money ledger. From the report view, you can print or save as PDF, or download a standalone HTML copy. Print pagination and colour output can vary by browser and printer settings. Reports are personal records, not bank-issued statements or proof of payment.

## Current product status

Soma stores personal and shared workspace records in local browser storage on the device you use. Browser data can be lost if site data is cleared or the device becomes unavailable, and records do not automatically appear on another device. Export important records and keep separate copies of critical bills and balances.

Soma does not connect to bank accounts, initiate payments or independently verify financial records. All balances depend on the information entered. Soma is a planning tool, not a bank or financial adviser.

## Next product layer

Cloud accounts, real invitations, secure cross-device synchronisation, and shared household access controls are planned for a later iteration. The current MVP deliberately prioritises working core flows without requiring a backend.

## Run it

```
npm install
npm run dev        # local development
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build locally
```

Open `/app` for the planner. `/app#shared` opens Shared money directly.

## Deploy

The project deploys on Vercel. `vercel.json` rewrites every path to `index.html` and redirects the retired `/ai` page to `/`. After a deploy, load the live URL and confirm it shows the change before debugging anything else.

## Design tokens

`src/tokens.css` holds the primitives and the role tokens (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`). New styles use the role tokens. `src/index.css` still holds older planner styles that reference them, and they are being moved over gradually.
