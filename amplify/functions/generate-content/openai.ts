import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { GeneratedPayload } from './schemas';

export interface OpenAiResult {
  payload: GeneratedPayload;
  promptTokens: number;
  completionTokens: number;
}

const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const price = PRICE_PER_MILLION[model];
  if (!price) return null;
  return (
    (promptTokens * price.input + completionTokens * price.output) / 1_000_000
  );
}

export async function loadOpenAiKey(): Promise<string> {
  const param = process.env.OPENAI_API_KEY_PARAM;
  if (!param) throw new Error('OPENAI_API_KEY_PARAM is not set on the function.');
  let value: string | undefined;
  try {
    const result = await new SSMClient({}).send(
      new GetParameterCommand({ Name: param, WithDecryption: true }),
    );
    value = result.Parameter?.Value;
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    throw new Error(
      `Cannot read SSM parameter ${param} (${name}). Create it as a SecureString in this region.`,
    );
  }
  if (!value) throw new Error(`SSM parameter ${param} is empty.`);
  return value;
}

export async function callOpenAi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  schema: Record<string, unknown>,
): Promise<OpenAiResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'content_piece', strict: true, schema },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${detail.slice(0, 400)}`,
    );
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');

  return {
    payload: JSON.parse(content) as GeneratedPayload,
    promptTokens: body.usage?.prompt_tokens ?? 0,
    completionTokens: body.usage?.completion_tokens ?? 0,
  };
}
