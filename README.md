## Pre-requisite:
 - Node JS
 - AWS CLI
 - Github user with personal access token, if you running test on public github, use this link to generate new token: https://github.com/settings/tokens
- Make sure your personal access token have at minimum scope of repo:status
 - Github repository as source, you can clone fork this repository for quick start: https://github.com/fss18/example-cicd-ml
 - S3 bucket to store the Lambda source code

## Steps to deploy:
1. Extract the zip file
2. Navigate to /lambda-src/cw_handler/
3. Edit the config.json file, replace the token value with the Github personal token value
4. Replace the secret value with 16 char random string
5. Run ```npm install --production```
6. Navigate to /lambda-src/webhook_handler/
7. Edit the config.json file, replace the token value with the Github personal token value
8. Replace the secret value with 16 char random string
9. Run ```npm install --production```
10. Navigate back to top directory
11. Run the following command, replace BUCKET_NAME with the name of your S3 bucket
```aws cloudformation package --template-file template.yml --s3-bucket BUCKET_NAME --output-template-file packaged.yml```
12. Run the following command, replace STACK_NAME with your preference and SOURCE_GITHUB_URL with your source github repo
```aws cloudformation deploy --template-file packaged.yml --stack-name STACK_NAME --capabilities CAPABILITY_IAM --parameter-overrides GitHubRepoURL=SOURCE_GITHUB_URL```
13. Once the stack deployed successfully, look at the CloudFormation output to copy the API gateway URL.
14. Go to your GitHub repository > Settings > Webhooks , and Add a new webhook
15. Paste the API Gateway URL into the Payload URL
16. Set content type to application/json
17. Paste the secret value (from step 4 or 8) to Secret
18. Choose “Let me select individual events” and pick “Pull requests” and if required “Pushes” as well.

## To Run Test
To run test: simply push new commit or pull request and watch the comment added as the build start and finishes.
