import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';

export interface LambdaResolversConstructProps {
  api: appsync.GraphqlApi;
  table: dynamodb.Table;
  lambdaCodePath: string;
}

export class LambdaResolversConstruct extends Construct {
  constructor(scope: Construct, id: string, props: LambdaResolversConstructProps) {
    super(scope, id);

    const { api, table, lambdaCodePath } = props;

    // AP-003: getCustomerByPhoneLambda using Lambda function
    // Lambda function for phone normalization and lookup
    const findCustomerByPhoneLambda = new lambda.Function(this, 'FindCustomerByPhoneLambda', {
      functionName: 'SystemApiFindCustomerByPhoneLambda',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      environment: {
        TABLE_NAME: table.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Grant Lambda read access to DynamoDB table
    table.grantReadData(findCustomerByPhoneLambda);

    // Lambda Data Source
    const lambdaDataSource = api.addLambdaDataSource('LambdaDataSource', findCustomerByPhoneLambda, {
      name: 'SystemApiLambdaDataSource',
    });

    // Resolver for getCustomerByPhoneLambda
    api.createResolver('LambdaGetCustomerByPhoneResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerByPhoneLambda',
      dataSource: lambdaDataSource,
    });
  }
}

