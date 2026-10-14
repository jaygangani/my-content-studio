import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateContentFn } from '../functions/generate-content/resource';

const ContentStatus = a.enum(['DRAFT', 'APPROVED', 'DISCARDED']);

const ContentType = a.enum([
  'SHORT_FORM_VIDEO',
  'CAROUSEL',
  'MEME',
  'SINGLE_IMAGE',
  'TEXT_POST',
]);

const IgFormat = a.enum(['REEL', 'CAROUSEL', 'IMAGE', 'STORY']);

const Pillar = a.enum(['PAIN', 'HOW_TO', 'RESULT', 'MYTH', 'IDENTITY']);

const AssetType = a.enum(['VIDEO', 'IMAGE']);

const GenerationOutcome = a.enum(['OK', 'SKIPPED', 'FAILED']);

const schema = a.schema({
  Apps: a
    .model({
      owner: a.string(),
      name: a.string().required(),
      logo: a.string(),
      description: a.string(),
      context: a.string(),
      contents: a.hasMany('Content', 'appId'),
      profile: a.hasOne('AppProfile', 'appId'),
    })
    .authorization((allow) => [allow.ownerDefinedIn('owner')]),

  AppProfile: a
    .model({
      owner: a.string(),
      appId: a.id().required(),
      app: a.belongsTo('Apps', 'appId'),
      personas: a.json(),
      features: a.json(),
      voice: a.json(),
      proof: a.json(),
      competitors: a.json(),
      brand: a.json(),
      storeUrl: a.string(),
      ctaText: a.string(),
      memeConfig: a.json(),
      viralConfig: a.json(),
      reelConfig: a.json(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('owner')]),

  FormatDef: a
    .model({
      formatId: a.integer().required(),
      name: a.string().required(),
      groupName: a.string(),
      igFormat: IgFormat,
      igFormatLabel: a.string(),
      repostAs: a.string(),
      kind: a.string().required(),
      isMeme: a.boolean(),
      enabled: a.boolean().required(),
      structure: a.string(),
      visual: a.string(),
      cta: a.string(),
      shareTrigger: a.string(),
      promptTemplate: a.string(),
      extraRules: a.string(),
      sharpen: a.string(),
      hooks: a.string().array(),
      requiredInputs: a.string().array(),
      layout: a.string(),
      variant: a.string(),
      lineCount: a.integer(),
      slideMin: a.integer(),
      slideMax: a.integer(),
      stockPolicy: a.string(),
      sortOrder: a.integer(),
      contentType: a.string(),
      subtype: a.string(),
      assetCategory: a.string(),
      assetIds: a.string().array(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']),
    ]),

  PromptSnippet: a
    .model({
      key: a.string().required(),
      label: a.string(),
      description: a.string(),
      value: a.string().required(),
      enabled: a.boolean().required(),
      required: a.boolean(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']),
    ]),

  StockAsset: a
    .model({
      category: a.string().required(),
      title: a.string().required(),
      keywords: a.string().array(),
      assetKey: a.string().required(),
      mediaType: AssetType,
      durationSeconds: a.float(),
      keyColor: a.string(),
      enabled: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']),
    ]),

  ViralVideo: a
    .model({
      title: a.string().required(),
      keywords: a.string().array(),
      videoKey: a.string().required(),
      durationSeconds: a.float(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']),
    ]),

  GreenScreenVideo: a
    .model({
      title: a.string().required(),
      keywords: a.string().array(),
      videoKey: a.string().required(),
      keyColor: a.string().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']),
    ]),

  Content: a
    .model({
      owner: a.string(),
      status: ContentStatus,
      title: a.string().required(),
      appId: a.id().required(),
      app: a.belongsTo('Apps', 'appId'),
      type: ContentType,
      formatId: a.integer(),
      igFormat: IgFormat,
      personaId: a.string(),
      featureId: a.string(),
      pillar: Pillar,
      scriptJson: a.json(),
      caption: a.string(),
      hashtags: a.string().array(),
      regenCount: a.integer(),
      approvedAt: a.datetime(),
      assets: a.hasMany('Asset', 'pieceId'),
      postedOn: a.datetime(),
      angel: a.string(),
      relatabilityHook: a.string(),
      overlayText: a.json(),
      videoKeywords: a.string().array(),
      videoConfigurations: a.json(),
      audioConfig: a.json(),
      targetPersona: a.string(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('owner')]),

  Asset: a
    .model({
      owner: a.string(),
      pieceId: a.id().required(),
      piece: a.belongsTo('Content', 'pieceId'),
      source: a.string().required(),
      sourceUrl: a.string(),
      licence: a.string(),
      type: AssetType,
      beatIndex: a.integer(),
      url: a.string().required(),
      previewUrl: a.string(),
      query: a.string(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('owner')]),

  GenerationLog: a
    .model({
      owner: a.string(),
      appId: a.id().required(),
      pieceId: a.id(),
      formatId: a.integer(),
      model: a.string(),
      tokens: a.integer(),
      cost: a.float(),
      durationMs: a.integer(),
      outcome: GenerationOutcome,
      error: a.string(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('owner')]),

  DailyUsage: a
    .model({
      owner: a.string(),
      appId: a.id().required(),
      date: a.string().required(),
      count: a.integer().required(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('owner')]),
})
.authorization((allow) => [allow.resource(generateContentFn)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
