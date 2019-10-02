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
    ClassificationAspect,
    daysSince,
    GitRecencyData,
    GitRecencyType,
    Monorepo,
    projectClassificationAspect,
} from "@atomist/sdm-pack-aspect";
import { FP } from "@atomist/sdm-pack-fingerprint";
import { isBranchCountFingerprint } from "./branchCount";

export function gitClassificationAspect(opts: {
    deadDays: number,
    maxBranches: number,
}): ClassificationAspect {
    return projectClassificationAspect({
            name: "git",
            displayName: undefined,
        },
        {
            tags: "dead",
            reason: `No commits for ${opts.deadDays} days`,
            testFingerprints: async fps => {
                // TODO this will come from type guard
                const grfp = fps.find(fp => fp.type === GitRecencyType) as FP<GitRecencyData>;
                if (!grfp) {
                    return false;
                }
                return daysSince(new Date(grfp.data.lastCommitTime)) > opts.deadDays;
            },
        },
        {
            tags: `>${opts.maxBranches}-branches`,
            reason: `More than ${opts.maxBranches} branches`,
            testFingerprints: async fps =>
                fps.some(fp => isBranchCountFingerprint(fp) && fp.data.count > opts.maxBranches),
        },
        Monorepo);
}
