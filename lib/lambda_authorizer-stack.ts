import * as sns from "@aws-cdk/aws-sns";
import * as subs from "@aws-cdk/aws-sns-subscriptions";
import * as sqs from "@aws-cdk/aws-sqs";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as iam from "@aws-cdk/aws-iam";
import * as cognito from "@aws-cdk/aws-cognito";
import { dynamodb_stack } from "./dynamodb"
export class LambdaAuthorizerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // dynamo tables
    let dynamoTable = new dynamodb_stack(this as any,"table")

    const queue = new sqs.Queue(this, "LambdaAuthorizerQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const topic = new sns.Topic(this, "LambdaAuthorizerTopic");

    topic.addSubscription(new subs.SqsSubscription(queue));

    // lambda
    const helloWorld = new lambda.Function(this, "testing_func", {
      code: lambda.Code.fromAsset("src/lambda_functions/hello_world"),
      handler: "index.hello_world",
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: "testing_function",
    });

    const authorizerFunc = new lambda.Function(this, "authorizer_func", {
      code: lambda.Code.fromAsset("src/lambda_functions/lambda_authorizer"),
      handler: "index.authorizer",
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: "lambda_authorizer",
    });

    const authorizeFuncExecutionRole = new iam.Role(
      this,
      "authorizeFuncExecution",
      {
        assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      }
    );
    authorizerFunc.grantInvoke(authorizeFuncExecutionRole);

    const api = new apigw.RestApi(this, "testing_api", {
      restApiName: "testing_api",
    });
    const auth = new apigw.CfnAuthorizer(this as any, "Authorizer", {
      type: "TOKEN",
      authorizerUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${authorizerFunc.functionArn}/invocations`,
      name: "authorizer",
      authorizerCredentials: authorizeFuncExecutionRole.roleArn,
      identitySource: "method.request.header.Authorization",
      restApiId: api.restApiId,
    });

    let item = api.root.addResource("test");
    item.addMethod("get", new apigw.LambdaIntegration(helloWorld), {
      authorizationType: apigw.AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.ref },
    });

    //  ***************************** COGNITO AUTHORIZER ********************************************

    // user pool with email sign in

    const userPool = new cognito.UserPool(this, "tciq_dev_user_pool", {
      signInAliases: {
        email: true,
      },

      selfSignUpEnabled: true, // Allow users to signup,
      autoVerify: { email: true }, // email verification by using email verification
      userPoolName: "TCIQ Development Pool",

      // email verification 
      userVerification: {
        emailSubject: 'TCIQ Email verification',
        emailBody: "Hi {username}, Thanks to become a member of Travel Club IQ. Your verificaton code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE
      },

      standardAttributes:{

        email: {
          required: true,
          mutable: true
        },
        phoneNumber: {
          required: true,
          mutable: true
        },
        fullname:{
          required: true,
          mutable: true
        }
      },

      // lambda triggers ...
      lambdaTriggers:{
        preSignUp: helloWorld,
      },


    });

    // cognito authorizer
    const cognitoAuthorizer = new apigw.CfnAuthorizer(this as any, "cognito_authorizer",{
      restApiId: api.restApiId,
      type: apigw.AuthorizationType.COGNITO,
      name: "Cognito_Lambda_Authorizer",
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn]
    })

    let item2 = api.root.addResource("cognito");
    
    item2.addMethod("get",new apigw.LambdaIntegration(helloWorld),{
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: cognitoAuthorizer.ref
      }
    })

    let item3 = api.root.addResource("api_key");
    item3.addMethod("get", new apigw.LambdaIntegration(helloWorld),{
     apiKeyRequired:true,
    })

    const apiKeyName = "tciq_api_key";

    const apiKey = new apigw.ApiKey(this, "api_key",{
      apiKeyName,
      enabled: true,
      description: "TCIQ API Key to create usage plane"

    })

    api.addApiKey("tciq_api_key_added",{
      apiKeyName: "hello_world",
    })
  
    api.addUsagePlan("tciq_usage_plan",{
      name: "tciq_usage_plane",
      apiKey,
      apiStages: [{api: api, stage: api.deploymentStage}],
      throttle: { burstLimit: 500, rateLimit: 1000},
      quota: { limit: 1000, period: apigw.Period.MONTH}
    })


    // output
     new cdk.CfnOutput(this, "user_pool_id",{
      value: userPool.userPoolId
    }) 

    new cdk.CfnOutput(this, "cognito auth api",{
      value: item2.resourceId
    });

    new cdk.CfnOutput(this,"table_out",{
      value: dynamoTable.tableName
    })

    
  }
}
