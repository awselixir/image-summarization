import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

let config = new pulumi.Config();
const inputBucketName = config.require("inputBucketName");
const outputBucketName = config.require("outputBucketName");

export const inputBucketHandler = () => {
  const inputBucket = new aws.s3.Bucket(inputBucketName, {
    forceDestroy: true,
  });
  return inputBucket;
};

export const outputBucketHandler = () => {
  const outputBucket = new aws.s3.Bucket(outputBucketName, {
    forceDestroy: true,
  });
  return outputBucket;
};
