"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
 
const gcp = require("@pulumi/gcp");
 
// const AWS = require("aws-sdk");
const { RDSClient, DescribeDBInstancesCommand } = require("@aws-sdk/client-rds");
const { EC2Client } = require("@aws-sdk/client-ec2");

const awsRoute53 = require("@pulumi/aws/route53");
 
  
 
// const rds = new AWS.RDS({ region: "us-west-1" });
const rdsClient = new RDSClient({ region: "us-west-1" });
const fs = require("fs");
const yaml = require("js-yaml");

const configFile = fs.readFileSync("Pulumi.demo.yaml", "utf8");

const config = yaml.load(configFile);

const awsRegion = config.config["aws:region"];
const vpcCidr = config.config.VPC_CIDR;
const hostedZoneId=config.config.hostedZoneId 
const publicCidr = config.config.PUBLIC_CIDR;
 
const vpcName = config.config.VPC_NAME;
const gwName = config.config.GW_NAME;
const customAmiId = config.config.CUSTOM_AMI_ID;  
const db_username=config.config.DB_USERNAME
const db_password=config.config.DB_PASSWORD
const domainName=config.config.domain_name

const MAILGUN_API_KEY=config.config.mailgunApiKey
const MAILGUN_DOMAIN=config.config.mailgunDomain
 
const MAILGUN_FROM=config.config.mailgunFrom
const Ec2Key=config.config.Ec2Key
 

const googleproject=config.config.googleproject
const ServiceAcountId=config.config.ServiceAcountId
const gcplocation=config.config.gcplocation
const bucketName=config.config.bucketName
 
