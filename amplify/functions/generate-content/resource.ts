import { defineFunction } from '@aws-amplify/backend';

/** SSM parameter name for the OpenAI API key (read at Lambda runtime). */
export const OPENAI_API_KEY_PARAM = '/mycontentstudio/openai/api-key';

export const generateContentFn = defineFunction({
  name: 'generate-content',
  entry: './handler.ts',
  timeoutSeconds: 60,
  environment: {
    OPENAI_API_KEY_PARAM,
    OPENAI_MODEL: 'gpt-4o-mini',
  },
});
