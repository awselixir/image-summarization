import * as aws from "@pulumi/aws";
import { Bucket } from "@pulumi/aws/s3";
import { Topic } from "@pulumi/aws/sns";

export const createBucketNotification = (
  name: string,
  bucket: Bucket,
  topic: Topic,
  provider: aws.Provider
) => {
  const bucketNotification = new aws.s3.BucketNotification(
    name,
    {
      bucket: bucket.id,
      topics: [
        {
          topicArn: topic.arn,
          events: ["s3:ObjectCreated:*"],
          //filterSuffix: ".pdf",
        },
      ],
    },
    { provider: provider }
  );

  return bucketNotification;
};
