# Payday AWS backend foundation

This directory contains the infrastructure definition and Lambda handlers for Payday's future AWS-backed data layer. It is scaffolding only: it has not been deployed, and the frontend still uses browser storage.

## Architecture

- **Amazon Cognito User Pool** — email-based account sign-in and recovery.
- **Amazon API Gateway** — exposes authenticated `GET /me/data` and `PUT /me/data` routes.
- **AWS Lambda (Node.js 22)** — validates planner payloads and performs data operations.
- **Amazon DynamoDB** — stores one versioned planner record per authenticated user, with encryption at rest and point-in-time recovery enabled.
- **Amazon CloudWatch** — receives Lambda logs for operational troubleshooting.

The API obtains the user's Cognito `sub` from the validated authorizer claims. It does not accept a user ID from the browser. DynamoDB's partition key is that authenticated identity, which keeps each user's record isolated.

## Data contract

The API returns:

```json
{
  "data": {
    "plan": {},
    "transactions": [],
    "bills": [],
    "goals": []
  },
  "version": 1,
  "updatedAt": "2026-01-01T12:00:00.000Z"
}
```

For a new account, `data` is `null`, `version` is `0`, and `updatedAt` is `null`. The frontend should apply its own initial planner defaults when it receives a new-account response.

To save, send `PUT /me/data` with a JSON body shaped as `{ "data": { "plan": {}, "transactions": [], "bills": [], "goals": [] } }`. The handler validates the top-level structure. Detailed field validation and optimistic concurrency controls should be added before public launch.

## Deploy later, when ready

Prerequisites: an AWS account with appropriate permissions, AWS SAM CLI, Docker for local builds, and Node.js 22. AWS credits are not required to write or review this code, but deployment creates billable AWS resources. Do not deploy until billing alerts/budgets and the intended region are set.

From this directory:

```bash
npm install
sam validate --lint --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --template-file .aws-sam/build/template.yaml
```

During guided deployment, use a unique stack name and provide the exact frontend origin through `AllowedOrigin`. The template's default origin is for local development only. Never use a wildcard origin for the production deployment.

After deployment, configure the frontend with the API base URL, Cognito user-pool ID, Cognito web-client ID, and AWS region. The web-client ID is public configuration, not a secret. Do not put AWS access keys or other server credentials in frontend environment variables.

## Frontend integration still required

The current frontend uses `localStorage` under `payday-data-v1`. Keep the app private/unlaunched until all of these are implemented and tested:

1. Cognito sign-up, sign-in, sign-out, token refresh and account recovery.
2. An authenticated API client that sends the Cognito access token.
3. A data-provider abstraction with explicit loading, save, error and offline states.
4. A one-time, user-consented migration from existing local data to the signed-in account.
5. Cross-account access tests, data deletion, privacy/terms updates, production-origin CORS, monitoring and budget alerts.
6. Build, security and end-to-end tests against a deployed staging stack.

The API is not a bank integration and does not connect to bank accounts. It stores the planning data entered into Payday. Do not describe this backend as live or claim AWS usage until it has actually been deployed and connected.
