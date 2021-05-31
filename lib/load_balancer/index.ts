import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elb from "@aws-cdk/aws-elasticloadbalancing";
import * as autoscaling from "@aws-cdk/aws-autoscaling";


export class Loadbalancer extends cdk.Construct {

    public readonly vpcName: string;

    constructor(app: cdk.App, id: string, props?: any){
        super(app,id);

        const vpc = new ec2.Vpc(this, "vpc");

        const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: new ec2.AmazonLinuxImage(),
          });
      
          const lb = new elb.LoadBalancer(this, 'LB', {
            vpc,
            internetFacing: true,
            healthCheck: {
              port: 80
            },
          });
      
          lb.addTarget(asg);
          const listener = lb.addListener({ externalPort: 80 });
      
          listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
        this.vpcName = vpc.vpcId;
    }
}