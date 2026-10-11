import * as cdk from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export type WebAppHostingStackProps = cdk.StackProps & {
  domainName?: string
  certificateArn?: string
}

/**
 * Private S3 origin + CloudFront for the Vite SPA (React Router).
 * SPA deep links: 403/404 → /index.html with 200.
 *
 * Bucket name is CloudFormation-generated so later updates never try to
 * rename or replace the bucket.
 */
export class WebAppHostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebAppHostingStackProps) {
    super(scope, id, props)

    const certificate =
      props.domainName && props.certificateArn
        ? acm.Certificate.fromCertificateArn(
            this,
            'Certificate',
            props.certificateArn,
          )
        : undefined

    const bucket = new s3.Bucket(this, 'AssetsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `mycontentstudio web app${props.domainName ? ` (${props.domainName})` : ''}`,
      defaultRootObject: 'index.html',
      domainNames: props.domainName ? [props.domainName] : undefined,
      certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(1),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(1),
        },
      ],
    })

    const appUrl = props.domainName
      ? `https://${props.domainName}`
      : `https://${distribution.distributionDomainName}`

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket for static assets (set as S3_BUCKET)',
    })
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID (set as CLOUDFRONT_DISTRIBUTION_ID)',
    })
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront domain (CNAME/ALIAS target for a custom domain)',
    })
    new cdk.CfnOutput(this, 'AppUrl', {
      value: appUrl,
      description: 'Public app URL',
    })
  }
}
