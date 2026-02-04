import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';

export interface DynamoDBConstructProps {
  tableName: string;
  api: appsync.GraphqlApi;
}

export class DynamoDBConstruct extends Construct {
  public readonly table: dynamodb.Table;
  public readonly dataSource: appsync.DynamoDbDataSource;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    // DynamoDB Table
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: props.tableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev; change to RETAIN for prod
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false, // Enable for production
      },
    });

    // GSI1 for customer segment-based queries
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB Data Source
    this.dataSource = props.api.addDynamoDbDataSource('DynamoDataSource', this.table, {
      name: 'SystemApiDynamoDataSource',
    });

    // Grant table read permissions to the data source's service role
    this.table.grantReadData(this.dataSource.grantPrincipal);
  }
}