aws.getAvailabilityZones({ state: "available", region: awsRegion }).then((availableZones) => {
    const availabilityZones = availableZones.names.slice(0, 3);  

 
    const myvpc = new aws.ec2.Vpc(vpcName, {
        cidrBlock: vpcCidr,
        instanceTenancy: "default",
        enableDnsSupport: true,
        enableDnsHostnames: true,
        tags: {
            Name: vpcName,
        },
    });
 


    const gw = new aws.ec2.InternetGateway("gw", {
        vpcId: myvpc.id,
 
 
        tags: {
            Name: gwName,
        },
    });

    const publicSubnetIds = [];
    const privateSubnetIds = [];

    const publicRouteTable = new aws.ec2.RouteTable("publicRouteTable", {
        vpcId: myvpc.id,
        tags: {
            Name: "Public Route Table",
        },
    });
 
 


    const privateRouteTable = new aws.ec2.RouteTable("privateRouteTable", {
        vpcId: myvpc.id,
 
 
        tags: {
            Name: "Private Route Table",
        },
    });


    for (let i = 0; i < availabilityZones.length; i++) {
        const subnetName = `publicSubnet${i + 1}`;
        const t = i + 1;
        const publicSubnetCIDR = `${vpcCidr.split('.')[0]}.${vpcCidr.split('.')[1]}.${t}.0/24`;

        const subnet = new aws.ec2.Subnet(subnetName, {
            vpcId: myvpc.id,
            cidrBlock: publicSubnetCIDR,
            availabilityZone: availabilityZones[i],
            mapPublicIpOnLaunch: true,
            tags: {
                Name: subnetName,
            },
        });

        publicSubnetIds.push(subnet.id);

        new aws.ec2.RouteTableAssociation(`${subnetName}Association`, {
            subnetId: subnet.id,
            routeTableId: publicRouteTable.id,
        });
    }


    for (let i = 0; i < availabilityZones.length; i++) {
        const subnetName = `privateSubnet${i + 1}`;
        const t = availabilityZones.length + i + 1;
        const privateSubnetCIDR = `${vpcCidr.split('.')[0]}.${vpcCidr.split('.')[1]}.${t}.0/24`;

        const subnet = new aws.ec2.Subnet(subnetName, {
            vpcId: myvpc.id,
            cidrBlock: privateSubnetCIDR,
            availabilityZone: availabilityZones[i],
            tags: {
                Name: subnetName,
            },
        });

        privateSubnetIds.push(subnet.id);


        new aws.ec2.RouteTableAssociation(`${subnetName}Association`, {
            subnetId: subnet.id,
            routeTableId: privateRouteTable.id,
        });
    }

    const publicRoute = new aws.ec2.Route("publicRoute", {
        routeTableId: publicRouteTable.id,
        destinationCidrBlock: publicCidr,
        gatewayId: gw.id,
    });
//create web application security group
    const applicationSecurityGroup = new aws.ec2.SecurityGroup("applicationSecurityGroup", {
        vpcId: myvpc.id,
        description: "Security group for web applications",
        
    });
        
//create database security group
const databaseSecurityGroup = new aws.ec2.SecurityGroup("databaseSecurityGroup", {
    vpcId: myvpc.id,
    description: "Security group for RDS Instance",
});
    //create load balancer security group
    const loadBalancerSecurityGroup = new aws.ec2.SecurityGroup("loadBalancerSecurityGroup", {
        vpcId: myvpc.id,
        description: "Security group for Load Balancer",
  
 
    });

    //LOAD BALANCER SG RULES
    //attach egress rule for load balancer security group  with source as application security group
    // new aws.ec2.SecurityGroupRule("lb-egress-all-traffic", {
    //     type: "egress",
    //     fromPort: 0,    
    //     toPort: 0,     
    //     protocol: "-1",  
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: loadBalancerSecurityGroup.id,  

    // });

    //attach egress rule for loadbalancer security group for port 8080 with source as application security group
    new aws.ec2.SecurityGroupRule("lb-egress-app-port", {
        type: "egress",
        fromPort: 8080,
        toPort: 8080,
        protocol: "tcp",
        // cidrBlocks: ["0.0.0.0/0"], 
        sourceSecurityGroupId: applicationSecurityGroup.id,   
        securityGroupId: loadBalancerSecurityGroup.id,
    });
 //attach ingress 80 rule for load balancer security group
    // new aws.ec2.SecurityGroupRule("lb-ingress-80", {
    //     type: "ingress",
    //     fromPort: 80,
    //     toPort: 80,
    //     protocol: "tcp",
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: loadBalancerSecurityGroup.id,
    // });
 
    //attach ingress 443 rule for loadbalancer security group
    new aws.ec2.SecurityGroupRule("lb-ingress-443", {
        type: "ingress",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],  
        securityGroupId: loadBalancerSecurityGroup.id,
    });


 //APPLICATION SECURITY GROUP RULES
  //attach Inbound rule for application security group to allow traffic on port 22
    new aws.ec2.SecurityGroupRule("as-ingress-22", {
        type: "ingress",
        fromPort: 22,
        toPort: 22,
        protocol: "tcp",
         cidrBlocks: ["0.0.0.0/0"],  
        // sourceSecurityGroupId: loadBalancerSecurityGroup.id,  
        securityGroupId: applicationSecurityGroup.id,
    });
     //Inbound rule for application sg  port 8080 
    new aws.ec2.SecurityGroupRule("as-ingress-port", {
        type: "ingress",
        fromPort: 8080,
        toPort: 8080,
        protocol: "tcp",
        // cidrBlocks: ["0.0.0.0/0"], 
        sourceSecurityGroupId: loadBalancerSecurityGroup.id,   
        securityGroupId: applicationSecurityGroup.id,
    });

    

    //attach outbound rule for database sgto allow connection to rds with source as database security group
    new aws.ec2.SecurityGroupRule("as-egress-to-rds", {
        type: "egress",
        fromPort: 0,
        toPort: 3306,    
        protocol: "tcp",
        sourceSecurityGroupId:  databaseSecurityGroup.id,
        securityGroupId: applicationSecurityGroup.id,
    });
 
 
    // new aws.ec2.SecurityGroupRule("egress-rule", {
    //     type: "egress",
    //     fromPort: 0,    
    //     toPort: 0,     
    //     protocol: "-1",  
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: applicationSecurityGroup.id,  
    // });
    
    
//create security group for rds instance
    // const databaseSecurityGroup = new aws.ec2.SecurityGroup("databaseSecurityGroup", {
    //     vpcId: myvpc.id,
    //     description: "Security group for RDS Instance",
    // });
//attach ingree rule to the group for db
    // new aws.ec2.SecurityGroupRule("allow-db", {
    //     type: "ingress",
    //     fromPort: 3306,
    //     toPort: 3306,
    //     protocol: "tcp",
    //     sourceSecurityGroupId: applicationSecurityGroup.id,  
    //     securityGroupId: databaseSecurityGroup.id,
 
    // });
 
 

new aws.ec2.SecurityGroupRule("allow-https", {
        type: "egress",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],  
        securityGroupId: applicationSecurityGroup.id,
    });
    // new aws.ec2.SecurityGroupRule("allow-http", {
    //     type: "egress",
    //     fromPort: 80,
    //     toPort: 80,
    //     protocol: "tcp",
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: applicationSecurityGroup.id,
    // });


    //DATABASE SECURITY GROUP RULES

    //attach ingree rule to the group for db
    new aws.ec2.SecurityGroupRule("db-ingress", {
        type: "ingress",
        fromPort: 3306,
        toPort: 3306,
        protocol: "tcp",
        sourceSecurityGroupId: applicationSecurityGroup.id,  
        securityGroupId: databaseSecurityGroup.id,
    });
    
    // new aws.ec2.SecurityGroupRule("allow-http", {
    //     type: "ingress",
    //     fromPort: 80,
    //     toPort: 80,
    //     protocol: "tcp",
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: applicationSecurityGroup.id,
    // });
     
    // new aws.ec2.SecurityGroupRule("allow-https", {
    //     type: "ingress",
    //     fromPort: 443,
    //     toPort: 443,
    //     protocol: "tcp",
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: applicationSecurityGroup.id,
    // });
    
   
    // new aws.ec2.SecurityGroupRule("egress-rule", {
    //     type: "egress",
    //     fromPort: 0,    
    //     toPort: 0,     
    //     protocol: "-1",  
    //     cidrBlocks: ["0.0.0.0/0"],  
    //     securityGroupId: applicationSecurityGroup.id,  
    // });
    


 

 
    //create parameter group
    const rdsParameterGroup = new aws.rds.ParameterGroup("rds-parameter-group", {
        family: "mariadb10.6",  
        description: "MariaDB Parameter Group",
        parameters: [
            {
                name: "time_zone",
                value: "UTC",
            },
            // {
            //     name: "innodb_buffer_pool_size",
            //     value: "2147483648", // Example value, adjust as needed
            // },
            
        ],
    });


    const RdsSubnetGroup = new aws.rds.SubnetGroup("Rds-subnet-group", {
        name: "rds-subnet-group",
        subnetIds: [privateSubnetIds[0], privateSubnetIds[1]],  
        description: "My RDS Subnet Group1",
    });
    
    const rdsInstance = new aws.rds.Instance("my-rds-instance", {
        allocatedStorage: 20,
        storageType: "gp2",
        engine: "MariaDB",
        engineVersion: "10.6.14",  
        instanceClass: "db.t2.micro",  
        username: db_username,
        password: db_password,


        dbSubnetGroupName: RdsSubnetGroup.name,  
        publiclyAccessible: false,
        skipFinalSnapshot: true,
        // finalSnapshotIdentifier:"finalsnap22",


        dbName: "csye6225",
        parameterGroupName: rdsParameterGroup.name,
        vpcSecurityGroupIds: [databaseSecurityGroup.id],
        // subnetIds: [myvpc.selectSubnet({ subnetType: "Private" }).ids[0]], 
        // subnetIds: [privateSubnetIds[0]],
        multiAz: false,
        identifier: "rds-instance",
    //      skip_final_snapshot: false,
    // final_snapshot_identifier: "my-final-snapshot",
     
    });
    
    const rdsInstanceDetails = pulumi.all([rdsInstance.identifier]).apply(async ([instanceId]) => {
        try {
            const command = new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId });
        const response = await rdsClient.send(command);
           
 
           let snsTopic = new aws.sns.Topic("snsTopic");
            const dbInstance = response.DBInstances[0];  
            
            const dbUsername = dbInstance.MasterUsername;
            const dbEndpoint = dbInstance.Endpoint.Address;
            const dbName = dbInstance.DBName;  
            
            const dbDialect = "mysql";  
            
     
          const user_data=pulumi.interpolate`#!/bin/bash
            echo 'DB_USERNAME=${dbUsername}' >> /home/admin/.env

            echo 'DB_PASSWORD=${db_password}' >> /home/admin/.env

            echo 'DB_HOST=${dbEndpoint}' >> /home/admin/.env
            echo 'DB_DATABASE=${dbName}' >> /home/admin/.env
            echo 'DB_DIALECT=${dbDialect}' >> /home/admin/.env
            echo 'snsTopicArn= ${snsTopic.arn}' >> /home/admin/.env
            sudo chown admin:admin /home/admin/.env
            mv /home/admin/.env /home/csyeuser/webapp
            sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
 
    -s`
    ;
    // const User6Data = Buffer.from(user_data).toString("base64");
    const User6Data=user_data.apply(ud=>Buffer.from(ud).toString('base64'))
    console.log(user_data)
    console.log(User6Data)
 
        const ec2Role = new aws.iam.Role("EC2Role", {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "sts:AssumeRole",
                        Effect: "Allow",
                        Principal: {
                            Service: "ec2.amazonaws.com",
                        },
                    },
                ],
            }),
        });
        
        const cloudWatchPolicy1 = new aws.iam.Policy("CloudWatchPolicy1", {
            name: "CloudWatchPolicy1",
            description: "Policy for CloudWatch and EC2 permissions",
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: [
                            "cloudwatch:PutMetricData",
                            "ec2:DescribeVolumes",
                            "ec2:DescribeTags",
                            "logs:PutLogEvents",
                            "logs:DescribeLogStreams",
                            "logs:DescribeLogGroups",
                            "logs:CreateLogStream",
                            "logs:CreateLogGroup",
                        ],
                        Resource: "*",
                    },
                    {
                        Effect: "Allow",
                        Action: ["ssm:GetParameter"],
                        Resource: "arn:aws:ssm:*:*:parameter/AmazonCloudWatch-*",
                    },
                ],
            },
        });
        
 
 
        const instanceProfile = new aws.iam.InstanceProfile("InstanceProfile", {
            name: "InstanceProfile",
            role: ec2Role.name,
        });



