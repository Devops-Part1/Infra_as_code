# Infrastructure as Code

# Pulumi Infrastructure Setup

This project automates the deployment of a scalable cloud infrastructure using Pulumi with AWS and GCP.

## Overview

This repository sets up the following components:
- A VPC with public and private subnets.
- Security Groups for applications, RDS, and load balancers.
- RDS instance with MariaDB and a custom parameter group.
- Auto Scaling Group with an Application Load Balancer.
- DynamoDB table for data storage.
- Lambda function integrated with Google Cloud Storage and SNS.
- Google Cloud Storage bucket and IAM roles for GCP integration.

## Prerequisites

- Pulumi CLI installed.
- AWS and GCP CLI configured with appropriate permissions.
- `Pulumi.demo.yaml` configuration file with the required parameters.

## Configuration File

Update `Pulumi.demo.yaml` with the following parameters:

- **AWS Parameters**
  - `aws:region`: AWS region.
  - `VPC_CIDR`: CIDR block for the VPC.
  - `PUBLIC_CIDR`: CIDR block for public route.
  - `VPC_NAME`: VPC name.
  - `GW_NAME`: Internet Gateway name.
  - `CUSTOM_AMI_ID`: Custom AMI ID for EC2 instances.
  - `DB_USERNAME` and `DB_PASSWORD`: RDS credentials.
  - `hostedZoneId`: Route 53 hosted zone ID.
  - `domain_name`: Domain name for the ALB.

- **Mailgun Parameters**
  - `mailgunApiKey`: Mailgun API key.
  - `mailgunDomain`: Mailgun domain.
  - `mailgunFrom`: Mailgun sender email.

- **GCP Parameters**
  - `googleproject`: GCP project ID.
  - `ServiceAcountId`: Service account ID.
  - `gcplocation`: GCP bucket location.
  - `bucketName`: Name of the GCS bucket.

## Components

### VPC and Subnets
- Creates public and private subnets across 3 availability zones.
- Configures route tables for public and private subnets.

### Security Groups
- Application Security Group: Allows traffic on port 22 (SSH) and 8080 (application).
- Load Balancer Security Group: Manages ingress and egress for the ALB.
- Database Security Group: Restricts access to the RDS instance.

### RDS Instance
- MariaDB instance configured with custom parameters and a private subnet.

### Application Load Balancer
- ALB with HTTPS listener and DNS record in Route 53.

### Auto Scaling Group
- Configures EC2 instances using a Launch Template.
- Auto scales based on CPU utilization metrics.

### Lambda Function
- Node.js-based function to interact with DynamoDB and GCS.
- Integrated with SNS for notifications.

### DynamoDB
- Single table with a primary key of `id`.

### GCP Integration
- Creates a GCS bucket and service account for object storage.
- Assigns roles for bucket access.

## Deployment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Pulumi:
   ```bash
   pulumi login
   pulumi stack init <stack-name>
   pulumi config set aws:region <aws-region>
   ```

4. Deploy the infrastructure:
   ```bash
   pulumi up
   ```

5. Destroy the infrastructure when no longer needed:
   ```bash
   pulumi destroy
   ```

## Outputs

After deployment, Pulumi will provide the following outputs:
- VPC ID
- Public and private subnet IDs
- Route table IDs
- Load balancer DNS name
- DynamoDB table name
- GCS bucket name

## Troubleshooting

- Verify AWS and GCP CLI configurations if deployment fails.
- Ensure `Pulumi.demo.yaml` is correctly formatted.
- Check logs for specific errors during `pulumi up`.



