import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export type InfraConfig = {
  account: string
  region: string
  domainName?: string
  certificateArn?: string
}

const infraRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = join(infraRoot, '..')

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile(join(appRoot, '.env.deploy'))
loadEnvFile(join(infraRoot, '.env'))

export function loadInfraConfig(): InfraConfig {
  const account =
    process.env.CDK_DEFAULT_ACCOUNT ||
    process.env.AWS_ACCOUNT_ID ||
    process.env.AWS_ACCOUNT

  if (!account) {
    throw new Error(
      'Set CDK_DEFAULT_ACCOUNT. Tip: export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)',
    )
  }

  const domainName = process.env.APP_DOMAIN || undefined
  const certificateArn =
    process.env.APP_CERTIFICATE_ARN || process.env.CERTIFICATE_ARN || undefined

  if (domainName && !certificateArn) {
    throw new Error(
      'APP_DOMAIN needs APP_CERTIFICATE_ARN: an ACM certificate in us-east-1 covering the domain.',
    )
  }

  if (certificateArn && !certificateArn.includes(':acm:us-east-1:')) {
    throw new Error(
      `CloudFront certificate must be in us-east-1 (got ${certificateArn})`,
    )
  }

  return {
    account,
    region: process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'ap-south-1',
    domainName,
    certificateArn,
  }
}
