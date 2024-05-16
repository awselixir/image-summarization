import * as pulumi from "@pulumi/pulumi";
import * as archive from "@pulumi/archive";
import * as aws from "@pulumi/aws";
import { Role } from "@pulumi/aws/iam";

const config = new pulumi.Config();
const filterLabelsFunctionName = config.require("filterLabelsFunctionName");
const buildOutputFunctionName = config.require("buildOutputFunctionName");

export const filterLabelsFunctionHandler = (role: Role) => {
  const lambdaArchive = archive.getFile({
    type: "zip",
    sourceFile: "lambdas/src/filterLabels.mjs",
    outputPath: "lambdas/dist/filterLabels.zip",
  });

  const lambda = new aws.lambda.Function(filterLabelsFunctionName, {
    code: new pulumi.asset.FileArchive("lambdas/dist/filterLabels.zip"),
    name: filterLabelsFunctionName,
    role: role.arn.apply((arn) => arn),
    sourceCodeHash: lambdaArchive.then(
      (lambdaArchive) => lambdaArchive.outputBase64sha256
    ),
    runtime: aws.lambda.Runtime.NodeJS20dX,
    handler: "filterLabels.handler",
    environment: {
      variables: {
          CONFIDENCE_LEVEL: "90",
      },
  },
  });

  return lambda;
};

export const buildOutputFunctionHandler = (role: Role) => {
  const lambdaArchive = archive.getFile({
    type: "zip",
    sourceFile: "lambdas/src/buildOutput.mjs",
    outputPath: "lambdas/dist/buildOutput.zip",
  });

  const lambda = new aws.lambda.Function(buildOutputFunctionName, {
    code: new pulumi.asset.FileArchive("lambdas/dist/buildOutput.zip"),
    name: buildOutputFunctionName,
    role: role.arn.apply((arn) => arn),
    sourceCodeHash: lambdaArchive.then(
      (lambdaArchive) => lambdaArchive.outputBase64sha256
    ),
    runtime: aws.lambda.Runtime.NodeJS20dX,
    handler: "buildOutput.handler",
  });

  return lambda;
};
