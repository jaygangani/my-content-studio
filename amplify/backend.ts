import { defineBackend } from '@aws-amplify/backend';
import { Aws } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import {
  OPENAI_API_KEY_PARAM,
  generateContentFn,
} from './functions/generate-content/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  generateContentFn,
});

backend.generateContentFn.resources.lambda.grantPrincipal.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['ssm:GetParameter'],
    resources: [
      `arn:aws:ssm:*:${Aws.ACCOUNT_ID}:parameter${OPENAI_API_KEY_PARAM}`,
    ],
  }),
);

const userPool = backend.auth.resources.userPool;
const userPoolClient = backend.auth.resources.userPoolClient;

const cognitoAuthorizer = new HttpJwtAuthorizer(
  'GenerateContentJwtAuthorizer',
  `https://cognito-idp.${Aws.REGION}.amazonaws.com/${userPool.userPoolId}`,
  {
    jwtAudience: [userPoolClient.userPoolClientId],
  },
);

const stack = backend.createStack('GenerateContentStack');

const httpApi = new HttpApi(stack, 'GenerateContentApi', {
  apiName: 'mycontentstudio-generate-content',
  corsPreflight: {
    allowOrigins: ['*'],
    allowMethods: [CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: undefined,
  },
});

const integration = new HttpLambdaIntegration(
  'GenerateContentIntegration',
  backend.generateContentFn.resources.lambda,
);

httpApi.addRoutes({
  path: '/content/generate',
  methods: [HttpMethod.POST],
  integration,
  authorizer: cognitoAuthorizer,
});

backend.addOutput({
  custom: {
    GENERATE_CONTENT_API_URL: httpApi.apiEndpoint,
  },
});
