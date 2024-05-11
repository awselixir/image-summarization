import { primaryProvider, secondaryProvider } from "./services/providers";
import * as pulumi from "@pulumi/pulumi";
import * as buckets from "./services/buckets";
import * as topics from "./services/topics";
import * as notifications from "./services/notifications";

let config = new pulumi.Config();
let stack = pulumi.getStack();

const inboundBucketName = config.require("inboundBucketName");
const inboundNotificationName = config.require("inboundNotificationName");
const inboundTopicName = config.require("inboundTopicName");
const suffix = config.require("suffix");

// Create the inbound bucket
const inboundBucket = buckets.createBucket(inboundBucketName);

// Creates the inbound topic
const inboundTopic = topics.createBucketTopic(
  inboundTopicName,
  inboundBucket,
  primaryProvider
);

const inboundNotification = notifications.createBucketNotification(inboundNotificationName, inboundBucket, inboundTopic, primaryProvider)

if (stack === "prod") {
  // Creates the backup inbound bucket
  const inboundBucketBackup = buckets.createBucket(
    `${inboundBucketName}-${suffix}`,
    secondaryProvider
  );

  // Creates the backup inbound topic
  const inboundTopicBackup = topics.createBucketTopic(
    `${inboundTopicName}-${suffix}`,
    inboundBucketBackup,
    secondaryProvider
  );
}
