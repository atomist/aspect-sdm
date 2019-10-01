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
    LocalProject,
    logger,
} from "@atomist/automation-client";
import { execPromise } from "@atomist/sdm";
import {
    bandFor,
    Default,
} from "@atomist/sdm-pack-aspect/lib/util/bands";
import {
    Aspect, FP,
    sha256,
} from "@atomist/sdm-pack-fingerprint";

export const BranchCountType = "branch-count";

export interface BranchCountData {
    count: number;
}

export function isBranchCountFingerprint(fp: FP): fp is FP<BranchCountData> {
    return fp.type === BranchCountType;
}

export const branchCount: Aspect<BranchCountData> = {
    name: BranchCountType,
    displayName: "Branch count",
    baseOnly: true,
    extract: async p => {
        const lp = p as LocalProject;

        try {
            await execPromise(
                "git", ["fetch", "--unshallow"],
                {
                    cwd: lp.baseDir,
                });
        } catch (e) {
            logger.warn(e.message);
        }
        try {
            await execPromise(
                "git", ["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"],
                {
                    cwd: lp.baseDir,
                });
        } catch (e) {
            logger.warn(e.message);
        }
        try {
            await execPromise(
                "git", ["fetch", "origin"],
                {
                    cwd: lp.baseDir,
                });
        } catch (e) {
            logger.warn(e.message);
        }

        const commandResult = await execPromise(
            "git", ["branch", "--list", "-r", "origin/*"],
            {
                cwd: lp.baseDir,
            });

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
    },
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
