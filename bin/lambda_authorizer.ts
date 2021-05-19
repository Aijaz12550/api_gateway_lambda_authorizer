#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { LambdaAuthorizerStack } from '../lib/lambda_authorizer-stack';

const app = new cdk.App();
new LambdaAuthorizerStack(app, 'LambdaAuthorizerStack');
