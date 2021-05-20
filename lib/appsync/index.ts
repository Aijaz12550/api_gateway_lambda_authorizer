import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";

export class appsync_api extends cdk.Construct {
    constructor(scope: cdk.App, id: string, props?: any){
        super(scope, id);

        const api = new appsync.GraphqlApi(this, "graph_api",{
            name: "produncts",
            schema: appsync.Schema.fromAsset("./schema/products.gql"),
            authorizationConfig: {
                defaultAuthorization:{
                    authorizationType: appsync.AuthorizationType.API_KEY,
                    apiKeyConfig:{
                        expires: cdk.Expiration.after(cdk.Duration.days(365)) as any,
                    }
                }
            }
        })
    }
}