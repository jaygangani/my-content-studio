---
name: amplify-data
description: Use when working with backend data, auth, or storage — "add a field to Apps", "add a new model/table", "upload a file", "read/write records", "generateClient", "why is the API failing", "amplify_outputs". Covers Amplify Gen2 schema in amplify/, the typed dataClient, and the services/ layer. Never deploys.
---

# Amplify Gen2 data + storage

Backend is defined in `amplify/` and configured for the frontend in
`src/lib/amplify.ts`. **All backend access goes through `src/services/`** —
components never touch `dataClient` or S3 directly.

## Where things live

- `amplify/data/resource.ts` — models (currently the `Apps` model:
  `name` required, `logo`, `description`; `.authorization(allow => [allow.authenticated()])`).
- `amplify/auth/resource.ts` — Cognito, email login.
- `amplify/storage/resource.ts` — `media/*`, authenticated read/write/delete.
- `amplify/backend.ts` — wires the three together.
- `src/lib/amplify.ts` — `Amplify.configure(amplify_outputs.json)`, exports
  `dataClient` and the `Schema` type.
- `src/services/apps.ts` — typed CRUD (`listApps`, `createApp`, `updateApp`,
  `deleteApp`); `AppItem = Schema['Apps']['type']`.
- `src/services/storage.ts` — `uploadLogo` → key `media/logos/<ts>-<name>`,
  `getLogoUrl` (signed URL), `deleteLogo`.

## Adding a field to an existing model

1. Edit the model in `amplify/data/resource.ts`.
2. Update the service mapping/types in `src/services/` if the surface changes.
3. Run `npm run build` to confirm the frontend still typechecks. Note: the
   generated types only change after a deploy/sandbox refresh of
   `amplify_outputs.json`.

## Adding a new model

1. Add it in `amplify/data/resource.ts` with an explicit `.authorization(...)`.
2. Create `src/services/<model>.ts` following `apps.ts`: return `null` on
   mutation errors, throw/surface list errors, and type items as
   `Schema['<Model>']['type']`.
3. Consume the service from a page/hook — never import `dataClient` in a
   component.

## Hard rules

- **Never deploy.** Do not run `npx ampx sandbox`, `npx ampx deploy`, or any
  command that mutates AWS. Local edits under `amplify/` are fine. If a change
  needs a deploy, say so and stop.
- `amplify_outputs.json` is generated and contains live identifiers — never
  print, log, or commit its contents.
- Storage keys are stored in Dynamo (e.g. `Apps.logo`), not full URLs;
  resolve them to signed URLs with `getLogoUrl`/`AppLogo`.
- AWS profile, if the user requests a cloud action: `export AWS_PROFILE=jaygangani`.