//    const user64data=user_data.apply(data => Buffer.from(data).toString('base64'));
        const Ec2LaunchTemplate = new aws.ec2.LaunchTemplate("Ec2LaunchTemplate", {
            imageId: customAmiId,  
            instanceType: "t2.micro",  
            vpcSecurityGroupIds: [applicationSecurityGroup.id],
            subnetId: publicSubnetIds[0], 
            vpcId: myvpc.id, 
             keyName: Ec2Key,
           rootBlockDevice: {
              volumeSize: 25,
              volumeType: "gp2",
              deleteOnTermination: true,
               },
         associatePublicIpAddress: true,
         userData:User6Data,
        //  userData:  Buffer.from(user_data).toString('base64'),
        //  iamInstanceProfile: instanceProfile,
         iamInstanceProfile: {
            name: instanceProfile,
        },
                
             });
 //create a Target group
 const targetGroup = new aws.lb.TargetGroup("TargetGroup", {
    port: 8080,   
    protocol: "HTTP",
    targetType: "instance",
    vpcId: myvpc.id,
    healthCheck: {
        path: "/healthz",  
        port: "8080",     
        protocol: "HTTP",
        interval: 30,
        timeout: 10,
        unhealthyThreshold: 2,
        healthyThreshold: 2,
    },
});
 

