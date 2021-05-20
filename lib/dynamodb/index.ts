import * as cdk from "@aws-cdk/core"
import * as dynamodb from "@aws-cdk/aws-dynamodb";

export class dynamodb_stack extends cdk.Construct {

    public readonly tableName: string

    constructor(scope: cdk.App, id: string, props?:any){
        super(scope, id );

        let usersTable = new dynamodb.Table(this, "users_table",{
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING
            },
            tableName: "products",
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: cdk.RemovalPolicy.DESTROY //not recommended for production code.
        })

        this.tableName = usersTable.tableName;
    }
}