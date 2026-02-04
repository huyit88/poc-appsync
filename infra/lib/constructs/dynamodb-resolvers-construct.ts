import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as path from 'path';
import { Construct } from 'constructs';

export interface DynamoDBResolversConstructProps {
  api: appsync.GraphqlApi;
  dataSource: appsync.DynamoDbDataSource;
  resolversPath: string;
}

export class DynamoDBResolversConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DynamoDBResolversConstructProps) {
    super(scope, id);

    const { api, dataSource, resolversPath } = props;

    // AP-001: getCustomer resolver
    api.createResolver('DynamoDBGetCustomerResolver', {
      typeName: 'Query',
      fieldName: 'getCustomer',
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomer.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-005: getCustomerByEmail resolver (using GSI1)
    api.createResolver('DynamoDBGetCustomerByEmailResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerByEmail',
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerByEmail.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-002: getCustomerByPhone pipeline resolver
    // Step 1: Get Phone Lookup
    const getPhoneLookupFunction = new appsync.AppsyncFunction(this, 'DynamoDBGetPhoneLookupFunction', {
      name: 'SystemApiGetPhoneLookup',
      api,
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerByPhone-step1.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Step 2: Get Customer Profile
    const getCustomerProfileFunction = new appsync.AppsyncFunction(this, 'DynamoDBGetCustomerProfileFunction', {
      name: 'SystemApiGetCustomerProfile',
      api,
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerByPhone-step2.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Pipeline resolver for getCustomerByPhone
    api.createResolver('DynamoDBGetCustomerByPhoneResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerByPhone',
      pipelineConfig: [
        getPhoneLookupFunction,
        getCustomerProfileFunction,
      ],
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerByPhone-pipeline.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Claims resolvers
    const claimsResolversPath = path.join(__dirname, '../../../domains/claims/api/resolvers');
    
    // listClaimsByCustomer resolver
    api.createResolver('DynamoDBListClaimsByCustomerResolver', {
      typeName: 'Query',
      fieldName: 'listClaimsByCustomer',
      dataSource,
      code: appsync.Code.fromAsset(path.join(claimsResolversPath, 'listClaimsByCustomer.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-007: getCustomerWithClaims pipeline resolver
    // Step 1: Get Customer Profile
    const getCustomerForClaimsFunction = new appsync.AppsyncFunction(this, 'DynamoDBGetCustomerForClaimsFunction', {
      name: 'SystemApiGetCustomerForClaims',
      api,
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerWithClaims-step1.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Step 2: Get Claims
    const getClaimsForCustomerFunction = new appsync.AppsyncFunction(this, 'DynamoDBGetClaimsForCustomerFunction', {
      name: 'SystemApiGetClaimsForCustomer',
      api,
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerWithClaims-step2.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Pipeline resolver for getCustomerWithClaims
    api.createResolver('DynamoDBGetCustomerWithClaimsResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerWithClaims',
      pipelineConfig: [
        getCustomerForClaimsFunction,
        getClaimsForCustomerFunction,
      ],
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerWithClaims-pipeline.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-008: getClaimWithCustomer pipeline resolver
    // Step 1: Get Claim Profile
    const getClaimProfileFunction = new appsync.AppsyncFunction(this, 'DynamoDBGetClaimProfileFunction', {
      name: 'SystemApiGetClaimProfile',
      api,
      dataSource,
      code: appsync.Code.fromAsset(path.join(claimsResolversPath, 'getClaimWithCustomer-step1.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Step 2: Get Customer Profile
    const getCustomerForClaimFunction = new appsync.AppsyncFunction(this, 'DynamoDBGetCustomerForClaimFunction', {
      name: 'SystemApiGetCustomerForClaim',
      api,
      dataSource,
      code: appsync.Code.fromAsset(path.join(claimsResolversPath, 'getClaimWithCustomer-step2.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Pipeline resolver for getClaimWithCustomer
    api.createResolver('DynamoDBGetClaimWithCustomerResolver', {
      typeName: 'Query',
      fieldName: 'getClaimWithCustomer',
      pipelineConfig: [
        getClaimProfileFunction,
        getCustomerForClaimFunction,
      ],
      code: appsync.Code.fromAsset(path.join(claimsResolversPath, 'getClaimWithCustomer-pipeline.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });
  }
}

