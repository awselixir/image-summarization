import * as aws from "@pulumi/aws";
import { Bucket } from "@pulumi/aws/s3";
import { primaryProvider } from "./providers";

export const createBucketTopic = (
  name: string,
  bucket: Bucket,
  provider: aws.Provider = primaryProvider
) => {
  const topicPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        effect: "Allow",
        principals: [
          {
            type: "Service",
            identifiers: ["s3.amazonaws.com"],
          },
        ],
        actions: ["SNS:Publish"],
        resources: [`arn:aws:sns:*:*:${name}`],
        conditions: [
          {
            test: "ArnLike",
            variable: "aws:SourceArn",
            values: [bucket.arn],
          },
        ],
      },
    ],
  });

  const topic = new aws.sns.Topic(
    name,
    {
      name: name,
      policy: topicPolicy.apply((topicPolicy) => topicPolicy.json),
    },
    { provider: provider }
  );

  return topic;
};
