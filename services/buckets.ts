import * as aws from "@pulumi/aws";
import { primaryProvider } from "./providers";

export const createBucket = (
  name: string,
  provider: aws.Provider = primaryProvider
) => {
  const inboundBucket = new aws.s3.Bucket(
    name,
    { forceDestroy: true },
    { provider: provider }
  );
  return inboundBucket;
};
