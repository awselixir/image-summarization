import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { Bucket } from "@pulumi/aws/s3";
import { StateMachine } from "@pulumi/aws/sfn";
import { EventRule } from "@pulumi/aws/cloudwatch";
import { Role } from "@pulumi/aws/iam";

const config = new pulumi.Config();
const inboundNotificationName = config.require("inboundNotificationName");
const inboundRuleName = config.require("inboundRuleName");
const targetName = config.require("targetName");

export const bucketNotificationHandler = (bucket: Bucket) => {
  const bucketNotification = new aws.s3.BucketNotification(
    inboundNotificationName,
    {
      bucket: bucket.id,
      eventbridge: true,
    }
  );

  return bucketNotification;
};

export const ruleHandler = (bucket: Bucket) => {
  const eventBridgeRule = new aws.cloudwatch.EventRule(inboundRuleName, {
    name: inboundRuleName,
    eventPattern: pulumi.jsonStringify({
      source: ["aws.s3"],
      "detail-type": ["Object Created"],
      detail: {
        bucket: {
          name: [bucket.id],
        },
      },
    }), forceDestroy: true,
  });
  return eventBridgeRule;
};

export const targetHandler = (
  rule: EventRule,
  role: Role,
  stateMachine: StateMachine
) => {
  const eventBridgeTarget = new aws.cloudwatch.EventTarget(targetName, {
    targetId: targetName,
    rule: rule.name,
    arn: stateMachine.arn,
    roleArn: role.arn
  });

  return eventBridgeTarget
};
