import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const profile = new pulumi.Config().require('profile');
const primaryRegion: aws.Region = new pulumi.Config().require('primaryRegion');
const secondaryRegion: aws.Region = new pulumi.Config().require('secondaryRegion');

export const primaryProvider = new aws.Provider("primaryProvider", {
  region: primaryRegion,
  profile: profile,
});

export const secondaryProvider = new aws.Provider("secondaryProvider", {
  region: "us-east-2",
  profile: profile,
});
