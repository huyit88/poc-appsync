import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface AuroraConstructProps {
  api: appsync.GraphqlApi;
  databaseName: string;
  secretName: string;
  minCapacity?: number;
  maxCapacity?: number;
}

export class AuroraConstruct extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly proxy: rds.DatabaseProxy;
  public readonly dataSource: appsync.RdsDataSource;
  public readonly credentials: secretsmanager.Secret;
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: AuroraConstructProps) {
    super(scope, id);

    // VPC for Aurora
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2, // Use 2 AZs for Aurora Serverless v2
      natGateways: 0, // No NAT gateway needed for serverless (AppSync connects via RDS Proxy)
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'aurora-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Group for Aurora
    const auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Aurora cluster',
      allowAllOutbound: false,
    });

    // Security Group for RDS Proxy
    const proxySecurityGroup = new ec2.SecurityGroup(this, 'RdsProxySecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS Proxy',
      allowAllOutbound: true,
    });

    // Allow RDS Proxy to connect to Aurora
    auroraSecurityGroup.addIngressRule(
      proxySecurityGroup,
      ec2.Port.tcp(5432),
      'Allow RDS Proxy to connect to Aurora'
    );

    // Database credentials (stored in Secrets Manager)
    this.credentials = new secretsmanager.Secret(this, 'Credentials', {
      secretName: props.secretName,
      description: 'Credentials for Aurora PostgreSQL database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // Aurora Serverless v2 Cluster
    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_6,
      }),
      credentials: rds.Credentials.fromSecret(this.credentials),
      serverlessV2MinCapacity: props.minCapacity ?? 0.5,
      serverlessV2MaxCapacity: props.maxCapacity ?? 4,
      defaultDatabaseName: props.databaseName,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        enablePerformanceInsights: false,
      }),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [auroraSecurityGroup],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev; change to RETAIN for prod
      deletionProtection: false,
      cloudwatchLogsExports: ['postgresql'], // Enables CloudWatch logging automatically
    });

    // RDS Proxy for connection pooling
    this.proxy = this.cluster.addProxy('Proxy', {
      vpc: this.vpc,
      secrets: [this.credentials],
      securityGroups: [proxySecurityGroup],
      dbProxyName: 'aurora-systemapi-proxy',
      maxConnectionsPercent: 100,
      maxIdleConnectionsPercent: 50,
      borrowTimeout: cdk.Duration.seconds(120),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // RDS Data Source for AppSync
    this.dataSource = props.api.addRdsDataSource('RdsDataSource', this.cluster, this.credentials, props.databaseName);

    // Grant AppSync access to RDS Proxy
    this.proxy.grantConnect(this.dataSource.grantPrincipal, 'postgres');
  }
}