// Auto Scaling Group
const autoScalingGroup = new aws.autoscaling.Group("myAutoScalingGroup", {
    vpcZoneIdentifiers: publicSubnetIds,  // Use public subnets for the Auto Scaling Group
    //  launchConfiguration: asgLaunchConfig.name,
    launchTemplate: {
        id: Ec2LaunchTemplate.id,
        // version: Ec2LaunchTemplate.latestVersion,
        version: "$Latest"
    },
    minSize: 1,
    maxSize: 3,
    desiredCapacity: 1,
    healthCheckType: "EC2",
    healthCheckGracePeriod: 300,
    forceDelete: true,
    tags: [
        {
            key: "Name",
            value: "MyAutoScalingGroup",
            propagateAtLaunch: true,
        },
    ],
    targetGroupArns: [targetGroup.arn],
});

// // Scaling Policies
const scaleUpPolicy = new aws.autoscaling.Policy("scaleUpPolicy", {
    scalingAdjustment: 1,
    adjustmentType: "ChangeInCapacity",
    cooldown: 60,
    // estimatedInstanceWarmup: 180,
    autoscalingGroupName: autoScalingGroup.name,
});

const scaleDownPolicy = new aws.autoscaling.Policy("scaleDownPolicy", {
    scalingAdjustment: -1,
    adjustmentType: "ChangeInCapacity",
    cooldown: 60,
    // estimatedInstanceWarmup: 180,
    autoscalingGroupName: autoScalingGroup.name,
});

