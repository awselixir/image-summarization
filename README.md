# AWS Image Summarization
This is a small project using Pulumi, Rekognition, and Bedrock to automatically summarize the content of images

## Services

### Bedrock

Amazon Bedrock is a fully managed service that offers a choice of high-performing foundation models (FMs) from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Mistral AI, Stability AI, and Amazon through a single API, along with a broad set of capabilities you need to build generative AI applications with security, privacy, and responsible AI.

### Rekognition

Amazon Rekognition offers pre-trained and customizable computer vision (CV) capabilities to extract information and insights from your images and videos.

### Step Functions

AWS Step Functions is a visual workflow service that helps developers use AWS services to build distributed applications, automate processes, orchestrate microservices, and create data and machine learning (ML) pipelines. 

## Architecture
![Architecture](/assets/architecture.png "Architecture")

## Installation

### Prerequisites
- [Pulumi](https://www.pulumi.com/docs/install)
- [Node.js](https://nodejs.org/en/download)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

## Dependencies

From the project directory install the dependencies using `npm install`

### Authentication
This guide assumes you'll be using an AWS credential file, but there's a few options when it comes to [authenticating Pulumi with AWS](https://www.pulumi.com/registry/packages/aws/installation-configuration/). 

#### Credential File Examples

##### Use the CLI

The easiest option is to use the AWS CLI to create your profile

```shell
$ aws configure --profile image-summarization-dev
AWS Access Key ID [None]: <YOUR_ACCESS_KEY_ID>
AWS Secret Access Key [None]: <YOUR_SECRET_ACCESS_KEY>
```

##### Create by Hand

You can also edit the ~/.aws/credentials file manually if needed

```ini
[default]
aws_access_key_id=ASIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[image-summarization-dev]
aws_access_key_id=ASIAI44QH8DHBEXAMPLE
aws_secret_access_key=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

### Backend

Before deploying you'll need a Pulumi backend. Similar to Terraform, Pulumi stores metadata about your infrastructure so that it can manage your cloud resources. This metadata is called state. Each stack has its own state, and state is how Pulumi knows when and how to create, read, delete, or update cloud resources. Backend options include Pulumi Cloud, **AWS S3**, Microsoft Azure Blob Storage, Google Cloud Storage, any AWS S3 compatible server such as Minio or Ceph, or a **local filesystem**. For more info, please refer to [Managing state & backend options](https://www.pulumi.com/docs/concepts/state/).

#### Examples

##### Local

If you're deploying this as a simple test, the easiest option is to keep the state on your local machine.

```shell
pulumi login --local
```

##### AWS S3

Or you can easily create an S3 bucket and store the state there. Pulumi can also use the same bucket for multiple project & stacks so there's no worries in using a pre-existing Pulumi state bucket. Just substitute your bucket name and AWS profile contained in ~/.aws/credentials.


```shell
pulumi login 's3://<bucket-name>?region=us-east-1&awssdk=v2&profile=<profile-name>'
```

### Modify Variables (Optional)

You can modify the variables in Pulumi.yaml to match your desired scheme.

Note: Bedrock is only available in us-east-1 and us-west-2

```yaml
# Change the names of the deployed services to match your desired scheme
buildOutputFunctionName: build-output
filterLabelsFunctionName: filter-labels
inputBucketName: input-bucket
outputBucketName: output-bucket
inboundNotificationName: inbound-notification
inboundRuleName: inbound-rule
inboundRuleRoleName: inbound-rule-role
lambdaRoleName: lambda-role
stateMachineName: state-machine
stateMachineRoleName: state-machine-role
targetName: rule-target
# Changes the model use for inference
modelId: arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-premier-v1:0
```

## Stacks

Every Pulumi program is deployed to a stack. A stack is an isolated, independently configurable instance of a Pulumi program. Stacks are commonly used to denote different phases of development (such as development, staging, and production) or feature branches (such as feature-x-dev).

### Create a Stack

To create a new stack, use `pulumi stack init stackName`. This creates an empty stack stackName and sets it as the active stack. The project that the stack is associated with is determined by finding the nearest Pulumi.yaml file.

The stack name must be unique within a project. Stack names may only contain alphanumeric characters, hyphens, underscores, or periods.

#### Example

This will create a stack named ***dev***

```shell
$ pulumi stack init dev
Created stack 'dev'
Enter your passphrase to protect config/secrets:  
Re-enter your passphrase to confirm:  
```
### AWS Profile

Set the profile to be used using `pulumi config set aws:profile profileName`.

#### Example

This will attach the AWS profile ***image-summarization-dev***

```shell
pulumi config set aws:profile image-summarization-dev
```

### Region

Set the desired region using `pulumi config set aws:region region`

#### Example

```shell
pulumi config set aws:region us-east-1
```

## Installation

Assuming everything went right, you can now deploy the stack using `pulumi up`

```shell
% pulumi up   
Previewing update (dev):
     Type                           Name                      Plan       
 +   pulumi:pulumi:Stack            image-summarization-dev   create     
 +   ├─ aws:s3:Bucket               output-bucket             create     
 +   ├─ aws:s3:Bucket               input-bucket              create     
 +   ├─ aws:lambda:Function         filter-labels             create     
 +   ├─ aws:iam:Role                lambda-role               create     
 +   ├─ aws:s3:BucketNotification   inbound-notification      create     
 +   ├─ aws:cloudwatch:EventRule    inbound-rule              create     
 +   ├─ aws:lambda:Function         build-output              create     
 +   ├─ aws:iam:Role                inbound-rule-role         create     
 +   ├─ aws:iam:Role                state-machine-role        create     
 +   ├─ aws:sfn:StateMachine        state-machine             create     
 +   ├─ aws:iam:Policy              inbound-rule-role-policy  create     
 +   └─ aws:cloudwatch:EventTarget  rule-target               create     

Resources:
    + 13 to create

Do you want to perform this update?  [Use arrows to move, type to filter]
> yes
  no
  details
```

```shell
Do you want to perform this update? yes
Updating (dev):
     Type                           Name                      Status              
 +   pulumi:pulumi:Stack            image-summarization-dev   created (33s)       
 +   ├─ aws:iam:Role                lambda-role               created (1s)        
 +   ├─ aws:s3:Bucket               input-bucket              created (1s)        
 +   ├─ aws:s3:Bucket               output-bucket             created (1s)        
 +   ├─ aws:s3:BucketNotification   inbound-notification      created (1s)        
 +   ├─ aws:cloudwatch:EventRule    inbound-rule              created (2s)        
 +   ├─ aws:lambda:Function         build-output              created (11s)       
 +   ├─ aws:lambda:Function         filter-labels             created (17s)       
 +   ├─ aws:iam:Role                state-machine-role        created (1s)        
 +   ├─ aws:sfn:StateMachine        state-machine             created (1s)        
 +   ├─ aws:iam:Policy              inbound-rule-role-policy  created (0.74s)     
 +   ├─ aws:iam:Role                inbound-rule-role         created (0.88s)     
 +   └─ aws:cloudwatch:EventTarget  rule-target               created (0.77s)     

Resources:
    + 13 created

Duration: 34s
```

Tip: To prevent being prompted for your password on every deployment, set the environment variable ***PULUMI_CONFIG_PASSPHRASE*** to the password entered during stack creation

```shell
export PULUMI_CONFIG_PASSPHRASE=password
```

## Test

There are a couple of copyright free images contained in the assets folder (skateboard.jpeg & horses.jpeg). Upload either to the input bucket and you should quickly find the generated sumamry in the output bucket.

### Example

For this example, we will upload skateboard.jpeg to the input bucket.

#### Image

![Skateboard](/assets/skateboard.jpeg "Skateboard")

#### Output

The output is a JSON file, and the object key will be ***orginal-filename.json***

```json
{
  "source": { "bucket": "input-bucket-a92f86d", "file": "skateboard.jpeg" },
  "labels": [
    {
      "Aliases": [],
      "Categories": [{ "Name": "Buildings and Architecture" }],
      "Confidence": 99.999985,
      "Instances": [],
      "Name": "Neighborhood",
      "Parents": []
    },
    {
      "Aliases": [{ "Name": "Town" }],
      "Categories": [{ "Name": "Buildings and Architecture" }],
      "Confidence": 99.98229,
      "Instances": [],
      "Name": "City",
      "Parents": []
    },
    {
      "Aliases": [],
      "Categories": [{ "Name": "Transport and Logistics" }],
      "Confidence": 99.971695,
      "Instances": [],
      "Name": "Road",
      "Parents": []
    }
    //Content truncated for readability
  ],
  "summary": "The image shows a city with a road and street in the neighborhood. There are 13 cars and 21 wheels. There is 1 building and 2 persons in the metropolis. The architecture is urban."
}

```