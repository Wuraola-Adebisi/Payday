# Payday cloud-backend roadmap

## Product objective

Make Payday's existing money-planning features available through secure accounts and synchronised cloud storage. The current app supports an income plan, transactions, bills and savings goals. It currently stores its planner state in browser local storage; no AWS backend is connected.

## Agreed AWS services

| Service | Product responsibility |
| --- | --- |
| Amazon Cognito | Account identity and authentication |
| Amazon API Gateway | Authenticated planner-data API |
| AWS Lambda | Server-side validation and data access |
| Amazon DynamoDB | Per-user planner record |
| Amazon CloudWatch | Operational logs and troubleshooting |

DynamoDB uses a partition key derived only from the Cognito-authenticated subject, not a client-supplied user identifier. The table is configured for on-demand billing, encryption at rest and point-in-time recovery.

## Delivery phases

1. **Foundation (this change):** infrastructure-as-code, API handlers, data contract and deployment notes.
2. **Frontend integration:** authentication screens and session lifecycle, API client, loading/error states, provider abstraction and local-data migration.
3. **Staging validation:** deploy to a private staging environment, verify account isolation and recovery, validate CORS, test backups and data deletion, and confirm costs.
4. **Private release readiness:** update privacy policy and terms, verify accessibility and security, add monitoring and billing alarms, and run end-to-end tests.
5. **Public launch:** only after the backend is deployed, connected, tested and reviewed.

## AI is not part of the initial backend

Payday does not need Bedrock to deliver its current core value. Start with deterministic summaries and transparent budget calculations. Revisit AI-assisted spending explanations only after user needs are validated, data handling is documented, and the feature can be constrained to explaining information rather than making financial decisions.

## Activate application accuracy

Describe the infrastructure as planned until it is deployed. Do not claim that Payday currently uses AWS or incurs AWS inference costs. Credits may offset eligible services if the startup and application meet the applicable AWS Activate requirements; credits are not guaranteed.
