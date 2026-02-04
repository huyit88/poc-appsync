import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { AppSyncApiConstruct } from './constructs/appsync-api-construct';
import { DynamoDBConstruct } from './constructs/dynamodb-construct';
import { AuroraConstruct } from './constructs/aurora-construct';
import { DynamoDBResolversConstruct } from './constructs/dynamodb-resolvers-construct';
import { AuroraResolversConstruct } from './constructs/aurora-resolvers-construct';
import { LambdaResolversConstruct } from './constructs/lambda-resolvers-construct';

export class SystemApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const schemaPath = path.join(__dirname, '../../schema/schema.graphql');
    const dynamoResolversPath = path.join(__dirname, '../../domains/customers/api/resolvers');
    const auroraResolversPath = path.join(__dirname, '../../domains/customers/api/resolvers-aurora');
    const lambdaCodePath = path.join(__dirname, '../../lambda/findCustomerByPhone');

    // AppSync API
    const appSyncApi = new AppSyncApiConstruct(this, 'AppSyncApi', {
      apiName: 'SystemApi',
      schemaPath,
    });

    // DynamoDB Resources
    const dynamoDB = new DynamoDBConstruct(this, 'DynamoDB', {
      tableName: 'SystemApiTable',
      api: appSyncApi.api,
    });

    // Aurora Resources
    const aurora = new AuroraConstruct(this, 'Aurora', {
      api: appSyncApi.api,
      databaseName: 'systemapi',
      secretName: 'aurora-db-credentials',
      minCapacity: 0.5,
      maxCapacity: 4,
    });

    // DynamoDB Resolvers
    new DynamoDBResolversConstruct(this, 'DynamoDBResolvers', {
      api: appSyncApi.api,
      dataSource: dynamoDB.dataSource,
      resolversPath: dynamoResolversPath,
    });

    // Aurora Resolvers
    new AuroraResolversConstruct(this, 'AuroraResolvers', {
      api: appSyncApi.api,
      dataSource: aurora.dataSource,
      resolversPath: auroraResolversPath,
    });

    // Lambda Resolvers
    new LambdaResolversConstruct(this, 'LambdaResolvers', {
      api: appSyncApi.api,
      table: dynamoDB.table,
      lambdaCodePath,
    });

    // Outputs
    new cdk.CfnOutput(this, 'GraphQLEndpoint', {
      value: appSyncApi.api.graphqlUrl,
      description: 'AppSync GraphQL API Endpoint',
    });

    new cdk.CfnOutput(this, 'ApiKey', {
      value: appSyncApi.api.apiKey || 'N/A',
      description: 'AppSync API Key',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: appSyncApi.api.apiId,
      description: 'AppSync API ID',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: dynamoDB.table.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'AuroraClusterEndpoint', {
      value: aurora.cluster.clusterEndpoint.hostname,
      description: 'Aurora Cluster Endpoint',
    });

    new cdk.CfnOutput(this, 'RdsProxyEndpoint', {
      value: aurora.proxy.endpoint,
      description: 'RDS Proxy Endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: aurora.credentials.secretArn,
      description: 'Secrets Manager ARN for database credentials',
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: 'systemapi',
      description: 'Database name',
    });

    new cdk.CfnOutput(this, 'AuroraClusterArn', {
      value: aurora.cluster.clusterArn,
      description: 'Aurora Cluster ARN (for RDS Data API)',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}

