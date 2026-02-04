import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as path from 'path';
import { Construct } from 'constructs';

export interface AuroraResolversConstructProps {
  api: appsync.GraphqlApi;
  dataSource: appsync.RdsDataSource;
  resolversPath: string;
}

export class AuroraResolversConstruct extends Construct {
  constructor(scope: Construct, id: string, props: AuroraResolversConstructProps) {
    super(scope, id);

    const { api, dataSource, resolversPath } = props;

    // AP-001: getCustomerAurora resolver
    api.createResolver('AuroraGetCustomerResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerAurora',
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomer.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-002: getCustomerByPhoneAurora resolver
    api.createResolver('AuroraGetCustomerByPhoneResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerByPhoneAurora',
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerByPhone.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-005: getCustomerByEmailAurora resolver
    api.createResolver('AuroraGetCustomerByEmailResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerByEmailAurora',
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerByEmail.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Claims resolvers
    const claimsResolversPath = path.join(__dirname, '../../../domains/claims/api/resolvers-aurora');
    
    // listClaimsByCustomerAurora resolver
    api.createResolver('AuroraListClaimsByCustomerResolver', {
      typeName: 'Query',
      fieldName: 'listClaimsByCustomerAurora',
      dataSource,
      code: appsync.Code.fromAsset(path.join(claimsResolversPath, 'listClaimsByCustomer.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-007: getCustomerWithClaimsAurora resolver (JOIN query)
    api.createResolver('AuroraGetCustomerWithClaimsResolver', {
      typeName: 'Query',
      fieldName: 'getCustomerWithClaimsAurora',
      dataSource,
      code: appsync.Code.fromAsset(path.join(resolversPath, 'getCustomerWithClaims.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // AP-008: getClaimWithCustomerAurora resolver (JOIN query)
    api.createResolver('AuroraGetClaimWithCustomerResolver', {
      typeName: 'Query',
      fieldName: 'getClaimWithCustomerAurora',
      dataSource,
      code: appsync.Code.fromAsset(path.join(claimsResolversPath, 'getClaimWithCustomer.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });
  }
}

