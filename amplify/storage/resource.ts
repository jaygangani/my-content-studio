import { defineStorage } from '@aws-amplify/backend';

/**
 * Storage bucket. Currently scoped to `media/*` with authenticated-only
 * read/write/delete. Expand paths as the app grows.
 * @see https://docs.amplify.aws/gen2/build-a-backend/storage
 */
export const storage = defineStorage({
  name: 'mycontentstudioStorage',
  access: (allow) => ({
    'media/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
});