// CloudWatch Alarms for scaling policies
const cpuUsageAlarm = new aws.cloudwatch.MetricAlarm("cpuUsageAlarm", {
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 60,
    statistic: "Average",
    threshold: 5,
    alarmActions: [scaleUpPolicy.arn],
    dimensions: {
        AutoScalingGroupName: autoScalingGroup.name,
    },
});

const scaleDownAlarm = new aws.cloudwatch.MetricAlarm("scaleDownAlarm", {
    comparisonOperator: "LessThanThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 60,
    statistic: "Average",
    threshold: 3,
    alarmActions: [scaleDownPolicy.arn],
    dimensions: {
        AutoScalingGroupName: autoScalingGroup.name,
    },
});
 


        

    //     const ec2Instance = new aws.ec2.Instance("ec2Instance", {
    //            ami: customAmiId,  
    //            instanceType: "t2.micro",  
    //            vpcSecurityGroupIds: [applicationSecurityGroup.id],
    //            subnetId: publicSubnetIds[0], 
    //            vpcId: myvpc.id, 
    //             keyName: "csye6225test",
    //           rootBlockDevice: {
    //              volumeSize: 25,
    //              volumeType: "gp2",
    //              deleteOnTermination: true,
    //               },
    //         associatePublicIpAddress: true,
    //         userData: user_data,
    //         iamInstanceProfile: instanceProfile,
            
    // })

    const selectedCertificate = aws.acm.getCertificate({
        domain: domainName,
        mostRecent: true,
      }, { async: true }).then(certificate => certificate.arn);


// Create Application Load Balancer
const ApplicationLoadBalancer = new aws.lb.LoadBalancer("AppLoadBalancer", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [loadBalancerSecurityGroup.id],
    subnets: publicSubnetIds,
});

// Create ALB listener
const albListener = new aws.lb.Listener("AlbListener", {
    loadBalancerArn: ApplicationLoadBalancer.arn,
    port: 443,
    protocol: "HTTPS",
    sslPolicy: "ELBSecurityPolicy-2016-08",  
    certificateArn: selectedCertificate, 
    defaultActions:[ {
        type: "forward",
        targetGroupArn: targetGroup.arn,   
    }],
});

  

// Route 53 DNS record set
const dnsRecord = new aws.route53.Record("myDnsRecord", {
    name: domainName,
    type: "A",
    // ttl: 60,
    zoneId: hostedZoneId,
    aliases: [{
        name: ApplicationLoadBalancer.dnsName,
        zoneId: ApplicationLoadBalancer.zoneId,
        evaluateTargetHealth: true,
    }],
    // records: [ApplicationLoadBalancer.dnsName],  
   
});

 
const dynamoDBTable = new aws.dynamodb.Table("lambdaDynamoDBtable", {
    attributes: [
        {
            name: "id",
            type: "S",
        
        }
    ],
    hashKey: "id",
    readCapacity: 5,
    writeCapacity: 5,
});

 
    
// Create a Google Cloud Storage bucket
const bucket = new gcp.storage.Bucket("BucketLambda", {
    name: bucketName, 
    location: gcplocation,
    project:googleproject,
    forceDestroy:true
});
// Create a Google Service Account
const serviceAccount = new gcp.serviceaccount.Account("ServiceAccount", {
    accountId: ServiceAcountId, 
    project: googleproject,
});

// // Assign the roles/storage.admin role to the service account
// const bucketAdminBinding = new gcp.storage.BucketIAMBinding("bucketAdminBinding", {
//     bucket: bucket.name,
//     role: "roles/storage.objects.create",
//     // members:["user:dev-audio-2023@dev-audio-2023.iam.gserviceaccount.com"]
//     members: ["user:pulividyavathi@gmail.com"],  
// });
// Replace with your service account ID and the GCP project
 

// Define the IAM member for the service account. The member format should be "serviceAccount:your-service-account@your-project.iam.gserviceaccount.com".
// const member = `serviceAccount:${serviceAccountId}@${gcpProject}.iam.gserviceaccount.com`;

// Attach the 'objectCreator' role to the service account
// const binding = new gcp.serviceaccount.IAMBinding("my-role-binding", {
//     serviceAccountId: serviceAccountId,
//     role: "roles/storage.objectCreator",
//     members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`],
// });
// Define the IAM policy for the bucket
const bucketIAMBinding = new gcp.storage.BucketIAMBinding("my-bucket-iam-binding", {
    bucket: bucket.name,
    role: "roles/storage.objectCreator",
    members:[pulumi.interpolate`serviceAccount:${serviceAccount.email}`]  
});

