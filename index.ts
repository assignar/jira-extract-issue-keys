const core = require('@actions/core');
const github = require('@actions/github');
const matchAll = require("match-all");
const Octokit = require("@octokit/rest");

function matchingKeys(content: string | undefined): string[] {
    if (!content) return [];
    const regex = /((([A-Z]+)|([0-9]+))+-\d+)/gi;
    // Uppercase case-insensitive matches, such as `as2-1234`
    return matchAll(content.toUpperCase(), regex).toArray()
}

async function extractJiraKeysFromCommit() {
    try {
        const isPullRequest = core.getInput('is-pull-request') == 'true';
        const isRelease = core.getInput('is-release') == 'true';
        // console.log("isPullRequest: " + isPullRequest);
        const commitMessage = core.getInput('commit-message');
        // console.log("commitMessage: " + commitMessage);
        // console.log("core.getInput('parse-all-commits'): " + core.getInput('parse-all-commits'));
        const parseAllCommits = core.getInput('parse-all-commits') == 'true';
        // console.log("parseAllCommits: " + parseAllCommits);
        const payload = github.context.payload;

        const token = process.env['GITHUB_TOKEN'];

        const octokit = new Octokit({
            auth: token,
        });

        if (isRelease) {
            const release = await octokit.request('GET /repos/{owner}/{repo}/releases', {
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                per_page: 1,
            })

            const matches = matchingKeys(release.data[0].body);
            const result = matches.reduce<string[]>((memo, match) =>
                memo.find((element) => element == match) ? memo : [...memo, match]
            , []).join(',');

            core.setOutput("jira-keys", result);
            return result;
        }

        if (isPullRequest) {
            let resultArr: any = [];

            // console.log("is pull request...");

            const owner = payload.repository.owner.login;
            const repo = payload.repository.name;
            const prNum = payload.number;

            const { data } = await octokit.pulls.listCommits({
                owner: owner,
                repo: repo,
                pull_number: prNum
            });

            data.forEach((item: any) => {
                const commit = item.commit;
                const matches = matchingKeys(commit.message);
                matches.forEach((match: any) => {
                    if (resultArr.find((element: any) => element == match)) {
                        // console.log(match + " is already included in result array");
                    } else {
                        // console.log(" adding " + match + " to result array");
                        resultArr.push(match);
                    }
                });
            });

            const result = resultArr.join(',');
            core.setOutput("jira-keys", result);
        }
        else {
            // console.log("not a pull request");

            if (commitMessage) {
                // console.log("commit-message input val provided...");
                const result = matchingKeys(commitMessage).join(',');
                core.setOutput("jira-keys", result);
            }
            else {
                // console.log("no commit-message input val provided...");
                const payload = github.context.payload;

                if (parseAllCommits) {
                    // console.log("parse-all-commits input val is true");
                    let resultArr: any = [];

                    payload.commits.forEach((commit: any) => {
                        matchingKeys(commit.message).forEach((match: any) => {
                            if (resultArr.find((element: any) => element == match)) {
                                // console.log(match + " is already included in result array");
                            } else {
                                // console.log(" adding " + match + " to result array");
                                resultArr.push(match);
                            }
                        });

                    });

                    const result = resultArr.join(',');
                    core.setOutput("jira-keys", result);
                }
                else {
                    // console.log("parse-all-commits input val is false");
                    // console.log("head_commit: ", payload.head_commit);
                    const result = matchingKeys(payload.head_commit.message).join(',');

                    core.setOutput("jira-keys", result);
                }

            }
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

(async function () {
    await extractJiraKeysFromCommit();
    // console.log("finished extracting jira keys from commit message");
})();

export default extractJiraKeysFromCommit
