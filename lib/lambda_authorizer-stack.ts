import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
export class LambdaAuthorizerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'LambdaAuthorizerQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'LambdaAuthorizerTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));
    
    // lambda
    const helloWorld = new lambda.Function(this, "testing_func",{
      code: lambda.Code.fromAsset("src/lambda_functions/hello_world"),
      handler: "index.hello_world",
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: "testing_function"
    });

    const authorizerFunc = new lambda.Function(this, "authorizer_func",{
      code: lambda.Code.fromAsset("src/lambda_functions/lambda_authorizer"),
      handler: "index.authorizer",
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: "lambda_authorizer"
    })

    const authorizeFuncExecutionRole = new iam.Role(this, 'authorizeFuncExecution', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    authorizerFunc.grantInvoke(authorizeFuncExecutionRole);

    const api = new apigw.RestApi(this, "testing_api", {
      restApiName:"testing_api",
      
    })
    const auth = new apigw.CfnAuthorizer(this as any,"Authorizer",{
      type: "TOKEN",
      authorizerUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${authorizerFunc.functionArn}/invocations`,
      name: "authorizer",
      authorizerCredentials: authorizeFuncExecutionRole.roleArn,
      identitySource: 'method.request.header.Authorization',
      restApiId: api.restApiId
    })


   let item =  api.root.addResource("test");
   item.addMethod("get", new apigw.LambdaIntegration(helloWorld), {
     authorizationType: apigw.AuthorizationType.CUSTOM,
     authorizer: { authorizerId :auth.ref}
   });


  //  ***************************** COGNITO AUTHORIZER ********************************************

  // user pool with email sign in

  const userPool = new cognito.UserPool(this, "tciq_dev_user_pool",{
    signInAliases:{
      email: true
    },
    userPoolName: "TCIQ Development Pool"
  })
   



  }
}
