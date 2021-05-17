"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = __importDefault(require("@actions/core"));
const github = require('@actions/github');
const matchAll = require("match-all");
const rest_1 = __importDefault(require("@octokit/rest"));
async function extractJiraKeysFromCommit() {
    try {
        const regex = /((([A-Z]+)|([0-9]+))+-\d+)/g;
        const isPullRequest = core_1.default.getInput('is-pull-request') == 'true';
        const isRelease = core_1.default.getInput('is-release') == 'true';
        // console.log("isPullRequest: " + isPullRequest);
        const commitMessage = core_1.default.getInput('commit-message');
        // console.log("commitMessage: " + commitMessage);
        // console.log("core.getInput('parse-all-commits'): " + core.getInput('parse-all-commits'));
        const parseAllCommits = core_1.default.getInput('parse-all-commits') == 'true';
        // console.log("parseAllCommits: " + parseAllCommits);
        const payload = github.context.payload;
        const token = process.env['GITHUB_TOKEN'];
        const octokit = new rest_1.default({
            auth: token,
        });
        if (isRelease) {
            const release = await octokit.request('GET /repos/{owner}/{repo}/releases', {
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                per_page: 1,
            });
            const content = release.data[0].body;
            const matches = matchAll(content, regex).toArray();
            const result = matches.reduce((memo, match) => memo.find((element) => element == match) ? memo : [...memo, match], []).join(',');
            core_1.default.setOutput("jira-keys", result);
            return result;
        }
        if (isPullRequest) {
            let resultArr = [];
            // console.log("is pull request...");
            const owner = payload.repository.owner.login;
            const repo = payload.repository.name;
            const prNum = payload.number;
            const { data } = await octokit.pulls.listCommits({
                owner: owner,
                repo: repo,
                pull_number: prNum
            });
            data.forEach((item) => {
                const commit = item.commit;
                const matches = matchAll(commit.message, regex).toArray();
                matches.forEach((match) => {
                    if (resultArr.find((element) => element == match)) {
                        // console.log(match + " is already included in result array");
                    }
                    else {
                        // console.log(" adding " + match + " to result array");
                        resultArr.push(match);
                    }
                });
            });
            const result = resultArr.join(',');
            core_1.default.setOutput("jira-keys", result);
        }
        else {
            // console.log("not a pull request");
            if (commitMessage) {
                // console.log("commit-message input val provided...");
                const matches = matchAll(commitMessage, regex).toArray();
                const result = matches.join(',');
                core_1.default.setOutput("jira-keys", result);
            }
            else {
                // console.log("no commit-message input val provided...");
                const payload = github.context.payload;
                if (parseAllCommits) {
                    // console.log("parse-all-commits input val is true");
                    let resultArr = [];
                    payload.commits.forEach((commit) => {
                        const matches = matchAll(commit.message, regex).toArray();
                        matches.forEach((match) => {
                            if (resultArr.find((element) => element == match)) {
                                // console.log(match + " is already included in result array");
                            }
                            else {
                                // console.log(" adding " + match + " to result array");
                                resultArr.push(match);
                            }
                        });
                    });
                    const result = resultArr.join(',');
                    core_1.default.setOutput("jira-keys", result);
                }
                else {
                    // console.log("parse-all-commits input val is false");
                    // console.log("head_commit: ", payload.head_commit);
                    const matches = matchAll(payload.head_commit.message, regex).toArray();
                    const result = matches.join(',');
                    core_1.default.setOutput("jira-keys", result);
                }
            }
        }
    }
    catch (error) {
        core_1.default.setFailed(error.message);
    }
}
(async function () {
    await extractJiraKeysFromCommit();
    // console.log("finished extracting jira keys from commit message");
})();
exports.default = extractJiraKeysFromCommit;