const bucketViewGcp = new gcp.storage.BucketIAMBinding("gcp-bucket-view", {
    bucket: bucket.name,
    role: "roles/storage.objectViewer",
    members:[pulumi.interpolate`serviceAccount:${serviceAccount.email}`]  
});
// Create Access Keys for the Google Service Account
const accessKey = new gcp.serviceaccount.Key("AccessKey", {
    serviceAccountId: serviceAccount.accountId,
});

 

//role for lambda 
const awsLambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});

//lambda full access policy
new aws.iam.RolePolicyAttachment("lambdaFullAccess", {
    policyArn: aws.iam.ManagedPolicy.LambdaFullAccess,
    role: awsLambdaRole.id,
});

// Attach AmazonSNSFullAccess policy
const snsPolicyAttachment = new aws.iam.RolePolicyAttachment("snsPolicyAttachment", {
    policyArn: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
    role: awsLambdaRole.id,
});

 
const cloudWatchPolicyAttachment1 = new aws.iam.PolicyAttachment("CloudWatchPolicyAttachment", {
 
    policyArn: cloudWatchPolicy1.arn,
    roles: [ec2Role.name,awsLambdaRole.name],
});
// Attach AmazonSNSFullAccess policy
const snsPolicyEc2Role = new aws.iam.RolePolicyAttachment("snsPolicyEc2Role", {
    policyArn: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
    role: ec2Role.id,
});


//Cloudwatch policy for lambda
const lambdaPolicyAttachment1 = new aws.iam.RolePolicyAttachment("lambdaCloudPolicyAttachment1", {
    policyArn: cloudWatchPolicy1.arn,
    role: awsLambdaRole.id,
});

// // Attach policies for DynamoDB access
// const dynamoDBPolicyAttachment = new aws.iam.RolePolicyAttachment("dynamoDBPolicyAttachment", {
//     policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
//     role: awsLambdaRole.name,
// });

// Attach policies for Mailgun access
const mailgunPolicyAttachment = new aws.iam.RolePolicyAttachment("mailgunPolicyAttachment", {
    policyArn: "arn:aws:iam::aws:policy/AmazonSESFullAccess",  
    role: awsLambdaRole.name,
});

const dynamoDBPolicy = new aws.iam.Policy("dynamoDBPolicy", {
    name: "DynamoDBPolicy",
    description: "Custom policy for DynamoDB access",
    policy: `{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:Scan",
                    "dynamodb:Query"
                ],
                "Resource": "*"
            }
        ]
    }`,
});

// const dynamoDBPolicy = new aws.iam.Policy("dynamoDBPolicy", {
//     name: "DynamoDBPolicy",
//     description: "Custom policy for DynamoDB access",
//     policy: JSON.stringify({
//         Version: "2012-10-17",
//         Statement: [
//             {
//                 Effect: "Allow",
//                 Action: [
//                     "dynamodb:PutItem",
//                 ],
//                 Resource: dynamoDBTable.arn,
//             },
//         ],
//     }),
// });

// // Create a policy for DynamoDB put item access
// const dynamoDBPolicy = new aws.iam.Policy("policy", {
//     description: "A test policy",
//     policy: `{
//       "Version": "2012-10-17",
//       "Statement": [
//         {
//           "Action": [
//             "dynamodb:PutItem"
//           ],
//           "Effect": "Allow",
//           "Resource": "*"
//         }
//       ]
//     }`,
//   });
  
// Attach the custom policy to the Lambda function's role
const dynamoDBPolicyAttachment = new aws.iam.RolePolicyAttachment("dynamoDBPolicyAttachment", {
    policyArn: dynamoDBPolicy.arn,
    role: awsLambdaRole.name,
});

