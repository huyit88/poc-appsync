import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface AppSyncApiConstructProps {
  apiName: string;
  schemaPath: string;
}

export class AppSyncApiConstruct extends Construct {
  public readonly api: appsync.GraphqlApi;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: AppSyncApiConstructProps) {
    super(scope, id);

    // AppSync API
    this.api = new appsync.GraphqlApi(this, 'Api', {
      name: props.apiName,
      definition: appsync.Definition.fromFile(props.schemaPath),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      xrayEnabled: true,
    });

    // CloudWatch Log Group for AppSync
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/appsync/apis/${this.api.apiId}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}

