import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const ContentStatus = a.enum([
  'DRAFT',
  'READY',
  'RENDERING',
  'SCHEDULED',
  'PUBLISHED',
  'FAILED',
]);

const ContentType = a.enum([
  'SHORT_FORM_VIDEO',
  'CAROUSEL',
  'MEME',
  'SINGLE_IMAGE',
  'TEXT_POST',
]);

const schema = a.schema({
  Apps: a
    .model({
      name: a.string().required(),
      logo: a.string(),
      description: a.string(),
      contents: a.hasMany('Content', 'appId'),
    })
    .authorization((allow) => [allow.authenticated()]),

  Content: a
    .model({
      status: ContentStatus,
      title: a.string().required(),
      postedOn: a.datetime(),
      angel: a.string(),
      appId: a.id().required(),
      app: a.belongsTo('Apps', 'appId'),
      relatabilityHook: a.string(),
      overlayText: a.json(),
      videoKeywords: a.string().array(),
      videoConfigurations: a.json(),
      audioConfig: a.json(),
      caption: a.string(),
      hashtags: a.string().array(),
      targetPersona: a.string(),
      type: ContentType,
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});