import { dataClient, type Schema } from '@/lib/amplify'

/** Shape of an App record returned by the backend. */
export type AppItem = Schema['Apps']['type']

/** Input for creating a new App. */
export interface AppInput {
  name: string
  logo?: string
  description?: string
}

/** Input for updating an existing App. */
export type AppUpdate = Partial<AppInput> & { id: string }

/**
 * CRUD service for the `Apps` table. Every call is authenticated and
 * enforced server-side by the backend authorization rules.
 */

export async function listApps(): Promise<AppItem[]> {
  const { data, errors } = await dataClient.models.Apps.list()
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function getApp(id: string): Promise<AppItem | null> {
  const { data, errors } = await dataClient.models.Apps.get({ id })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function createApp(input: AppInput): Promise<AppItem | null> {
  const { data, errors } = await dataClient.models.Apps.create(input)
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function updateApp(input: AppUpdate): Promise<AppItem | null> {
  const { data, errors } = await dataClient.models.Apps.update(input)
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function deleteApp(id: string): Promise<void> {
  const { errors } = await dataClient.models.Apps.delete({ id })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
}