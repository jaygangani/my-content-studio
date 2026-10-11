# Web app hosting (S3 + CloudFront)

One CDK stack, `MyContentStudioWebHosting`: private S3 bucket, CloudFront with
origin access control, and SPA error pages (403/404 return `/index.html`).
A custom domain is optional; without one you get the CloudFront domain.

## Prerequisites

- Node 20+
- AWS CLI configured (`export AWS_PROFILE=jaygangani`)
- CDK bootstrapped once for the account and region

```bash
npx cdk bootstrap aws://ACCOUNT/ap-south-1
```

## Deploy infra

From the repo root:

```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
npm run infra:install
npm run infra:diff
npm run infra:deploy
```

For a custom domain set `APP_DOMAIN` and `APP_CERTIFICATE_ARN` (ACM, us-east-1)
in `.env.deploy` or `infra/.env` first. Then create a CNAME or Route 53 alias to
the printed CloudFront domain.

`infra:deploy` writes `.env.deploy` from the stack outputs (`S3_BUCKET`,
`CLOUDFRONT_DISTRIBUTION_ID`, `APP_URL`).

## Deploy the backend (CLI only, no console or CI)

Same flow as MyCustomer `v2/backend`: an Amplify app and a `production` branch
are created with the AWS CLI, then `ampx pipeline-deploy` runs from your
terminal. The sandbox is untouched.

```bash
export AWS_PROFILE=jaygangani
npm run backend:bootstrap
npm run backend:deploy:prod
```

- `backend:bootstrap` creates the app and branch once and saves the id to
  `.amplify-app-id` (git-ignored).
- `backend:deploy:prod` asks for confirmation, deploys, and writes
  `outputs/production/amplify_outputs.json`.
- `backend:outputs:prod` regenerates that file without redeploying.

The production backend has its own Cognito pool, tables, bucket, Lambda and API.
Sandbox users and data do not carry over. The SSM parameters
(`/mycontentstudio/openai/api-key`, `/mycontentstudio/pexels/api-key`) are
shared and must exist in the same region.

## Deploy the app

`deploy:web` builds against the production outputs, then restores your local
(sandbox) `amplify_outputs.json`, so local development is not disturbed.

```bash
npm run deploy:web:dry
npm run deploy:web
```

Assets under `assets/` are cached for a year (immutable). `index.html`,
`sw.js` and `manifest.webmanifest` are uploaded last with
`max-age=0, must-revalidate`. The whole distribution is invalidated.

## Remove

```bash
npm run infra:destroy
```

The bucket has a RETAIN policy, so it is left in place and must be emptied and
deleted by hand.
