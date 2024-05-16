import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { StateMachine } from "@pulumi/aws/sfn";
import { Policy } from "@pulumi/aws/iam";
import { Bucket } from "@pulumi/aws/s3";
import { Function } from "@pulumi/aws/lambda";

const config = new pulumi.Config();
const stateMachineRoleName = config.require("stateMachineRoleName");
const inboundRuleRoleName = config.require("inboundRuleRoleName");
const lambdaRoleName = config.require("lambdaRoleName");

export const stateMachineRoleHandler = (
  inputBucket: Bucket,
  outputBucket: Bucket,
  filterLabelsLambda: Function,
  buildOutputLambda: Function
) => {
  const stateMachineRole = new aws.iam.Role(stateMachineRoleName, {
    name: stateMachineRoleName,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "states.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    inlinePolicies: [
      {
        name: "detect-labels",
        policy: pulumi.jsonStringify({
          Statement: [
            {
              Action: "rekognition:DetectLabels",
              Effect: "Allow",
              Resource: "*",
            },
          ],
        }),
      },
      {
        name: "read-input-bucket",
        policy: pulumi.jsonStringify({
          Statement: [
            {
              Action: "s3:GetObject",
              Effect: "Allow",
              Resource: inputBucket.arn.apply((arn) => `${arn}/*`),
            },
          ],
        }),
      },
      {
        name: "invoke-filter-labels-lambda",
        policy: pulumi.jsonStringify({
          Statement: [
            {
              Action: "lambda:InvokeFunction",
              Effect: "Allow",
              Resource: [
                filterLabelsLambda.arn.apply((arn) => `${arn}:$LATEST`),
                buildOutputLambda.arn.apply((arn) => `${arn}:$LATEST`),
              ],
            },
          ],
        }),
      },
      {
        name: "invoke-model",
        policy: pulumi.jsonStringify({
          Statement: [
            {
              Action: "bedrock:InvokeModel",
              Effect: "Allow",
              Resource: "*",
            },
          ],
        }),
      },
      {
        name: "write-output-bucket",
        policy: pulumi.jsonStringify({
          Statement: [
            {
              Action: "s3:PutObject",
              Effect: "Allow",
              Resource: [
                outputBucket.arn.apply((arn) => arn),
                outputBucket.arn.apply((arn) => `${arn}/*`),
              ],
            },
          ],
        }),
      },
    ],
  });

  return stateMachineRole;
};
export const inboundRuleRolePolicyHandler = (stateMachine: StateMachine) => {
  const policy = new aws.iam.Policy(`${inboundRuleRoleName}-policy`, {
    name: `${inboundRuleRoleName}-policy`,
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

  return policy;
};

export const inboundRuleRoleHandler = (policy: Policy) => {
  const inboundRuleRole = new aws.iam.Role(inboundRuleRoleName, {
    name: inboundRuleRoleName,
    assumeRolePolicy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "events.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    managedPolicyArns: [policy.arn],
  });

  return inboundRuleRole;
};

export const lambdaRoleHandler = () => {
  const assumeRole = aws.iam.getPolicyDocument({
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

  const lambdaRole = new aws.iam.Role(lambdaRoleName, {
    name: lambdaRoleName,
    assumeRolePolicy: assumeRole.then((assumeRole) => assumeRole.json),
  });

  return lambdaRole;
};
