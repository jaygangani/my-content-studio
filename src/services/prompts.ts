import { dataClient, type Schema } from '@/lib/amplify'

export type PromptSnippet = Schema['PromptSnippet']['type']

export async function listPrompts(): Promise<PromptSnippet[]> {
  const rows: PromptSnippet[] = []
  let nextToken: string | null | undefined
  do {
    const page = await dataClient.models.PromptSnippet.list({
      limit: 500,
      nextToken,
    })
    if (page.errors?.length) throw new Error(page.errors[0].message)
    rows.push(...page.data)
    nextToken = page.nextToken
  } while (nextToken)
  return rows.sort((a, b) => a.key.localeCompare(b.key))
}

export async function savePrompt(
  id: string,
  patch: { value?: string; enabled?: boolean },
): Promise<PromptSnippet> {
  const { data, errors } = await dataClient.models.PromptSnippet.update({
    id,
    ...patch,
  })
  if (errors?.length || !data) {
    throw new Error(errors?.[0]?.message ?? 'Prompt was not saved.')
  }
  return data
}
