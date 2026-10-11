#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const assetsDir = join(dist, 'assets')

if (process.argv.includes('--help')) {
  console.log(`Build the SPA, upload dist/ to S3, invalidate CloudFront.

Env (or .env.deploy, written by npm run infra:deploy):
  S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID   required
  AWS_REGION (default ap-south-1), S3_PREFIX, APP_URL
  AMPLIFY_OUTPUTS                         production outputs file (default outputs/main/amplify_outputs.json)
  SKIP_BUILD=1, DRY_RUN=1, YES=1 (skip the prompt)

Usage:
  npm run deploy:web
  npm run deploy:web:dry`)
  process.exit(0)
}

loadEnvFile(join(root, '.env.deploy'))

const bucket = required('S3_BUCKET')
const distributionId = required('CLOUDFRONT_DISTRIBUTION_ID')
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1'
const prefix = (process.env.S3_PREFIX || '').replace(/^\/+|\/+$/g, '')
const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
const dryRun = truthy(process.env.DRY_RUN)
const skipBuild = truthy(process.env.SKIP_BUILD)
const assumeYes = truthy(process.env.YES)
const prodOutputs = process.env.AMPLIFY_OUTPUTS
  ? join(root, process.env.AMPLIFY_OUTPUTS)
  : join(root, 'outputs', 'main', 'amplify_outputs.json')
const rootOutputs = join(root, 'amplify_outputs.json')
const backupOutputs = join(root, '.amplify_outputs.local.bak')

const s3Root = prefix ? `s3://${bucket}/${prefix}` : `s3://${bucket}`

function loadEnvFile(path) {
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

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. Set it in the environment or .env.deploy`)
    console.error('See .env.deploy.example')
    process.exit(1)
  }
  return value
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}

function run(cmd, args, { mutate = false } = {}) {
  const pretty = [cmd, ...args].join(' ')
  if (dryRun && mutate) {
    console.log(`[dry-run] ${pretty}`)
    return
  }
  console.log(`→ ${pretty}`)
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, AWS_REGION: region, AWS_DEFAULT_REGION: region },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!existsSync(prodOutputs)) {
  console.error(`Production outputs not found: ${prodOutputs}`)
  console.error('Deploy the backend first: npm run backend:deploy:prod (or npm run backend:outputs:prod)')
  process.exit(1)
}

console.log(`Deploy target: ${s3Root}/`)
console.log(`CloudFront:    ${distributionId}`)
console.log(`Region:        ${region}`)
console.log(`AWS profile:   ${process.env.AWS_PROFILE || '(default credentials)'}`)
if (appUrl) console.log(`App URL:       ${appUrl}`)
if (dryRun) console.log('Mode:          DRY RUN')
console.log('\nThis will:')
console.log(`  - build against ${prodOutputs.replace(`${root}`, '.')} (your local amplify_outputs.json is restored afterwards)`)
if (!skipBuild) console.log('  - run npm run build')
console.log(`  - sync dist/ to ${s3Root}/ (deletes files no longer in dist/)`)
console.log('  - set cache headers and invalidate /* on the distribution')

if (!assumeYes && !dryRun) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question('\nContinue? (y/N) ')).trim().toLowerCase()
  rl.close()
  if (answer !== 'y' && answer !== 'yes') {
    console.log('Cancelled.')
    process.exit(0)
  }
}

let swapped = false
function restoreOutputs() {
  if (!swapped) return
  if (existsSync(backupOutputs)) {
    copyFileSync(backupOutputs, rootOutputs)
    rmSync(backupOutputs)
  } else {
    rmSync(rootOutputs, { force: true })
  }
  swapped = false
}
process.on('exit', restoreOutputs)
process.on('SIGINT', () => process.exit(130))

if (!skipBuild) {
  console.log('\n1) Using production Amplify outputs…')
  if (existsSync(rootOutputs)) copyFileSync(rootOutputs, backupOutputs)
  copyFileSync(prodOutputs, rootOutputs)
  swapped = true
}

if (!skipBuild) {
  console.log('\n2) Building…')
  run('npm', ['run', 'build'])
} else {
  console.log('\n1) Skipping output swap and build (SKIP_BUILD=1)')
}

restoreOutputs()

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run npm run build first.')
  process.exit(1)
}

console.log('\n3) Syncing hashed assets → S3 (immutable)…')
run(
  'aws',
  [
    's3', 'sync', `${assetsDir}/`, `${s3Root}/assets/`,
    '--delete',
    '--cache-control', 'public, max-age=31536000, immutable',
    '--region', region,
  ],
  { mutate: true },
)

console.log('\n4) Syncing remaining files → S3…')
run(
  'aws',
  [
    's3', 'sync', `${dist}/`, `${s3Root}/`,
    '--delete',
    '--exclude', 'assets/*',
    '--exclude', 'index.html',
    '--exclude', 'sw.js',
    '--exclude', 'manifest.webmanifest',
    '--cache-control', 'public, max-age=3600',
    '--region', region,
  ],
  { mutate: true },
)

console.log('\n5) Uploading entry files with no-cache (last)…')
const entries = [
  ['sw.js', 'application/javascript'],
  ['manifest.webmanifest', 'application/manifest+json'],
  ['index.html', 'text/html; charset=utf-8'],
]
for (const [file, contentType] of entries) {
  if (!existsSync(join(dist, file))) {
    console.log(`  skipping ${file}: not in dist/`)
    continue
  }
  run(
    'aws',
    [
      's3', 'cp', join(dist, file), `${s3Root}/${file}`,
      '--content-type', contentType,
      '--cache-control', 'public, max-age=0, must-revalidate',
      '--metadata-directive', 'REPLACE',
      '--region', region,
    ],
    { mutate: true },
  )
}

console.log('\n6) Invalidating CloudFront cache…')
run(
  'aws',
  ['cloudfront', 'create-invalidation', '--distribution-id', distributionId, '--paths', '/*'],
  { mutate: true },
)

console.log(`\n✓ Deploy complete${appUrl ? ` → ${appUrl}/` : ''}`)
console.log('  Invalidation usually finishes in 1–5 minutes.')
