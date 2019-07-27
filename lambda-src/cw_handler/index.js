const Octokit = require('@octokit/rest')
const config = require('./config.json');

const mapBuildStatus = (status) => {
  switch(status) {
  case 'IN_PROGRESS':
    return 'pending';
  case 'FAILED':
    return 'failure';
  case 'SUCCEEDED':
    return 'success';
  case 'STOPPED':
    return 'error';
  default:
    return 'error';
  }
};

exports.handler = async (event) => {
    var codebuildEvent = event;
    console.log(JSON.stringify(codebuildEvent));
    const octokit = Octokit({
      auth: config.github.token
    });

    if (event.detail['project-name'] === process.env.CODEBUILD) {
        const environmentVariables  = event.detail['additional-information'].environment['environment-variables'].reduce((acc, environmentVariable) =>
        {
            acc[environmentVariable.name] = environmentVariable.value;
            return acc;
        }, {});

        const state = mapBuildStatus(event.detail['build-status']);
        const targetUrl = (state === 'failure' || state === 'success') ? event.detail['additional-information'].logs['deep-link'] : undefined;
        const githubOwner = environmentVariables.GITHUB_OWNER;
        const githubRepo = environmentVariables.GITHUB_REPO;
        const githubAction = environmentVariables.GITHUB_ACTION;

        var s3_prefix;
        if (event.region !== 'us-east-1') s3_prefix = 's3-' + event.region;
        else s3_prefix = 's3';

        var badge_icon;
        if (state === 'success') badge_icon = "passing.svg";
        else badge_icon = "failing.svg";

        const commentBadge = "![Build Status](https://" + s3_prefix + ".amazonaws.com/codefactory-" + event.region + "-prod-default-build-badges/" + badge_icon + ")";
        const commentLog = "Detail log can be found [here](" + targetUrl + ")"
        const commentBody = commentBadge + "\nStatus: " + state + "\n" + commentLog

        if (githubAction === 'pull_request') {
            const githubIssue = environmentVariables.GITHUB_ISSUE;
            await octokit.issues.createComment({
                owner: githubOwner,
                repo: githubRepo,
                issue_number: githubIssue,
                body: commentBody
            });
        }
        else if (githubAction === 'commit') {
            const githubHeadCommit = environmentVariables.GITHUB_HEADCOMMIT;
            await octokit.repos.createCommitComment({
                owner: githubOwner,
                repo: githubRepo,
                commit_sha: githubHeadCommit,                
                body: commentBody
            });
        }
    }
    else
    {
      console.log("Invalid CodeBuild Project Name")
    }
    return true;
};
