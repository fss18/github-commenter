const Octokit = require('@octokit/rest')
const AWS = require('aws-sdk');
const config = require('./config.json');
const crypto = require('crypto');

exports.handler = async (event) => {
    console.log (JSON.stringify(event.headers));
    const githubEvent = JSON.parse(event.body);
    console.log (JSON.stringify(githubEvent));

    const codebuild = new AWS.CodeBuild({apiVersion: '2016-10-06'});
    const githubOwner = githubEvent.repository.owner.login;
    const githubRepo = githubEvent.repository.name;
    const githubBranch = String(githubEvent.ref).split("/")[2];

    const signature = 'sha1=' + crypto.createHmac('sha1', config.github.secret).update(event.body).digest('hex');

    if ('X-Hub-Signature' in event.headers && event.headers['X-Hub-Signature'] === signature) {
        if (githubEvent.hasOwnProperty('pull_request') && (githubEvent.action === 'opened')) {
            // call CodeBuild and add metadata in environment variables
            const githubIssue = String(githubEvent.pull_request.number);
            const codebuild_params = {
                projectName: process.env.CODEBUILD,
                sourceVersion: githubBranch,
                environmentVariablesOverride: [
                {
                    name: 'GITHUB_OWNER',
                    value: githubOwner,
                    type: 'PLAINTEXT'
                },
                {
                    name: 'GITHUB_REPO',
                    value: githubRepo,
                    type: 'PLAINTEXT'
                },
                {
                    name: 'GITHUB_ISSUE',
                    value: githubIssue,
                    type: 'PLAINTEXT'
                },
                {
                    name: 'GITHUB_ACTION',
                    value: 'pull_request',
                    type: 'PLAINTEXT'
                }
                ]
            };

            var commentBody;
            try {
                var codebuildEvent = await codebuild.startBuild(codebuild_params).promise();
                console.log(JSON.stringify(codebuildEvent));
                const codebuildStatus = codebuildEvent.build.buildStatus;
                const codebuildId = codebuildEvent.build.id;
                commentBody = "New pull request \nCodeBuild : " + codebuildId + "\nStatus : " + codebuildStatus;
            }
            catch (err) {
                console.log("CodeBuild failed", JSON.stringify(err));
                commentBody = "CodeBuild failed : " + err.message;
            }

            const octokit = Octokit({
                auth: config.github.token
            });

            await octokit.issues.createComment({
                owner: githubEvent.repository.owner.login,
                repo: githubEvent.repository.name,
                issue_number: githubEvent.pull_request.number,
                body: commentBody
            });

            console.log(commentBody);
            return {statusCode: 204};
        }
        else if (githubEvent.hasOwnProperty('commits')) {
            // call CodeBuild and add metadata in environment variables
            const githubHeadCommit = githubEvent.head_commit.id;
            const codebuild_params = {
                projectName: process.env.CODEBUILD,
                sourceVersion: githubBranch,
                environmentVariablesOverride: [
                {
                    name: 'GITHUB_OWNER',
                    value: githubOwner,
                    type: 'PLAINTEXT'
                },
                {
                    name: 'GITHUB_REPO',
                    value: githubRepo,
                    type: 'PLAINTEXT'
                },
                {
                    name: 'GITHUB_HEADCOMMIT',
                    value: githubHeadCommit,
                    type: 'PLAINTEXT'
                },
                {
                    name: 'GITHUB_ACTION',
                    value: 'commit',
                    type: 'PLAINTEXT'
                }
                ]
            };

            var commentBody;
            try {
                var codebuildEvent = await codebuild.startBuild(codebuild_params).promise();
                console.log(JSON.stringify(codebuildEvent));
                const codebuildStatus = codebuildEvent.build.buildStatus;
                const codebuildId = codebuildEvent.build.id;
                commentBody = "New commit detected \nCodeBuild : " + codebuildId + "\nStatus : " + codebuildStatus;
            }
            catch (err) {
                console.log("CodeBuild failed", JSON.stringify(err));
                commentBody = "CodeBuild failed : " + err.message;
            }

            const octokit = Octokit({
                auth: config.github.token
            });

            await octokit.repos.createCommitComment({
                owner: githubEvent.repository.owner.login,
                repo: githubEvent.repository.name,
                commit_sha: githubEvent.head_commit.id,
                body: commentBody
            });

            console.log(commentBody);
            return {statusCode: 204};
        }
        else {
            console.log("Not applicable activity");
            return {statusCode: 204};
        }
    }
    else
    {
        console.log("Mismatch hash signature, paylod might have been modified");
        return {statusCode: 403};
    }
};
