#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { WebAppHostingStack } from '../lib/hosting-stack.js'
import { loadInfraConfig } from '../lib/config.js'

const config = loadInfraConfig()
const app = new cdk.App()

new WebAppHostingStack(app, 'MyContentStudioWebHosting', {
  env: {
    account: config.account,
    region: config.region,
  },
  domainName: config.domainName,
  certificateArn: config.certificateArn,
  description: 'S3 + CloudFront hosting for the mycontentstudio SPA',
})

app.synth()
