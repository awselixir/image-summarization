import * as pulumi from "@pulumi/pulumi";
import * as archive from "@pulumi/archive";
import * as aws from "@pulumi/aws";

const inputBucket = new aws.s3.Bucket("input-bucket", {
  forceDestroy: true,
});

const inputBucketNotification = new aws.s3.BucketNotification(
  "input-bucket-notification",
  { eventbridge: true, bucket: inputBucket.id }
);

const outputBucket = new aws.s3.Bucket("output-bucket", {
  forceDestroy: true,
});

const lambdaTrustPolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["lambda.amazonaws.com"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
});

const lambdaRole = new aws.iam.Role("ImageSummarizationLambdaRole", {
  name: "ImageSummarizationLambdaRole",
  assumeRolePolicy: lambdaTrustPolicy.then((policy) => policy.json),
});

const filterLabelsArchive = archive.getFile({
  type: "zip",
  sourceFile: "lambdas/src/filterLabels.mjs",
  outputPath: "lambdas/dist/filterLabels.zip",
});

const filterLabelsFunction = new aws.lambda.Function(
  "ImageSummarizationFilterLabels",
  {
    code: new pulumi.asset.FileArchive("lambdas/dist/filterLabels.zip"),
    name: "ImageSummarizationFilterLabels",
    role: lambdaRole.arn,
    sourceCodeHash: filterLabelsArchive.then(
      (archive) => archive.outputBase64sha256
    ),
    runtime: aws.lambda.Runtime.NodeJS20dX,
    handler: "filterLabels.handler",
    environment: {
      variables: {
        CONFIDENCE_LEVEL: "90",
      },
    },
  }
);

const buildOutputArchive = archive.getFile({
  type: "zip",
  sourceFile: "lambdas/src/buildOutput.mjs",
  outputPath: "lambdas/dist/buildOutput.zip",
});

const buildOutputFunction = new aws.lambda.Function(
  "ImageSummarizationBuildOutput",
  {
    code: new pulumi.asset.FileArchive("lambdas/dist/buildOutput.zip"),
    name: "ImageSummarizationBuildOutput",
    role: lambdaRole.arn,
    sourceCodeHash: buildOutputArchive.then(
      (archive) => archive.outputBase64sha256
    ),
    runtime: aws.lambda.Runtime.NodeJS20dX,
    handler: "buildOutput.handler",
  }
);

const stateMachineTrustPolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["states.amazonaws.com"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
});

const stateMachinePolicy = new aws.iam.Policy("ImageSummarizationSfn-Policy", {
  name: "ImageSummarizationSfn-Policy",
  path: "/",
  description: "Permission policy for Image Summarization state machine",
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["lambda:InvokeFunction"],
        Resource: [
          pulumi.interpolate`${filterLabelsFunction.arn}:$LATEST`,
          pulumi.interpolate`${buildOutputFunction.arn}:$LATEST`,
        ],
      },
      {
        Action: ["s3:GetObject", "s3:DeleteObject", "s3:PutObject"],
        Effect: "Allow",
        Resource: [
          pulumi.interpolate`${inputBucket}/*`,
          pulumi.interpolate`${outputBucket}/*`,
        ],
      },
      {
        Action: "rekognition:DetectLabels",
        Effect: "Allow",
        Resource: "*",
      },
      {
        Action: ["bedrock:InvokeModel"],
        Effect: "Allow",
        Resource: "*",
      },
    ],
  }),
});

const stateMachineRole = new aws.iam.Role("ImageSummarizationSfn-Role", {
  name: "ImageSummarizationSfn-Role",
  assumeRolePolicy: stateMachineTrustPolicy.then((policy) => policy.json),
  managedPolicyArns: [stateMachinePolicy.arn],
});