const lambdaFunc = new aws.lambda.Function("lambdaFunction", {
    runtime: aws.lambda.Runtime.NodeJS18dX,
    role: awsLambdaRole.arn,
    handler: "index.handler",
    timeout: 30,
    description: "Lambda function to download a GitHub release and store it in a GCS bucket.",
    code: new pulumi.asset.AssetArchive({
 
        ".": new pulumi.asset.FileArchive("/Users/vidyavathipuli/Serverless/serverless"),
 
    }),
    environment: {
                variables: {
                    GOOGLE_ACCESS_KEY: accessKey.secret,
                    BUCKET_NAME: bucket.name,
                    GOOGLE_PRIVATE_KEY:accessKey.privateKey,
                    MAILGUN_API_KEY: MAILGUN_API_KEY,
                    MAILGUN_DOMAIN: MAILGUN_DOMAIN,
 
                    MAILGUN_FROM: MAILGUN_FROM,
                    DYNAMODB_TABLE_NAME: dynamoDBTable.name,
                },
            },
});

// Subscribe Lambda function to the SNS topic
const snsSubscription = new aws.sns.TopicSubscription("newlambdaSubscription", {
    protocol: "lambda",
    endpoint: lambdaFunc.arn,
    topic: snsTopic.arn,
});
// // subscribe lambda function to SNS topic
// new aws.lambda.EventSourceMapping("snsEventSourceMapping", {
//     eventSourceArn: snsTopic.arn,
//     functionName: lambdaFunc.arn,
// });
// Configure Lambda function to be invoked by SNS topic
// const lambdaEventInvokeConfig = new aws.lambda.FunctionEventInvokeConfig("lambdaEventInvokeConfig", {
//     functionName: lambdaFunc.name,
//     destinationConfig: {
//         onFailure: {
//             destination: snsTopic.arn,
//         },
//         onSuccess: {
//             destination: snsTopic.arn,
//         },
//     },
// });

const myLambdaPermission = new aws.lambda.Permission("myLambdaPermission", {
    action: "lambda:InvokeFunction",
    function: lambdaFunc.name,
    principal: "sns.amazonaws.com",
    sourceArn: snsTopic.arn,
});


// // IAM Role for Lambda function
// const lambdaRole = new aws.iam.Role("lambdaRole", {
//     assumeRolePolicy: JSON.stringify({
//         Version: "2012-10-17",
//         Statement: [
//             {
//                 Action: "sts:AssumeRole",
//                 Effect: "Allow",
//                 Principal: {
//                     Service: "lambda.amazonaws.com",
//                 },
//             },
//         ],
//     }),
// });

// // Attach policies to the Lambda role as needed
// const lambdaPolicyAttachment = new aws.iam.RolePolicyAttachment("lambdaPolicyAttachment", {
//     policyArn: aws.iam.ManagedPolicy.LambdaFullAccess,
//     role: lambdaRole.name,
// });
//  // Lambda function
// const lambdaFunction = new aws.lambda.Function("LambdaFunction", {
//     runtime: aws.lambda.NodeJS12dXRuntime,
//     handler: "index.handler",
//     role: aws.iam.Role.arn,
//     timeout: 300,
//     code: new pulumi.asset.FileArchive("/Users/vidyavathipuli/PulumiServerless/serverless"),
//     environment: {
//         variables: {
//             GOOGLE_ACCESS_KEY: accessKey.secret,
//             BUCKET_NAME: bucket.name,
             
//         },
//     },
// });
// // IAM Role for Lambda function
// const lambdaRole = new aws.iam.Role("lambdaRole", {
//     assumeRolePolicy: JSON.stringify({
//         Version: "2012-10-17",
//         Statement: [
//             {
//                 Action: "sts:AssumeRole",
//                 Effect: "Allow",
//                 Principal: {
//                     Service: "lambda.amazonaws.com",
//                 },
//             },
//         ],
//     }),
// });

// // Attach policies to the Lambda role as needed
// const lambdaPolicyAttachment = new aws.iam.RolePolicyAttachment("lambdaPolicyAttachment", {
//     policyArn: aws.iam.ManagedPolicy.LambdaFullAccess,
//     role: lambdaRole.name,
// });
// // Create an SNS topic
// const snsTopic = new aws.sns.Topic("snsTopic");

// // subscribe lambda function to SNS topic
// new aws.lambda.EventSourceMapping("snsEventSourceMapping", {
//     eventSourceArn: snsTopic.arn,
//     functionName: lambdaFunction.arn,
// });


} catch (error) {
    console.error("Error retrieving RDS details:", error);
  }
});


    exports.vpcId = myvpc.id;
    exports.publicSubnetIds = publicSubnetIds;
    exports.privateSubnetIds = privateSubnetIds;
    exports.publicRouteTableId = publicRouteTable.id;
    exports.privateRouteTableId = privateRouteTable.id;
});