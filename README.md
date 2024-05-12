# AWS Image Summarization
This is a small project using Pulumi, Rekognition, and Bedrock to automatically summarize the content of images

## Services

### Bedrock

Amazon Bedrock is a fully managed service that offers a choice of high-performing foundation models (FMs) from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Mistral AI, Stability AI, and Amazon through a single API, along with a broad set of capabilities you need to build generative AI applications with security, privacy, and responsible AI.

### Rekognition

Amazon Rekognition offers pre-trained and customizable computer vision (CV) capabilities to extract information and insights from your images and videos.

### Step Functions

AWS Step Functions is a visual workflow service that helps developers use AWS services to build distributed applications, automate processes, orchestrate microservices, and create data and machine learning (ML) pipelines. 

## Installation

### Prerequisites
- Pulumi
- Node
- AWS CLI

### Authentication
This deployment uses the AWS credential file. the credentials file is a plaintext file on your machine that contains your access keys. The file must be named `credentials` and is located underneath `.aws/` directory in your home directory. This file is typically creating using the AWS CLI using `aws configure` commmand.

#### Use the CLI

Example: Create a credential profile name image-summarization-dev

```shell
$ aws configure --profile image-summarization-dev
AWS Access Key ID [None]: <YOUR_ACCESS_KEY_ID>
AWS Secret Access Key [None]: <YOUR_SECRET_ACCESS_KEY>
```

#### Create by Hand

You can also manually edit the credentials file. Example:

```ini
[default]
aws_access_key_id=ASIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[user1]
aws_access_key_id=ASIAI44QH8DHBEXAMPLE
aws_secret_access_key=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

### Backend

Similar to Terraform, Pulumi needs a configured backend to track state.

#### Local

If you're deploying this as a simple test, the easiest option is to keep the state on your local machine.

```shell
pulumi login --local
```

#### S3

Or you can easily create an S3 bucket and store the state there. Pulumi can also use the same bucket for multiple project & stacks so there's no worries in using a pre-existing Pulumi state bucket. Just substitute your bucket name and AWS profile contained in ~/.aws/credentials.


```shell
pulumi login 's3://<bucket-name>?region=us-east-1&awssdk=v2&profile=<profile-name>'
```

### Modify Variables (Optional)

You can modify the variables in Pulumi.yaml to match your desired scheme.

Note: Bedrock is only available in us-east-1 and us-west-2

```yaml
# Primary region
primaryRegion: us-east-1
# Secondary region. Is only used if the stack's name is prod
secondaryRegion: us-west-2
# These correspond to the names of services
inboundBucketName: inbound-bucket
inboundNotificationName: inbound-notification
inboundTopicName: inbound-topic
# Suffix added to the names of services deployed into the secondary region. Example: inbound-bucket-backup
suffix: backup
```