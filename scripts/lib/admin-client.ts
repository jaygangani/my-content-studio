/**
 * Shared helpers for maintenance scripts that write through the GraphQL API
 * as a Cognito admin user, using an amplify outputs file.
 *
 * Credentials: SEED_EMAIL and SEED_PASSWORD env vars, or you are prompted.
 * Outputs file: --outputs <file>, AMPLIFY_OUTPUTS, or ./amplify_outputs.json.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { Amplify } from 'aws-amplify'
import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

export type AdminClient = ReturnType<typeof generateClient<Schema>>

export function outputsPathFrom(argv: string[]): string {
  const index = argv.indexOf('--outputs')
  return resolve(
    process.cwd(),
    (index >= 0 ? argv[index + 1] : undefined) ??
      process.env.AMPLIFY_OUTPUTS ??
      'amplify_outputs.json',
  )
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolveAnswer) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    if (hidden) {
      const mutable = rl as unknown as {
        _writeToOutput: (text: string) => void
      }
      mutable._writeToOutput = () => undefined
      process.stdout.write(question)
    }
    rl.question(hidden ? '' : question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolveAnswer(answer.trim())
    })
  })
}

/** Configures Amplify from the outputs file, signs in as admin, returns a client. */
export async function connectAsAdmin(outputsPath: string): Promise<AdminClient> {
  let outputs: unknown
  try {
    outputs = JSON.parse(readFileSync(outputsPath, 'utf8'))
  } catch {
    throw new Error(
      `Could not read ${outputsPath}. Pass --outputs <file> or set AMPLIFY_OUTPUTS.`,
    )
  }
  Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0])
  console.log(`Outputs: ${outputsPath}`)

  const email = process.env.SEED_EMAIL || (await ask('Admin email: '))
  const password =
    process.env.SEED_PASSWORD || (await ask('Admin password: ', true))
  if (!email || !password) throw new Error('Email and password are required.')
  try {
    await signOut()
  } catch {
    // no active session
  }
  const result = await signIn({ username: email, password })
  if (!result.isSignedIn) {
    throw new Error(
      `Sign-in needs another step (${result.nextStep.signInStep}). Sign in once in the app to finish it, then run the script again.`,
    )
  }
  const session = await fetchAuthSession()
  const groups = session.tokens?.accessToken?.payload['cognito:groups']
  if (!Array.isArray(groups) || !groups.includes('admin')) {
    throw new Error(
      'This user is not in the Cognito "admin" group. Add it in the Cognito console and try again.',
    )
  }
  return generateClient<Schema>({ authMode: 'userPool' })
}

export async function disconnect(): Promise<void> {
  await signOut()
}

export function failure(errors: ReadonlyArray<{ message?: string }> | undefined) {
  return errors?.[0]?.message ?? 'Unknown error'
}
