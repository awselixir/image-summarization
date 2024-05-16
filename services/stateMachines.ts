import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Role } from "@pulumi/aws/iam";
import { Function } from "@pulumi/aws/lambda";
import { Bucket } from "@pulumi/aws/s3";

const config = new pulumi.Config();
const stateMachineName = config.require("stateMachineName");
const modelId = config.require("modelId");

export const stateMachineHandler = (
  role: Role,
  filterLabelsLambda: Function,
  buildOutputLambda: Function,
  outputBucket: Bucket
) => {
  const stateMachine = new aws.sfn.StateMachine(stateMachineName, {
    name: stateMachineName,
    roleArn: role.arn.apply((arn) => `${arn}`),
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
            FunctionName: pulumi.interpolate`${filterLabelsLambda.arn}:$LATEST`,
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
            ModelId: modelId,
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
            FunctionName: pulumi.interpolate`${buildOutputLambda.arn}:$LATEST`,
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
            Bucket: outputBucket.id.apply(id => id),
            "Key.$": "States.Format('{}.json', $.source.file)",
          },
          Resource: "arn:aws:states:::aws-sdk:s3:putObject",
        },
      },
    }),
  });
  return stateMachine;
};
