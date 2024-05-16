import * as pulumi from "@pulumi/pulumi";
import * as buckets from "./services/buckets";
import * as notifications from "./services/notifications";
import * as roles from "./services/roles";
import * as stateMachines from "./services/stateMachines";
import * as functions from "./services/functions"

let config = new pulumi.Config();

const stateMachineRoleName = config.require("stateMachineRoleName");

// Creates the input bucket
const inputBucket = buckets.inputBucketHandler();

// Enables EventBridge on the input bucket
const inboundNotification =
  notifications.bucketNotificationHandler(inputBucket);

// Creates the output bucket
const outputBucket = buckets.outputBucketHandler();

const lambdaRole = roles.lambdaRoleHandler()

const filterLabelsFunction = functions.filterLabelsFunctionHandler(lambdaRole)
const buildOutputFunction = functions.buildOutputFunctionHandler(lambdaRole)

const stateMachineRole = roles.stateMachineRoleHandler(inputBucket, outputBucket, filterLabelsFunction, buildOutputFunction);

const stateMachine = stateMachines.stateMachineHandler(stateMachineRole, filterLabelsFunction, buildOutputFunction, outputBucket);

// EventBridge rule for created objects on the input bucket
const inboundRule = notifications.ruleHandler(inputBucket);


// Role and policy for the EventBridge rule
const inboundRuleRolePolicy = roles.inboundRuleRolePolicyHandler(stateMachine)
const inboundRuleRole = roles.inboundRuleRoleHandler(inboundRuleRolePolicy)

// Sets the notification target to the state machine
const ruleTarget = notifications.targetHandler(inboundRule, inboundRuleRole, stateMachine);