const stateMachine = new aws.sfn.StateMachine(
  "ImageSummarizationStateMachine",
  {
    name: "ImageSummarizationStateMachine",
    roleArn: stateMachineRole.arn,
    definition: pulumi.jsonStringify({
      Comment: "A description of my state machine",
      StartAt: "Detect Labels",
      States: {
        "Detect Labels": {
          Type: "Task",
          Parameters: {
            Image: {
              S3Object: {
                "Bucket.$": "$.detail.bucket.name",
                "Name.$": "$.detail.object.key",
              },
            },
          },
          Resource: "arn:aws:states:::aws-sdk:rekognition:detectLabels",
          Next: "Filter Labels",
          ResultPath: "$.Rekognition",
          ResultSelector: {
            "Labels.$": "$.Labels",
          },
          Comment:
            "Uses Rekognition to detect the labels in the image. Combines it's input and output into a single state.",
        },
        "Filter Labels": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            "Payload.$": "$",
            FunctionName: pulumi.interpolate`${filterLabelsFunction.arn}:$LATEST`,
          },
          Comment:
            "Filters labels based on confidence and provides a count of occurencer per-label",
          Retry: [
            {
              ErrorEquals: [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException",
                "Lambda.TooManyRequestsException",
              ],
              IntervalSeconds: 1,
              MaxAttempts: 3,
              BackoffRate: 2,
            },
          ],
          ResultPath: "$.Lambda",
          ResultSelector: {
            "FilteredLabels.$": "$.Payload.labels",
          },
          Next: "Bedrock InvokeModel",
        },
        "Bedrock InvokeModel": {
          Type: "Task",
          Resource: "arn:aws:states:::bedrock:invokeModel",
          Parameters: {
            ModelId:
              "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-premier-v1:0",
            Body: {
              "inputText.$":
                "States.Format('Human: Here is a comma seperated list of labels/objects seen in an image\n<labels>{}</labels>\n\nPlease provide a human readible and understandable summary based on these labels\n\nAssistant:', $.Lambda.FilteredLabels)",
              textGenerationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxTokenCount: 512,
              },
            },
          },
          ResultPath: "$.Bedrock",
          Next: "Build Output",
        },
        "Build Output": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          OutputPath: "$.Payload",
          Parameters: {
            "Payload.$": "$",
            FunctionName: pulumi.interpolate`${buildOutputFunction.arn}:$LATEST`,
          },
          Retry: [
            {
              ErrorEquals: [
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException",
                "Lambda.TooManyRequestsException",
              ],
              IntervalSeconds: 1,
              MaxAttempts: 3,
              BackoffRate: 2,
            },
          ],
          Next: "Save Output",
        },
        "Save Output": {
          Type: "Task",
          End: true,
          Parameters: {
            "Body.$": "$",
            Bucket: outputBucket.id,
            "Key.$": "States.Format('{}.json', $.source.file)",
          },
          Resource: "arn:aws:states:::aws-sdk:s3:putObject",
        },
      },
    }),
  }
);

const inputRule = new aws.cloudwatch.EventRule("input-bucket-rule", {
  name: "input-bucket-rule",
  eventPattern: pulumi.jsonStringify({
    source: ["aws.s3"],
    "detail-type": ["Object Created"],
    detail: {
      bucket: {
        name: [inputBucket.id],
      },
    },
  }),
  forceDestroy: true,
});

const inputRuleTrustPolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["events.amazonaws.com"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
});

const inputRulePolicy = new aws.iam.Policy("ImageSummarizationRule-Policy", {
  name: "ImageSummarizationRule-Policy",
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["states:StartExecution"],
        Resource: [stateMachine.arn],
      },
    ],
  }),
});

const inputRuleRole = new aws.iam.Role("ImageSummarizationRule-Role", {
  name: "ImageSummarizationRule-Role",
  assumeRolePolicy: inputRuleTrustPolicy.then((policy) => policy.json),
  managedPolicyArns: [inputRulePolicy.arn],
});

const inputRuleTarget = new aws.cloudwatch.EventTarget("input-rule-target", {
  targetId: "input-rule-target",
  rule: inputRule.name,
  arn: stateMachine.arn,
  roleArn: inputRuleRole.arn,
});
