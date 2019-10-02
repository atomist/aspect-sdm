/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    GitHubRepoRef,
    isLocalProject,
    isRemoteRepoRef,
    LocalProject,
    logger,
    Project,
    RepoRef,
    ScmProviderType,
} from "@atomist/automation-client";
import { isTokenCredentials } from "@atomist/automation-client/lib/operations/common/ProjectOperationCredentials";
import { execPromise } from "@atomist/sdm";
import { isInLocalMode } from "@atomist/sdm-core";
import {
    bandFor,
    Default,
} from "@atomist/sdm-pack-aspect/lib/util/bands";
import {
    Aspect,
    ExtractFingerprint,
    FP,
    sha256,
} from "@atomist/sdm-pack-fingerprint";
import { api } from "../../util/gitHubApi";

export const BranchCountType = "branch-count";

export interface BranchCountData {
    count: number;
}

function isGitHubRemote(rr: RepoRef): rr is GitHubRepoRef {
    return isRemoteRepoRef(rr) &&
        (rr.providerType === ScmProviderType.github_com || rr.providerType === ScmProviderType.ghe);
}

export function isBranchCountFingerprint(fp: FP): fp is FP<BranchCountData> {
    return fp.type === BranchCountType;
}

/**
 * Determine the branch count for the project.  If the project is a
 * GitHubRepoRef and the credentials provided in the
 * PushImpactListenerInvocation are token credentials, it attempts to
 * use the GitHub API to ascertain the branch count.  If those things
 * are not true or if using the GitHub API fails, it tries to use the
 * Git CLI to count the branches, after unshallowing the clone if
 * necessary.  The check for whether a project is a shallow clone or
 * not is only performed when not running in local mode.  For large
 * repos, unshallowing a clone may take a long time and consume a lot
 * of memory.  If that fails, it returns `undefined`.
 */
export const extractBranchCount: ExtractFingerprint<BranchCountData> = async (p, pili) => {
    if (isGitHubRemote(p.id) && isTokenCredentials(pili.credentials)) {
        try {
            const github = api(pili.credentials.token);
            const branches = await github.paginate("GET /repos/:owner/:repo/branches", { owner: p.id.owner, repo: p.id.repo, per_page: 100 });
            const data = { count: branches.length };
            return {
                type: BranchCountType,
                name: BranchCountType,
                data,
                sha: sha256(JSON.stringify(data)),
            };
        } catch (e) {
            logger.warn(`Failed to retrieve branch count using @octokit/rest: ${e.message}`);
        }
    }
    if (isLocalProject(p)) {
        try {
            const opts = { cwd: p.baseDir };
            if (!isInLocalMode()) {
                const shallowOutput = await execPromise("git", ["rev-parse", "--is-shallow-repository"], opts);
                const shallow = shallowOutput.stdout.trim();
                if (shallow === "true") {
                    await execPromise("git", ["fetch", "--unshallow"], opts);
                    await execPromise("git", ["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"], opts);
                    await execPromise("git", ["fetch", "origin"], opts);
                }
            }
            const commandResult = await execPromise("git", ["branch", "--list", "-r", "origin/*"], opts);
            const count = commandResult.stdout
                .split("\n")
                .filter(l => !l.includes("origin/HEAD")).length - 1;
            const data = { count };
            logger.debug("Branch count for %s is %d", p.id.url, count);
            return {
                type: BranchCountType,
                name: BranchCountType,
                data,
                sha: sha256(JSON.stringify(data)),
            };
        } catch (e) {
            logger.warn(`Failed to get branch count from Git CLI: ${e.message}`);
        }
    }
    logger.debug(`Project ${p.name} is not a GitHub nor local project`);
    return undefined;
};

/**
 * Git repository branch count aspect.
 */
export const branchCount: Aspect<BranchCountData> = {
    name: BranchCountType,
    displayName: "Branch count",
    baseOnly: true,
    extract: extractBranchCount,
    toDisplayableFingerprintName: () => "Branch count",
    toDisplayableFingerprint: fp => {
        return bandFor<"Low" | "Medium" | "High" | "Excessive">({
            Low: { upTo: 5 },
            Medium: { upTo: 12 },
            High: { upTo: 30 },
            Excessive: Default,
        }, fp.data.count, { includeNumber: true });
    },
    stats: {
        defaultStatStatus: {
            entropy: false,
        },
        basicStatsPath: "count",
    },
};
